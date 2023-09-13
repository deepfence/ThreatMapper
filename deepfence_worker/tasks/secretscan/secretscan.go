package secretscan

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"os"
	"os/exec"
	"sync"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/SecretScanner/core"
	"github.com/deepfence/SecretScanner/output"
	"github.com/deepfence/SecretScanner/scan"
	secretScan "github.com/deepfence/SecretScanner/scan"
	"github.com/deepfence/SecretScanner/signature"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	pb "github.com/deepfence/agent-plugins-grpc/srcgo"
	"github.com/twmb/franz-go/pkg/kgo"
)

var ScanMap sync.Map

func init() {
	initSecretScanner()
}

type SecretScan struct {
	ingestC chan *kgo.Record
}

func NewSecretScanner(ingest chan *kgo.Record) SecretScan {
	return SecretScan{ingestC: ingest}
}

func (s SecretScan) StopSecretScan(msg *message.Message) error {
	var params utils.SecretScanParameters

	log.Info().Msgf("StopSecretScan, uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msgf("StopSecretScan, error in Unmarshal: %s", err.Error())
		return nil
	}

	scanID := params.ScanId

	obj, found := ScanMap.Load(scanID)
	if !found {
		log.Error().Msgf("SecretScanner::Failed to Stop scan, may have already completed or errored out, ScanID: %s", scanID)
		return nil
	}

	scanCtx := obj.(*scan.ScanContext)
	scanCtx.Stopped.Store(true)
	log.Error().Msgf("SecretScanner::Stop request submitted, ScanID: %s", scanID)

	return nil
}

func (s SecretScan) StartSecretScan(msg *message.Message) error {
	defer cronjobs.ScanWorkloadAllocator.Free()

	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return nil
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))
	log.Info().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	var params utils.SecretScanParameters

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	if params.RegistryId == "" {
		log.Error().Msgf("registry id is empty in params %+v", params)
		return nil
	}

	//Set this "hardErr" variable to appropriate error if
	//an error has caused used to abort/return from this function
	var hardErr error
	scanCtx := scan.NewScanContext(params.ScanId)
	res := StartStatusReporter(context.Background(), scanCtx, params, s.ingestC, rh)

	ScanMap.Store(params.ScanId, scanCtx)

	defer func() {
		log.Info().Msgf("Removing from scan map, scan_id: %s", params.ScanId)
		ScanMap.Delete(params.ScanId)
		res <- hardErr
		close(res)
	}()

	// send inprogress status
	scanCtx.ScanStatusChan <- true

	// get registry credentials
	authDir, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		log.Error().Msg(err.Error())
		hardErr = err
		return nil
	}

	defer func() {
		log.Info().Msgf("remove auth directory %s", authDir)
		if authDir == "" {
			return
		}
		if err := os.RemoveAll(authDir); err != nil {
			log.Error().Msg(err.Error())
		}
	}()

	// pull image
	var imageName string
	if params.ImageName != "" {
		if creds.ImagePrefix != "" {
			imageName = creds.ImagePrefix + "/" + params.ImageName
		} else {
			imageName = params.ImageName
		}
	} else {
		imageName = params.ImageId
	}

	dir, err := ioutil.TempDir("/tmp", "secretscan-*")
	if err != nil {
		// return nil
		log.Error().Msgf(err.Error())
	}
	defer os.RemoveAll(dir)

	authFile := authDir + "/config.json"
	imgTar := dir + "/save-output.tar"

	var cmd *exec.Cmd
	if authDir != "" {
		cmd = exec.Command("skopeo", []string{"copy", "--insecure-policy", "--src-tls-verify=false",
			"--authfile", authFile, "docker://" + imageName, "docker-archive:" + imgTar}...)
	} else {
		cmd = exec.Command("skopeo", []string{"copy", "--insecure-policy", "--src-tls-verify=false",
			"docker://" + imageName, "docker-archive:" + imgTar}...)
	}

	log.Info().Msgf("command: %s", cmd.String())

	if out, err := workerUtils.RunCommand(cmd); err != nil {
		log.Error().Err(err).Msg(cmd.String())
		log.Error().Msgf("output: %s", out.String())
		hardErr = err
		return nil
	}

	// init secret scan
	scanCtx.ScanStatusChan <- true

	scanResult, err := secretScan.ExtractAndScanFromTar(dir, imageName, scanCtx)
	if err != nil {
		log.Error().Msg(err.Error())
		hardErr = err
		return nil
	}

	type secretScanResult struct {
		utils.SecretScanParameters
		pb.SecretInfo
	}

	for _, c := range output.SecretsToSecretInfos(scanResult.Secrets) {
		var r secretScanResult
		r.SecretScanParameters = params
		r.SecretInfo = *c
		cb, err := json.Marshal(r)
		if err != nil {
			log.Error().Msg(err.Error())
		} else {
			s.ingestC <- &kgo.Record{
				Topic:   utils.SECRET_SCAN,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}

func initSecretScanner() {
	var sessionSecretScanner = core.GetSession()
	// init secret scan builds hs db
	signature.ProcessSignatures(sessionSecretScanner.Config.Signatures)
	signature.BuildHsDb()
}

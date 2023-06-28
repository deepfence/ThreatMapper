package secretscan

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"os/exec"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/SecretScanner/core"
	"github.com/deepfence/SecretScanner/output"
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

func init() {
	initSecretScanner()
}

type SecretScan struct {
	ingestC chan *kgo.Record
}

func NewSecretScanner(ingest chan *kgo.Record) SecretScan {
	return SecretScan{ingestC: ingest}
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

	// send inprogress status
	SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_INPROGRESS, ""), rh)

	// get registry credentials
	authDir, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		return nil
	}
	defer func() {
		log.Info().Msgf("remove auth directory %s", authDir)
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
	cmd := exec.Command("skopeo", []string{"copy", "--insecure-policy", "--src-tls-verify=false",
		"--authfile", authFile, "docker://" + imageName, "docker-archive:" + imgTar}...)
	log.Info().Msgf("command: %s", cmd.String())
	if out, err := workerUtils.RunCommand(cmd); err != nil {
		log.Error().Err(err).Msg(cmd.String())
		log.Error().Msgf("output: %s", out.String())
		SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		return nil
	}

	// init secret scan
	SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_INPROGRESS, ""), rh)

	scanResult, err := secretScan.ExtractAndScanFromTar(dir, imageName)
	// secretScan.ExtractAndScanFromTar(tarPath,)
	if err != nil {
		SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		log.Error().Msg(err.Error())
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
	// scan status
	if err := SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_SUCCESS, ""), rh); err != nil {
		log.Error().Msgf("error sending scan status: %s", err.Error())
	}

	return nil
}

func initSecretScanner() {
	var sessionSecretScanner = core.GetSession()
	// init secret scan builds hs db
	signature.ProcessSignatures(sessionSecretScanner.Config.Signatures)
	signature.BuildHsDb()
}

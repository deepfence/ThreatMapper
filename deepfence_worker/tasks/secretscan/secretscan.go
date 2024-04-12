package secretscan

import (
	"context"
	"encoding/json"
	"io/ioutil" //nolint:staticcheck
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/deepfence/SecretScanner/core"
	"github.com/deepfence/SecretScanner/output"
	secretScan "github.com/deepfence/SecretScanner/scan"
	"github.com/deepfence/SecretScanner/signature"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	pb "github.com/deepfence/agent-plugins-grpc/srcgo"
	tasks "github.com/deepfence/golang_deepfence_sdk/utils/tasks"
	"github.com/hibiken/asynq"
	"github.com/twmb/franz-go/pkg/kgo"
)

var ScanMap sync.Map

var secretsRulesFile = "config.yaml"
var secretsRulesDir = "/"
var secretsRulesHash = ""
var secretsRuleLock = new(sync.Mutex)

type SecretScan struct {
	ingestC chan *kgo.Record
}

func NewSecretScanner(ingest chan *kgo.Record) SecretScan {
	return SecretScan{ingestC: ingest}
}

func checkSecretsRulesUpdate(ctx context.Context) error {
	// fetch rules url
	path, hash, err := threatintel.FetchSecretsRulesInfo(ctx)
	if err != nil {
		return err
	}

	secretsRuleLock.Lock()
	defer secretsRuleLock.Unlock()

	if secretsRulesHash != hash {
		secretsRulesHash = hash

		// remove old rules
		os.RemoveAll(filepath.Join(secretsRulesDir, secretsRulesFile))

		log.Info().Msgf("update rules from path: %s", path)
		if err := workerUtils.UpdateRules(ctx, path, secretsRulesDir); err != nil {
			return err
		}
		initSecretScanner()
	}

	return nil
}

func (s SecretScan) StopSecretScan(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var params utils.SecretScanParameters

	log.Info().Msgf("StopSecretScan, payload: %s ", string(task.Payload()))

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Msgf("StopSecretScan, error in Unmarshal: %s", err.Error())
		return nil
	}

	scanID := params.ScanID

	obj, found := ScanMap.Load(scanID)
	if !found {
		log.Error().Msgf("SecretScanner::Failed to Stop scan, may have already completed or errored out, ScanID: %s", scanID)
		return nil
	}

	scanCtx := obj.(*tasks.ScanContext)
	scanCtx.StopTriggered.Store(true)
	scanCtx.Cancel()
	log.Error().Msgf("SecretScanner::Stop request submitted, ScanID: %s", scanID)

	return nil
}

func (s SecretScan) StartSecretScan(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	if err := checkSecretsRulesUpdate(ctx); err != nil {
		log.Error().Err(err).Msg("failed to update secrets rules")
		return err
	}

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return nil
	}

	log.Info().Msgf("payload: %s ", string(task.Payload()))

	var params utils.SecretScanParameters

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	if params.RegistryID == "" {
		log.Error().Msgf("registry id is empty in params %+v", params)
		return nil
	}

	//Set this "hardErr" variable to appropriate error if
	//an error has caused used to abort/return from this function
	var hardErr error
	res, scanCtx := tasks.StartStatusReporter(params.ScanID,
		func(status tasks.ScanStatus) error {
			sb, err := json.Marshal(status)
			if err != nil {
				return err
			}
			s.ingestC <- &kgo.Record{
				Topic:   utils.SecretScanStatus,
				Value:   sb,
				Headers: []kgo.RecordHeader{{Key: "namespace", Value: []byte(tenantID)}},
			}
			return nil
		}, tasks.StatusValues{
			IN_PROGRESS: utils.ScanStatusInProgress,
			CANCELLED:   utils.ScanStatusCancelled,
			FAILED:      utils.ScanStatusFailed,
			SUCCESS:     utils.ScanStatusSuccess,
		},
		time.Minute*20,
	)

	ScanMap.Store(params.ScanID, scanCtx)

	defer func() {
		log.Info().Msgf("Removing from scan map, scan_id: %s", params.ScanID)
		ScanMap.Delete(params.ScanID)
		res <- hardErr
		close(res)
	}()

	// send inprogress status
	err = scanCtx.Checkpoint("After initialization")
	if err != nil {
		log.Error().Msg(err.Error())
	}

	// get registry credentials
	authDir, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryID)
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
		imageName = params.ImageID
	}

	dir, err := ioutil.TempDir("/tmp", "secretscan-*")
	if err != nil {
		return err
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

	err = scanCtx.Checkpoint("After skopeo download")
	if err != nil {
		log.Error().Msg(err.Error())
	}

	// init secret scan
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
		r.SecretInfo = *c          //nolint:govet
		cb, err := json.Marshal(r) //nolint:govet
		if err != nil {
			log.Error().Msg(err.Error())
		} else {
			s.ingestC <- &kgo.Record{
				Topic:   utils.SecretScan,
				Value:   cb,
				Headers: []kgo.RecordHeader{{Key: "namespace", Value: []byte(tenantID)}},
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

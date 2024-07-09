package secretscan

import (
	"archive/tar"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil" //nolint:staticcheck
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	out "github.com/deepfence/SecretScanner/output"
	"github.com/deepfence/YaraHunter/pkg/output"
	"github.com/deepfence/golang_deepfence_sdk/utils/tasks"
	"github.com/hibiken/asynq"

	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	secretScanConstants "github.com/deepfence/YaraHunter/constants"
	secretConfig "github.com/deepfence/YaraHunter/pkg/config"
	secretScan "github.com/deepfence/YaraHunter/pkg/scan"
	yararules "github.com/deepfence/YaraHunter/pkg/yararules"
	config "github.com/deepfence/match-scanner/pkg/config"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	pb "github.com/deepfence/agent-plugins-grpc/srcgo"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	failOnCompileWarning = false
	secretRulesDir       = "/usr/local/secret"
	secretRulesPath      = "/usr/local/secret/secret-yara-rules"
	secretConfigPath     = "/secret-config/config.yaml"
	opts                 *secretConfig.Options
	yaraconfig           config.Config
	yr                   *yararules.YaraRules
)

var ScanMap sync.Map

var secretRulesHash = ""
var secretRuleLock = new(sync.Mutex)

func init() {
	ScanMap = sync.Map{}
}

type SecretScan struct {
	ingestC chan *kgo.Record
}

func NewSecretScanner(ingest chan *kgo.Record) SecretScan {
	return SecretScan{ingestC: ingest}
}

func checkSecretRulesUpdate(ctx context.Context) error {
	// fetch rules url
	path, hash, err := threatintel.FetchSecretsRulesInfo(ctx)
	if err != nil {
		return err
	}

	secretRuleLock.Lock()
	defer secretRuleLock.Unlock()

	if secretRulesHash != hash {
		secretRulesHash = hash

		// remove old rules
		os.RemoveAll(secretRulesPath)
		os.MkdirAll(secretRulesDir, 0755)

		log.Info().Msgf("update rules from path: %s", path)
		if err := workerUtils.UpdateRules(ctx, path, secretRulesDir); err != nil {
			return err
		}
		opts, yaraconfig, yr, err = initSecretScanner()
		if err != nil {
			return err
		}
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
		log.Error().Msgf("Failed to Stop scan, may be already completed or errored out, ScanID: %s", scanID)
		return nil
	}

	scanner := obj.(*tasks.ScanContext)
	scanner.StopTriggered.Store(true)
	scanner.Cancel()
	log.Error().Msgf("Stop request submitted, ScanID: %s", scanID)

	return nil

}

func (s SecretScan) StartSecretScan(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	if err := checkSecretRulesUpdate(ctx); err != nil {
		log.Error().Err(err).Msg("failed to update secret rules")
		return err
	}

	var err error
	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	log.Info().Msgf("payload: %s ", string(task.Payload()))

	var params utils.SecretScanParameters

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		return err
	}

	res, scanCtx := tasks.StartStatusReporter(params.ScanID,
		func(status tasks.ScanStatus) error {
			sb, err := json.Marshal(status)
			if err != nil {
				log.Error().Msgf("%v", err)
				return err
			}

			s.ingestC <- &kgo.Record{
				Topic:   utils.TopicWithNamespace(utils.SecretScanStatus, string(tenantID)),
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
		time.Minute*10,
	)

	ScanMap.Store(params.ScanID, scanCtx)

	defer func() {
		log.Info().Msgf("Removing from scan map, scan_id: %s", params.ScanID)
		ScanMap.Delete(params.ScanID)
		res <- err
		close(res)
	}()

	if params.RegistryID == "" {
		return fmt.Errorf("registry id is empty in params %+v: %w", params, err)
	}

	// opts, yaraconfig, yr = initSecretScanner()
	yrScanner, err := yr.NewScanner()
	if err != nil {
		return err
	}

	// scanResult, err := secretScan.ExtractAndScanFromTar(dir, imagename)
	secretScanner := secretScan.New(*opts.HostMountPath, yaraconfig, yrScanner, params.ScanID)

	// send inprogress status
	err = scanCtx.Checkpoint("After initialization")
	if err != nil {
		return err
	}

	// get registry credentials
	authDir, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryID)
	if err != nil {
		return err
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

	err = scanCtx.Checkpoint("Before skopeo download")
	if err != nil {
		return err
	}

	log.Info().Msgf("command: %s", cmd.String())
	if out, err := workerUtils.RunCommand(cmd); err != nil {
		log.Error().Err(err).Msg(cmd.String())
		log.Error().Msgf("output: %s", out.String())
		return err
	}

	err = scanCtx.Checkpoint("After skopeo download")
	if err != nil {
		return err
	}

	f, err := os.Open(imgTar)
	if err != nil {
		return err
	}
	extractTarFromReader(f, filepath.Join(dir, "root"))
	f.Close()

	err = scanCtx.Checkpoint("After tar extraction")
	if err != nil {
		return err
	}

	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	var scanResult []output.IOCFound

	err = secretScanner.Scan(scanCtx, secretScan.DirScan,
		"", filepath.Join(dir, "root"),
		params.ScanID, func(i output.IOCFound, s string) {
			scanResult = append(scanResult, i)
		})
	if err != nil {
		log.Error().Msgf("Trying to scan %v err: %v", imageName, err)
		return err
	}

	type secretScanResult struct {
		utils.SecretScanParameters
		pb.SecretInfo
	}

	for _, cc := range scanResult {
		for i := range cc.StringsToMatch {
			c := out.SecretToSecretInfo(cc, i)
			var r secretScanResult
			r.SecretScanParameters = params
			r.SecretInfo = *c          //nolint:govet
			cb, err := json.Marshal(r) //nolint:govet
			if err != nil {
				log.Error().Msg(err.Error())
			} else {
				s.ingestC <- &kgo.Record{
					Topic:   utils.TopicWithNamespace(utils.SecretScan, string(tenantID)),
					Value:   cb,
					Headers: []kgo.RecordHeader{{Key: "namespace", Value: []byte(tenantID)}},
				}
			}
		}
	}

	return nil
}

func initSecretScanner() (*secretConfig.Options, config.Config, *yararules.YaraRules, error) {
	opts := secretConfig.NewDefaultOptions()
	opts.RulesPath = &secretRulesPath
	opts.ConfigPath = &secretConfigPath
	opts.FailOnCompileWarning = &failOnCompileWarning

	yaraconfig, err := config.ParseConfig(*opts.ConfigPath)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, yaraconfig, nil, err
	}

	yr := yararules.New(*opts.RulesPath)
	err = yr.Compile(secretScanConstants.Filescan, *opts.FailOnCompileWarning)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, yaraconfig, nil, err
	}

	return opts, yaraconfig, yr, nil
}

func extractTarFromReader(reader io.Reader, destDir string) error {
	tr := tar.NewReader(reader)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break // End of tar archive
		}
		if err != nil {
			return fmt.Errorf("failed to read tar header: %w", err)
		}

		target := filepath.Join(destDir, header.Name)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
			fileToWrite, err := os.Create(target)
			if err != nil {
				return fmt.Errorf("failed to create file: %w", err)
			}
			if _, err := io.Copy(fileToWrite, tr); err != nil {
				fileToWrite.Close()
				return fmt.Errorf("failed to write file: %w", err)
			}
			fileToWrite.Close()
		default:
			return fmt.Errorf("unknown tar header type: %d", header.Typeflag)
		}
	}

	return nil
}

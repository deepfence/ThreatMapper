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
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	pb "github.com/deepfence/agent-plugins-grpc/proto"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
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
	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return nil
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	rh := []kgo.RecordHeader{
		{Key: "tenant_id", Value: []byte(tenantID)},
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

	// get registry credentials
	authDir, namespace, _, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		return nil
	}
	defer func() {
		log.Info().Msgf("remove auth directory %s", authDir)
		if err := os.RemoveAll(authDir); err != nil {
			log.Error().Msg(err.Error())
		}
	}()

	SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_INPROGRESS), rh)

	// pull image
	var imagename string
	if params.ImageName != "" {
		if namespace != "" {
			imagename = namespace + "/" + params.ImageName
		} else {
			imagename = params.ImageName
		}
	} else {
		imagename = params.ImageId
	}

	dir, err := ioutil.TempDir("/tmp", "secretscan-*")
	if err != nil {
		// return nil
		log.Error().Msgf(err.Error())
	}
	defer os.RemoveAll(dir)

	authFile := authDir + "/config.json"
	imgTar := dir + "/save-output.tar"
	// todo: move to skopeo
	cmd := exec.Command("skopeo", []string{"copy", "--authfile", authFile, "docker://" + imagename, "docker-archive:" + imgTar}...)
	log.Info().Msgf("command: %s", cmd.String())
	// cmd.Env = append(cmd.Env, fmt.Sprintf("DOCKER_CONFIG=%s", authFile))
	if out, err := workerUtils.RunCommand(cmd); err != nil {
		log.Error().Err(err).Msg(cmd.String())
		log.Error().Msgf("output: %s", out.String())
		return nil
	}

	// init secret scan
	SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_INPROGRESS), rh)

	scanResult, err := secretScan.ExtractAndScanFromTar(dir, imagename)
	// secretScan.ExtractAndScanFromTar(tarPath,)
	if err != nil {
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
	if err := SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_SUCCESS), rh); err != nil {
		log.Error().Msgf("error sending scan status: %s", err.Error())
	}

	return nil
}

func initSecretScanner() {
	var sessionSecretScanner = core.GetSession()
	// init secret scan builds hsdb
	signature.ProcessSignatures(sessionSecretScanner.Config.Signatures)
	signature.BuildHsDb()
}

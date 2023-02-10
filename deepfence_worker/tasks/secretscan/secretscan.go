package secretscan

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"os/exec"

	"github.com/ThreeDotsLabs/watermill/message"
	secretScan "github.com/deepfence/SecretScanner/scan"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

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
	authFile, namespace, _, err := GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		return nil
	}
	defer os.Remove(authFile)

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

	imgTar := dir + "/image.tar"
	// todo: move to skopeo
	cmd := exec.Command("skopeo", []string{"--authfile", authFile, "docker://" + imagename, "docker-archive:" + imgTar}...)
	log.Info().Msgf("command: %s", cmd.String())
	// cmd.Env = append(cmd.Env, fmt.Sprintf("DOCKER_CONFIG=%s", authFile))
	if err := cmd.Run(); err != nil {
		log.Error().Err(err).Msg(cmd.String())
		return nil
	}

	// init secret scan
	// SendScanStatus(s.ingestC, NewSecretScanStatus(params, utils.SCAN_STATUS_INPROGRESS), rh)
	scanResult, err := secretScan.ExtractAndScanFromTar(imgTar, imagename)
	// secretScan.ExtractAndScanFromTar(tarPath,)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	for _, c := range scanResult.Secrets {
		cb, err := json.Marshal(c)
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

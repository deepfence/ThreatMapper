package sbom

import (
	"encoding/json"
	"errors"
	"os"
	"path"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/deepfence/package-scanner/sbom/syft"
	psUtils "github.com/deepfence/package-scanner/utils"
	"github.com/minio/minio-go/v7"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	syftBin = "syft"
)

type SbomGenerator struct {
	ingestC chan *kgo.Record
}

func NewSbomGenerator(ingest chan *kgo.Record) SbomGenerator {
	return SbomGenerator{ingestC: ingest}
}

func (s SbomGenerator) GenerateSbom(msg *message.Message) ([]*message.Message, error) {
	// // extract tenant id
	// tenantID, err := directory.ExtractNamespace(msg.Context())
	// if err != nil {
	// 	log.Error().Msg(err.Error())
	// 	return err
	// }

	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return nil, errors.New("tenant-id/namespace is empty")
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))

	log.Info().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	var params utils.SbomParameters

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	// get registry credentials
	authFile, namespace, insecure, err := GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		return nil, err
	}
	defer os.Remove(authFile)

	// generate sbom
	cfg := psUtils.Config{
		SyftBinPath:           syftBin,
		HostName:              params.HostName,
		NodeType:              params.NodeType,
		NodeId:                params.NodeId,
		KubernetesClusterName: params.KubernetesClusterName,
		ScanId:                params.ScanId,
		ImageId:               params.ImageId,
		ContainerName:         params.ContainerName,
		RegistryId:            params.RegistryId,
		RegistryCreds: psUtils.RegistryCreds{
			AuthFilePath:     authFile,
			InsecureRegistry: insecure,
		},
	}

	if params.ImageName != "" {
		if namespace != "" {
			cfg.Source = namespace + "/" + params.ImageName
		} else {
			cfg.Source = params.ImageName
		}
	} else {
		cfg.Source = params.ImageId
	}

	log.Debug().Msgf("config: %+v", cfg)

	rawSbom, err := syft.GenerateSBOM(cfg)
	if err != nil {
		return nil, err
	}

	// upload sbom to minio
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	sbomFile := path.Join("/sbom/", utils.ScanIdReplacer.Replace(params.ScanId)+".json")
	info, err := mc.UploadFile(ctx, sbomFile, []byte(rawSbom),
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	log.Info().Msgf("sbom file uploaded %+v", info)

	// write sbom to minio and return details another task will scan sbom

	rh := []kgo.RecordHeader{
		{Key: "tenant_id", Value: []byte(tenantID)},
	}

	SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_SUCCESS), rh)

	params.SBOMFilePath = sbomFile

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	scanMsg := message.NewMessage(watermill.NewUUID(), payload)
	scanMsg.Metadata = map[string]string{directory.NamespaceKey: tenantID}
	middleware.SetCorrelationID(watermill.NewShortUUID(), scanMsg)

	return []*message.Message{scanMsg}, nil
}

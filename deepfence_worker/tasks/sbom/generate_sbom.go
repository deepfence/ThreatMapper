package sbom

import (
	"encoding/json"
	"os"
	"path"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
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
	defer cronjobs.ScanWorkloadAllocator.Free()

	var params utils.SbomParameters

	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return nil, directory.ErrNamespaceNotFound
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	rh := []kgo.RecordHeader{
		{Key: "tenant_id", Value: []byte(tenantID)},
	}

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))

	log.Info().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil, nil
	}

	if params.RegistryId == "" {
		log.Error().Msgf("registry id is empty in params %+v", params)
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED,
			"registry id is empty in params", nil), rh)
		return nil, nil
	}

	// get registry credentials
	authFile, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil, nil
	}
	defer func() {
		log.Info().Msgf("remove auth directory %s", authFile)
		if err := os.RemoveAll(authFile); err != nil {
			log.Error().Msg(err.Error())
		}
	}()

	// generate sbom
	cfg := psUtils.Config{
		SyftBinPath:           syftBin,
		HostName:              params.HostName,
		NodeType:              "container_image", // this is required by package scanner
		NodeId:                params.NodeId,
		KubernetesClusterName: params.KubernetesClusterName,
		ScanId:                params.ScanId,
		ImageId:               params.ImageId,
		ContainerName:         params.ContainerName,
		RegistryId:            params.RegistryId,
		RegistryCreds: psUtils.RegistryCreds{
			AuthFilePath:  authFile,
			SkipTLSVerify: creds.SkipTLSVerify,
			UseHttp:       creds.UseHttp,
		},
	}

	if params.ImageName != "" {
		if creds.ImagePrefix != "" {
			cfg.Source = creds.ImagePrefix + "/" + params.ImageName
		} else {
			cfg.Source = params.ImageName
		}
	} else {
		cfg.Source = params.ImageId
	}

	log.Debug().Msgf("config: %+v", cfg)

	SendScanStatus(s.ingestC, NewSbomScanStatus(params, "GENERATING_SBOM", "", nil), rh)

	rawSbom, err := syft.GenerateSBOM(cfg)
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil, nil
	}

	// upload sbom to minio
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil, nil
	}

	sbomFile := path.Join("/sbom/", utils.ScanIdReplacer.Replace(params.ScanId)+".json")
	info, err := mc.UploadFile(ctx, sbomFile, []byte(rawSbom),
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil, nil
	}
	log.Info().Msgf("sbom file uploaded %+v", info)

	// write sbom to minio and return details another task will scan sbom

	SendScanStatus(s.ingestC, NewSbomScanStatus(params, "GENERATED_SBOM", "", nil), rh)

	params.SBOMFilePath = sbomFile

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, nil
	}

	scanMsg := message.NewMessage(watermill.NewUUID(), payload)
	scanMsg.Metadata = map[string]string{directory.NamespaceKey: tenantID}
	middleware.SetCorrelationID(watermill.NewShortUUID(), scanMsg)

	return []*message.Message{scanMsg}, nil
}

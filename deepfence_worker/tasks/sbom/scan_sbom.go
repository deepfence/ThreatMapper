package sbom

import (
	"context"
	"encoding/json"
	"os"
	"path"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/deepfence/package-scanner/scanner/grype"
	psUtils "github.com/deepfence/package-scanner/utils"
	"github.com/minio/minio-go/v7"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	grypeConfig = "/usr/local/bin/grype.yaml"
	grypeBin    = "grype"
)

type SbomParser struct {
	ingestC chan *kgo.Record
}

func NewSBOMScanner(ingest chan *kgo.Record) SbomParser {
	return SbomParser{ingestC: ingest}
}

func (s SbomParser) ScanSBOM(msg *message.Message) error {

	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return directory.ErrNamespaceNotFound
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	rh := []kgo.RecordHeader{
		{Key: "tenant_id", Value: []byte(tenantID)},
	}

	log.Info().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	var params utils.SbomParameters

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		return nil
	}

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))

	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		return nil
	}

	sbomFile := path.Join("/tmp", utils.ScanIdReplacer.Replace(params.ScanId)+".json")
	log.Info().Msgf("sbom file %s", sbomFile)
	err = mc.DownloadFile(context.Background(), params.SBOMFilePath, sbomFile, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		return nil
	}
	defer func() {
		log.Info().Msgf("remove sbom file %s", sbomFile)
		os.Remove(sbomFile)
	}()

	log.Info().Msg("scanning sbom for vulnerabilities ...")
	vulnerabilities, err := grype.Scan(grypeBin, grypeConfig, sbomFile, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		return nil
	}

	cfg := psUtils.Config{
		HostName:              params.HostName,
		NodeType:              params.NodeType,
		NodeId:                params.NodeId,
		KubernetesClusterName: params.KubernetesClusterName,
		ScanId:                params.ScanId,
		ImageId:               params.ImageId,
		ContainerName:         params.ContainerName,
	}

	report, err := grype.PopulateFinalReport(vulnerabilities, cfg)
	if err != nil {
		log.Error().Msgf("error on generate vulnerability report: %s", err)
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error()), rh)
		return nil
	}

	log.Info().Msgf("scan-id=%s vulnerabilities=%d", params.ScanId, len(report))

	// write reports and status to kafka ingester will process from there

	for _, c := range report {
		cb, err := json.Marshal(c)
		if err != nil {
			log.Error().Msg(err.Error())
		} else {
			s.ingestC <- &kgo.Record{
				Topic:   utils.VULNERABILITY_SCAN,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	// scan status
	if err := SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_SUCCESS, ""), rh); err != nil {
		log.Error().Msgf("error sending scan status: %s", err.Error())
	}

	return nil
}

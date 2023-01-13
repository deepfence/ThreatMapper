package tasks

import (
	"context"
	"encoding/json"
	"os"
	"path"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
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

func NewSBOMParser(ingest chan *kgo.Record) SbomParser {
	return SbomParser{ingestC: ingest}
}

func (s SbomParser) ParseSBOM(msg *message.Message) error {
	// extract tenant id
	tenantID, err := directory.ExtractNamespace(msg.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		// 	return err
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	log.Debug().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	var params utils.SbomQueryParameters

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	mc, err := directory.MinioClient(directory.NewGlobalContext())
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	sbomFile := path.Join("/tmp", utils.ScanIdReplacer.Replace(params.ScanId)+".json")
	log.Info().Msgf("sbom file %s", sbomFile)
	err = mc.FGetObject(context.Background(), params.Bucket, params.SBOMFilePath,
		sbomFile, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	defer func() {
		log.Info().Msgf("remove sbom file %s", sbomFile)
		os.Remove(sbomFile)
	}()

	log.Info().Msg("scanning sbom for vulnerabilities ...")
	vulnerabilities, err := grype.Scan(grypeBin, grypeConfig, sbomFile, nil)
	if err != nil {
		log.Error().Msg(err.Error())
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
		log.Error().Msgf("error on generate vulnerability report: %s", err.Error())
	}

	// write reports and status to kafka ingester will process from there

	rh := []kgo.RecordHeader{
		{Key: "tenant_id", Value: []byte(params.Bucket)},
	}

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
	status := struct {
		utils.SbomQueryParameters
		Status string `json:"status,omitempty"`
	}{
		Status:              utils.SCAN_STATUS_SUCCESS,
		SbomQueryParameters: params,
	}

	sb, err := json.Marshal(status)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	} else {
		s.ingestC <- &kgo.Record{
			Topic:   utils.VULNERABILITY_SCAN_STATUS,
			Value:   sb,
			Headers: rh,
		}
	}

	return nil
}

package sbom

import (
	"context"
	"encoding/json"
	"os"
	"path"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/anchore/syft/syft/formats"
	"github.com/anchore/syft/syft/sbom"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	psOutput "github.com/deepfence/package-scanner/output"
	ps "github.com/deepfence/package-scanner/scanner"
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
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil
	}

	// send inprogress status
	SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_INPROGRESS, "", nil), rh)

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))

	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil
	}

	sbomFile := path.Join("/tmp", utils.ScanIdReplacer.Replace(params.ScanId)+".json")
	log.Info().Msgf("sbom file %s", sbomFile)
	err = mc.DownloadFile(context.Background(), params.SBOMFilePath, sbomFile, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil
	}
	defer func() {
		log.Info().Msgf("remove sbom file %s", sbomFile)
		os.Remove(sbomFile)
	}()

	log.Info().Msg("scanning sbom for vulnerabilities ...")
	env := []string{
		"GRYPE_DB_UPDATE_URL=http://deepfence-file-server:9000/database/database/vulnerability/listing.json",
	}
	vulnerabilities, err := grype.Scan(grypeBin, grypeConfig, sbomFile, &env)
	if err != nil {
		log.Error().Msgf("error: %s output: %s", err.Error(), string(vulnerabilities))
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
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
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil
	}

	details := psOutput.CountBySeverity(&report)

	log.Info().Msgf("scan-id=%s vulnerabilities=%d severities=%v", params.ScanId, len(report), details.Severity)

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
	info := model.ScanInfo{
		ScanId:    params.ScanId,
		Status:    utils.SCAN_STATUS_SUCCESS,
		UpdatedAt: time.Now().Unix(),
		NodeId:    params.NodeId,
		NodeType:  params.NodeType,
		NodeName:  params.NodeId,
		SeverityCounts: map[string]int32{
			"total":          int32(details.Total),
			psUtils.CRITICAL: int32(details.Severity.Critical),
			psUtils.HIGH:     int32(details.Severity.High),
			psUtils.MEDIUM:   int32(details.Severity.Medium),
			psUtils.LOW:      int32(details.Severity.Low),
		},
	}

	if err := SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_SUCCESS, "", &info), rh); err != nil {
		log.Error().Msgf("error sending scan status: %s", err.Error())
	}

	// generate runtime sbom
	runtimeSbom, err := generateRuntimeSBOM(sbomFile, report)
	if err != nil {
		log.Error().Err(err).Msgf("failed to generate runtime sbom")
		return nil
	}

	runtimeSbomBytes, err := json.Marshal(runtimeSbom)
	if err != nil {
		log.Error().Err(err).Msgf("failed to marshal runtime sbom")
		return nil
	}

	runtimeSbomPath := path.Join("/sbom/", "runtime-"+utils.ScanIdReplacer.Replace(params.ScanId)+".json")
	uploadInfo, err := mc.UploadFile(context.Background(), runtimeSbomPath, runtimeSbomBytes,
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Err(err).Msgf("failed to upload runtime sbom")
		return nil
	}

	log.Info().Msgf("scan_id: %s, runtime sbom minio file info: %+v", params.ScanId, uploadInfo)

	return nil
}

// read sbom from file
func readSBOM(path string) (*sbom.SBOM, error) {
	fin, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer fin.Close()
	sbomOut, format, err := formats.Decode(fin)
	log.Info().Msgf("path %s sbom format %s", path, format)
	if err != nil {
		return nil, err
	}
	return sbomOut, nil
}

type cveInfo struct {
	CveID    string
	Severity string
}

// generate map of package:version with severity
func mapVulnerabilities(vulnerabilities []ps.VulnerabilityScanReport) map[string]cveInfo {
	vMap := map[string]cveInfo{}
	for _, v := range vulnerabilities {
		vMap[v.CveCausedByPackage] = cveInfo{CveID: v.CveId, Severity: v.CveSeverity}
	}
	return vMap
}

// generate runtime sbom format
func generateRuntimeSBOM(path string, vulnerabilities []ps.VulnerabilityScanReport) (*[]model.SbomResponse, error) {
	var (
		runSBOM = make([]model.SbomResponse, 0)
		err     error
	)

	vMap := mapVulnerabilities(vulnerabilities)

	sbomIn, err := readSBOM(path)
	if err != nil {
		return nil, err
	}

	for item := range sbomIn.Artifacts.PackageCatalog.Enumerate() {
		cveInfo := vMap[item.Name+":"+item.Version]
		runSBOM = append(runSBOM, model.SbomResponse{
			PackageName: item.Name,
			Version:     item.Version,
			Locations:   item.Locations.CoordinateSet().Paths(),
			Licenses:    item.Licenses,
			CveID:       cveInfo.CveID,
			Severity:    cveInfo.Severity,
		})

	}

	return &runSBOM, err
}

package sbom

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"os"
	"path"
	"regexp"
	"sync"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/anchore/syft/syft/formats"
	"github.com/anchore/syft/syft/sbom"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
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

var attackVectorRegex *regexp.Regexp

func init() {
	attackVectorRegex = regexp.MustCompile(`.*av:n.*`)
}

type SbomParser struct {
	ingestC chan *kgo.Record
}

func NewSBOMScanner(ingest chan *kgo.Record) SbomParser {
	return SbomParser{ingestC: ingest}
}

type UnzippedFile struct {
	file   *os.File
	buffer *bytes.Buffer
}

func NewUnzippedFile(file *os.File) UnzippedFile {
	return UnzippedFile{
		file:   file,
		buffer: &bytes.Buffer{},
	}
}

func (b UnzippedFile) Write(data []byte) (int, error) {
	return b.buffer.Write(data)
}

func (b UnzippedFile) Close() error {
	gzr, err := gzip.NewReader(b.buffer)
	if err != nil {
		return err
	}
	sbom, err := io.ReadAll(gzr)
	if err != nil {
		return err
	}
	err = gzr.Close()
	if err != nil {
		return err
	}
	_, err = b.file.Write(sbom)
	if err != nil {
		return err
	}
	return b.file.Close()
}

func (s SbomParser) ScanSBOM(msg *message.Message) error {

	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return directory.ErrNamespaceNotFound
	}

	log.Info().Msgf("message tenant id %s", string(tenantID))

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	log.Info().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	var params utils.SbomParameters

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil
	}

	statusChan := make(chan SbomScanStatus)
	var wg sync.WaitGroup
	wg.Add(1)
	StartStatusReporter("SCAN_SBOM", statusChan, s.ingestC, rh, params, &wg)
	defer wg.Wait()

	// send inprogress status
	statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_INPROGRESS, "", nil)

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))

	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
		return nil
	}

	sbomFilePath := path.Join("/tmp", utils.ScanIdReplacer.Replace(params.ScanId)+".json")
	f, err := os.Create(sbomFilePath)
	if err != nil {
		return err
	}
	log.Info().Msgf("sbom file %s", sbomFilePath)
	sbomFile := NewUnzippedFile(f)
	err = mc.DownloadFileTo(context.Background(), params.SBOMFilePath, sbomFile, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Msg(err.Error())
		statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
		return nil
	}
	defer func() {
		log.Info().Msgf("remove sbom file %s", sbomFilePath)
		os.Remove(sbomFilePath)
	}()

	log.Info().Msg("scanning sbom for vulnerabilities ...")
	env := []string{
		"GRYPE_DB_UPDATE_URL=http://deepfence-file-server:9000/database/database/vulnerability/listing.json",
	}
	vulnerabilities, err := grype.Scan(grypeBin, grypeConfig, sbomFilePath, &env)
	if err != nil {
		log.Error().Msgf("error: %s output: %s", err.Error(), string(vulnerabilities))
		statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
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
		statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
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

	statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_SUCCESS, "", &info)

	// generate runtime sbom
	runtimeSbom, err := generateRuntimeSBOM(sbomFilePath, report)
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

	for item := range sbomIn.Artifacts.Packages.Enumerate() {
		cveInfo := vMap[item.Name+":"+item.Version]
		licenses := []string{}
		for _, l := range item.Licenses.ToSlice() {
			licenses = append(licenses, l.Value)
		}
		runSBOM = append(runSBOM, model.SbomResponse{
			PackageName: item.Name,
			Version:     item.Version,
			Locations:   item.Locations.CoordinateSet().Paths(),
			Licenses:    licenses,
			CveID:       cveInfo.CveID,
			Severity:    cveInfo.Severity,
		})

	}

	return &runSBOM, err
}

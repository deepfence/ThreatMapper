package sbom

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path"
	"time"

	"github.com/anchore/syft/syft/formats"
	"github.com/anchore/syft/syft/sbom"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	workerUtil "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/tasks"
	psOutput "github.com/deepfence/package-scanner/output"
	ps "github.com/deepfence/package-scanner/scanner"
	"github.com/deepfence/package-scanner/scanner/grype"
	psUtils "github.com/deepfence/package-scanner/utils"
	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	grypeConfig         = "/usr/local/bin/grype.yaml"
	grypeBin            = "grype"
	minioHost           = utils.GetEnvOrDefault("DEEPFENCE_MINIO_HOST", "deepfence-file-server")
	minioPort           = utils.GetEnvOrDefault("DEEPFENCE_MINIO_PORT", "9000")
	minioRegion         = os.Getenv("DEEPFENCE_MINIO_REGION")
	minioBucket         = os.Getenv("DEEPFENCE_MINIO_DB_BUCKET")
	GRYPE_DB_UPDATE_URL string
)

func init() {
	// for aws s3
	GRYPE_DB_UPDATE_URL = fmt.Sprintf("GRYPE_DB_UPDATE_URL=https://%s.s3.%s.amazonaws.com/database/vulnerability/listing.json", minioBucket, minioRegion)
	if minioHost != "s3.amazonaws.com" {
		GRYPE_DB_UPDATE_URL = fmt.Sprintf("GRYPE_DB_UPDATE_URL=http://%s:%s/database/database/vulnerability/listing.json", minioHost, minioPort)
	}
	log.Info().Msg(GRYPE_DB_UPDATE_URL)
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

func (s SbomParser) ScanSBOM(ctx context.Context, task *asynq.Task) error {

	var err error
	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return directory.ErrNamespaceNotFound
	}

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	log.Info().Str("namespace", string(tenantID)).Msgf("payload: %s ", string(task.Payload()))

	var params utils.SbomParameters

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Str("namespace", string(tenantID)).Msg(err.Error())
		return nil
	}

	res, scanCtx := tasks.StartStatusReporter(params.ScanID,
		func(status tasks.ScanStatus) error {
			sb, err := json.Marshal(status)
			if err != nil {
				return err
			}
			s.ingestC <- &kgo.Record{
				Topic:   utils.VulnerabilityScanStatus,
				Value:   sb,
				Headers: rh,
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

	log.Info().Str("namespace", string(tenantID)).Msgf("Adding scan id to map:%s", params.ScanID)
	scanMap.Store(params.ScanID, scanCtx)
	defer func() {
		log.Info().Str("namespace", string(tenantID)).Msgf("Removing scan id from map:%s", params.ScanID)
		scanMap.Delete(params.ScanID)
		res <- err
		close(res)
	}()

	// send inprogress status

	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Msg(err.Error())
		return err
	}

	sbomFilePath := path.Join("/tmp", utils.ScanIDReplacer.Replace(params.ScanID)+".json")
	f, err := os.Create(sbomFilePath)
	if err != nil {
		return err
	}
	log.Info().Str("namespace", string(tenantID)).Msgf("sbom file %s", sbomFilePath)
	sbomFile := NewUnzippedFile(f)
	err = mc.DownloadFileTo(context.Background(), params.SBOMFilePath, sbomFile, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Msg(err.Error())
		return err
	}
	defer func() {
		log.Info().Str("namespace", string(tenantID)).Msgf("remove sbom file %s", sbomFilePath)
		os.Remove(sbomFilePath)
	}()

	log.Info().Str("namespace", string(tenantID)).Msg("scanning sbom for vulnerabilities ...")
	env := []string{GRYPE_DB_UPDATE_URL}
	vulnerabilities, err := grype.Scan(grypeBin, grypeConfig, sbomFilePath, &env)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Msgf("error: %s output: %s", err.Error(), string(vulnerabilities))
		return err
	}

	cfg := psUtils.Config{
		HostName:              params.HostName,
		NodeType:              params.NodeType,
		NodeID:                params.NodeID,
		KubernetesClusterName: params.KubernetesClusterName,
		ScanID:                params.ScanID,
		ImageID:               params.ImageID,
		ContainerName:         params.ContainerName,
	}

	report, err := grype.PopulateFinalReport(vulnerabilities, cfg)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Msgf("error on generate vulnerability report: %s", err)
		return err
	}

	details := psOutput.CountBySeverity(&report)

	log.Info().Str("namespace", string(tenantID)).
		Msgf("scan-id=%s vulnerabilities=%d severities=%v", params.ScanID, len(report), details.Severity)

	// write reports and status to kafka ingester will process from there
	for _, c := range report {
		cb, err := json.Marshal(c)
		if err != nil {
			log.Error().Msg(err.Error())
		} else {
			s.ingestC <- &kgo.Record{
				Topic:   utils.VulnerabilityScan,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	// generate runtime sbom needs entity Id
	driver, err := directory.Neo4jClient(directory.NewContextWithNameSpace(directory.NamespaceID(tenantID)))
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	entityID, err := workerUtil.GetEntityIdFromScanID(params.ScanID, string(utils.NEO4JVulnerabilityScan), tx)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Msgf("Error in getting entityId: %v", err)
	}

	// generate runtime sbom
	runtimeSbom, err := generateRuntimeSBOM(sbomFilePath, report, entityID)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Err(err).Msgf("failed to generate runtime sbom")
		return err
	}

	runtimeSbomBytes, err := json.Marshal(runtimeSbom)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Err(err).Msgf("failed to marshal runtime sbom")
		return err
	}

	runtimeSbomPath := path.Join("/sbom/", "runtime-"+utils.ScanIDReplacer.Replace(params.ScanID)+".json")
	uploadInfo, err := mc.UploadFile(context.Background(), runtimeSbomPath, runtimeSbomBytes, true,
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Err(err).Msgf("failed to upload runtime sbom")
		return err
	}

	log.Info().Str("namespace", string(tenantID)).
		Msgf("scan_id: %s, runtime sbom minio file info: %+v", params.ScanID, uploadInfo)

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
	CveCausedByPackage string
	CveID              string
	Severity           string
}

// generate map of package:version with severity
func mapVulnerabilities(vulnerabilities []ps.VulnerabilityScanReport) map[string]cveInfo {
	vMap := map[string]cveInfo{}
	for _, v := range vulnerabilities {
		vMap[v.CveCausedByPackage] = cveInfo{
			CveCausedByPackage: v.CveCausedByPackage,
			CveID:              v.CveID,
			Severity:           v.CveSeverity,
		}
	}
	return vMap
}

// generate runtime sbom format
func generateRuntimeSBOM(path string, vulnerabilities []ps.VulnerabilityScanReport, entityID string) (*[]model.SbomResponse, error) {
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
		entry := model.SbomResponse{
			PackageName: item.Name,
			Version:     item.Version,
			Locations:   item.Locations.CoordinateSet().Paths(),
			Licenses:    licenses,
			CveID:       cveInfo.CveID,
			Severity:    cveInfo.Severity,
		}
		if len(cveInfo.CveID) > 0 {
			entry.CveNodeID = workerUtil.GetVulnerabilityNodeID(cveInfo.CveCausedByPackage, cveInfo.CveID, entityID)
		}

		runSBOM = append(runSBOM, entry)
	}

	return &runSBOM, err
}

package reports

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var ErrUnknownReportType = errors.New("unknown report type")
var ErrUnknownScanType = errors.New("unknown scan type")
var ErrNotImplemented = errors.New("not implemented")

func fileExt(reportType sdkUtils.ReportType) string {
	switch reportType {
	case sdkUtils.ReportXLSX:
		return ".xlsx"
	case sdkUtils.ReportPDF:
		return ".pdf"
	case sdkUtils.ReportSBOM:
		return ".json.gz"
	}
	return ".unknown"
}

func reportFileName(params sdkUtils.ReportParams) string {
	if sdkUtils.ReportType(params.ReportType) == sdkUtils.ReportSBOM {
		return fmt.Sprintf("sbom_%s%s", params.ReportID, fileExt(sdkUtils.ReportSBOM))
	}

	list := []string{params.Filters.ScanType, params.Filters.NodeType, params.ReportID}

	if params.ZippedReport {
		return strings.Join(list, "_") + ".zip"
	}

	return strings.Join(list, "_") + fileExt(sdkUtils.ReportType(params.ReportType))
}

func tempReportFile(params sdkUtils.ReportParams) string {
	return strings.Join(
		[]string{
			"report",
			fmt.Sprintf("%d", time.Now().UnixMilli()),
			reportFileName(params),
		},
		"-")
}

func putOpts(reportType sdkUtils.ReportType) minio.PutObjectOptions {
	switch reportType {
	case sdkUtils.ReportXLSX:
		return minio.PutObjectOptions{ContentType: "application/xlsx"}
	case sdkUtils.ReportPDF:
		return minio.PutObjectOptions{ContentType: "application/pdf"}
	case sdkUtils.ReportSBOM:
		return minio.PutObjectOptions{ContentType: "application/gzip"}
	case sdkUtils.ReportZIP:
		return minio.PutObjectOptions{ContentType: "application/zip"}
	}
	return minio.PutObjectOptions{}
}

func generateReport(ctx context.Context, params sdkUtils.ReportParams) (string, error) {
	switch sdkUtils.ReportType(params.ReportType) {
	case sdkUtils.ReportPDF:
		return generatePDF(ctx, params)
	case sdkUtils.ReportXLSX:
		return generateXLSX(ctx, params)
	case sdkUtils.ReportSBOM:
		return generateSBOM(ctx, params)
	}
	return "", ErrUnknownReportType
}

func GenerateReport(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var params sdkUtils.ReportParams

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return errors.New("tenant-id/namespace is empty")
	}

	log.Info().Msgf("payload: %s ", string(task.Payload()))

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Err(err).Msgf("error decoding report request payload %s", string(task.Payload()))
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	updateReportState(ctx, session, params.ReportID, "", "", sdkUtils.ScanStatusInProgress, "")

	// generate reportName
	localReportPath, err := generateReport(ctx, params)
	if err != nil {
		log.Error().Err(err).Msgf("failed to generate report with params %+v", params)
		updateReportState(ctx, session, params.ReportID,
			"", "", sdkUtils.ScanStatusFailed, err.Error())
		return nil
	}
	log.Info().Msgf("report file path %s", localReportPath)
	defer func() {
		os.Remove(localReportPath)
	}()

	// upload file to file server
	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get minio client")
		return nil
	}

	reportName := path.Join("/report", reportFileName(params))

	putOptions := putOpts(sdkUtils.ReportType(params.ReportType))
	// specical case zip in not report type
	if params.ZippedReport {
		putOptions = putOpts(sdkUtils.ReportZIP)
	}

	res, err := mc.UploadLocalFile(ctx, reportName, localReportPath, true, putOptions)
	if err != nil {
		log.Error().Err(err).Msg("failed to upload file to minio")
		return nil
	}

	updateReportState(ctx, session, params.ReportID,
		reportName, res.Key, sdkUtils.ScanStatusSuccess, "")

	return nil
}

func updateReportState(ctx context.Context, session neo4j.SessionWithContext,
	reportID, reportName, path, status, message string) {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "reports", "update-report-state")
	defer span.End()

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
	}
	defer tx.Close(ctx)

	query := `
	MATCH (n:Report{report_id:$uid})
	SET n.file_name=$file_name, n.updated_at=TIMESTAMP(), n.status = $status, n.storage_path = $path, n.status_message=$status_message 
	RETURN n
	`
	vars := map[string]interface{}{
		"uid":            reportID,
		"file_name":      reportName,
		"status":         status,
		"status_message": message,
		"path":           path,
	}
	_, err = tx.Run(ctx, query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	if err := tx.Commit(ctx); err != nil {
		log.Error().Err(err).Msg("failed to commit tx")
	}
}

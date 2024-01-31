package reports

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
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
	}
	return ".unknown"
}

func reportFileName(params sdkUtils.ReportParams) string {
	list := []string{params.Filters.ScanType, params.Filters.NodeType, params.ReportID}
	return strings.Join(list, "_") + fileExt(sdkUtils.ReportType(params.ReportType))
}

func putOpts(reportType sdkUtils.ReportType) minio.PutObjectOptions {
	switch reportType {
	case sdkUtils.ReportXLSX:
		return minio.PutObjectOptions{ContentType: "application/xlsx"}
	case sdkUtils.ReportPDF:
		return minio.PutObjectOptions{ContentType: "application/pdf"}
	}
	return minio.PutObjectOptions{}
}

func generateReport(ctx context.Context, params sdkUtils.ReportParams) (string, error) {
	switch sdkUtils.ReportType(params.ReportType) {
	case sdkUtils.ReportPDF:
		return generatePDF(ctx, params)
	case sdkUtils.ReportXLSX:
		return generateXLSX(ctx, params)
	}
	return "", ErrUnknownReportType
}

func GenerateReport(ctx context.Context, task *asynq.Task) error {

	var params sdkUtils.ReportParams

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return errors.New("tenant-id/namespace is empty")
	}

	log.Info().Str("namespace", string(tenantID)).Msgf("payload: %s ", string(task.Payload()))

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Str("namespace", string(tenantID)).Err(err).Msgf("error decoding report request payload %s", string(task.Payload()))
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Msg(err.Error())
		return nil
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Msg(err.Error())
		return nil
	}
	defer session.Close()

	updateReportState(ctx, session, params.ReportID, "", "", sdkUtils.ScanStatusInProgress)

	// generate reportName
	localReportPath, err := generateReport(ctx, params)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Err(err).Msgf("failed to generate report with params %+v", params)
		updateReportState(ctx, session, params.ReportID, "", "", sdkUtils.ScanStatusFailed)
		return nil
	}
	log.Info().Msgf("report file path %s", localReportPath)
	defer func() {
		os.Remove(localReportPath)
	}()

	// upload file to minio
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Err(err).Msg("failed to get minio client")
		return nil
	}

	reportName := path.Join("/report", reportFileName(params))
	res, err := mc.UploadLocalFile(ctx, reportName,
		localReportPath, false, putOpts(sdkUtils.ReportType(params.ReportType)))
	if err != nil {
		log.Error().Str("namespace", string(tenantID)).Err(err).Msg("failed to upload file to minio")
		return nil
	}

	cd := url.Values{
		"response-content-disposition": []string{
			"attachment; filename=\"" + reportFileName(params) + "\""},
	}
	url, err := mc.ExposeFile(ctx, res.Key, false, utils.ReportRetentionTime, cd)
	if err != nil {
		log.Error().Err(err)
		return err
	}
	log.Info().Str("namespace", string(tenantID)).Msgf("exposed report URL: %s", url)

	updateReportState(ctx, session, params.ReportID, url, res.Key, sdkUtils.ScanStatusSuccess)

	return nil
}

func updateReportState(ctx context.Context, session neo4j.Session, reportId, url, path, status string) {
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
	}
	defer tx.Close()

	// update url in neo4j report node
	query := `
	MATCH (n:Report{report_id:$uid})
	SET n.url=$url, n.updated_at=TIMESTAMP(), n.status = $status, n.storage_path = $path
	RETURN n
	`
	vars := map[string]interface{}{
		"uid":    reportId,
		"url":    url,
		"status": status,
		"path":   path,
	}
	_, err = tx.Run(query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	if err := tx.Commit(); err != nil {
		log.Error().Err(err).Msg("failed to commit tx")
	}
}

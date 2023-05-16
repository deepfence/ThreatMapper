package reports

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path"
	"strings"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	sdkUtils "github.com/deepfence/golang_deepfence_sdk/utils/utils"
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

func generateReport(ctx context.Context, session neo4j.Session, params sdkUtils.ReportParams) (string, error) {
	switch sdkUtils.ReportType(params.ReportType) {
	case sdkUtils.ReportPDF:
		return generatePDF(ctx, session, params)
	case sdkUtils.ReportXLSX:
		return generateXLSX(ctx, session, params)
	}
	return "", ErrUnknownReportType
}

func GenerateReport(msg *message.Message) error {

	var params sdkUtils.ReportParams

	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return errors.New("tenant-id/namespace is empty")
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	log.Info().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Err(err).Msgf("error decoding report request payload %s", string(msg.Payload))
	}

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}
	defer session.Close()

	updateReportState(ctx, session, params.ReportID, "", "", sdkUtils.SCAN_STATUS_INPROGRESS)

	// generate reportName
	localReportPath, err := generateReport(ctx, session, params)
	if err != nil {
		log.Error().Err(err).Msgf("failed to generate report with params %+v", params)
		updateReportState(ctx, session, params.ReportID, "", "", sdkUtils.SCAN_STATUS_FAILED)
		return nil
	}
	log.Info().Msgf("report file path %s", localReportPath)
	defer func() {
		os.Remove(localReportPath)
	}()

	// upload file to minio
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get minio client")
		return nil
	}

	reportName := path.Join("report", reportFileName(params))
	res, err := mc.UploadLocalFile(ctx, reportName,
		localReportPath, putOpts(sdkUtils.ReportType(params.ReportType)))
	if err != nil {
		log.Error().Err(err).Msg("failed to upload file to minio")
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
	log.Info().Msgf("exposed report URL: %s", url)

	updateReportState(ctx, session, params.ReportID, url, res.Key, sdkUtils.SCAN_STATUS_SUCCESS)

	return nil
}

func updateReportState(ctx context.Context, session neo4j.Session, reportId, url, path, status string) {
	tx, err := session.BeginTransaction()
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

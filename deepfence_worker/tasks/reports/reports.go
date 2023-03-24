package reports

import (
	"encoding/json"
	"errors"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var ErrUnknownReportType = errors.New("unknown report type")

func fileExt(reportType utils.ReportType) string {
	switch reportType {
	case utils.ReportXLSX:
		return ".xlsx"
	case utils.ReportPDF:
		return ".pdf"
	}
	return ".unknown"
}

func reportFileName(params utils.ReportParams) string {
	list := []string{params.Filters.ScanType, params.Filters.NodeType, params.ReportID}
	return strings.Join(list, "_") + "." + fileExt(utils.ReportType(params.ReportType))
}

func putOpts(reportType utils.ReportType) minio.PutObjectOptions {
	switch reportType {
	case utils.ReportXLSX:
		return minio.PutObjectOptions{ContentType: "application/xlsx"}
	case utils.ReportPDF:
		return minio.PutObjectOptions{ContentType: "application/pdf"}
	}
	return minio.PutObjectOptions{}
}

func generateReport(session neo4j.Session, params utils.ReportParams) (string, error) {
	switch utils.ReportType(params.ReportType) {
	case utils.ReportPDF:
		return generatePDF(session, params)
	case utils.ReportXLSX:
		return generateXLSX(session, params)
	}
	return "", ErrUnknownReportType
}

func GenerateReport(msg *message.Message) error {

	var params utils.ReportParams

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

	tx, err := session.BeginTransaction()
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}
	defer tx.Close()

	// generate report file
	localReport, err := generateReport(session, params)
	if err != nil {
		log.Error().Err(err).Msgf("failed to generate report with params %+v", params)
		return nil
	}

	// upload file to minio
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get minio client")
		return nil
	}

	report := path.Join("report", reportFileName(params))
	res, err := mc.UploadLocalFile(ctx, report, localReport, putOpts(utils.ReportType(params.ReportType)))
	if err != nil {
		log.Error().Err(err).Msg("failed to upload file to minio")
		return nil
	}

	url, err := mc.ExposeFile(ctx, res.Key, false, 10*time.Hour, url.Values{})
	if err != nil {
		log.Error().Err(err)
		return err
	}
	log.Info().Msgf("exposed report URL: %s", url)

	// update url in neo4j report node
	query := `
	MATCH (n:Report{report_id:$uid}) 
	SET n.url=$url, n.updated_at=TIMESTAMP(), n.status = $status
	RETURN n
	`
	vars := map[string]interface{}{
		"uid":    params.ReportID,
		"url":    url,
		"status": utils.SCAN_STATUS_SUCCESS,
	}
	_, err = tx.Run(query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	if err := tx.Commit(); err != nil {
		log.Error().Err(err).Msg("failed to commit tx")
	}
	return nil
}

package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
)

func (h *Handler) BulkDeleteReports(w http.ResponseWriter, r *http.Request) {
	var req model.BulkDeleteReportReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if err := h.Validator.Struct(req); err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	if len(req.ReportIDs) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	ctx := r.Context()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close(ctx)

	vars := map[string]interface{}{"uids": req.ReportIDs}

	getQuery := `MATCH (n:Report) WHERE n.report_id IN $uids RETURN n`
	result, err := tx.Run(ctx, getQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Collect(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	if len(records) == 0 {
		log.Warn().Msgf("No records found in db for the requested report ids")
		h.respondError(fmt.Errorf("no records found in db for the requested report ids"), w)
		return
	}

	mc, err := directory.FileServerClient(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to get minio client")
		h.respondError(err, w)
		return
	}

	deletedRecs := []string{}
	for idx, rec := range records {
		node, ok := rec.Get("n")
		if !ok {
			h.respondError(&ingesters.NodeNotFoundError{NodeID: req.ReportIDs[idx]}, w)
			return
		}
		dbNode, ok := node.(dbtype.Node)
		if !ok {
			h.respondError(&ingesters.NodeNotFoundError{NodeID: req.ReportIDs[idx]}, w)
			return
		}

		var report model.ExportReport
		utils.FromMap(dbNode.Props, &report)

		if report.Status != utils.ScanStatusFailed {
			err = mc.DeleteFile(r.Context(), report.StoragePath, false, minio.RemoveObjectOptions{ForceDelete: true})
			if err != nil {
				log.Error().Err(err).Msgf("Failed to delete in file server for report id: %s",
					report.ReportID)
			} else {
				deletedRecs = append(deletedRecs, report.ReportID)
			}
		}
	}

	if len(deletedRecs) == 0 {
		log.Error().Msgf("Failed to delete any reports")
		h.respondError(fmt.Errorf("failed to delete any reports"), w)
		return
	} else if len(deletedRecs) != len(req.ReportIDs) {
		log.Warn().Msgf("Not able to delete all the requested reports")
	}

	vars["uids"] = deletedRecs
	deleteQuery := `MATCH (n:Report) WHERE n.report_id in $uids DELETE n`
	_, err = tx.Run(ctx, deleteQuery, vars)
	if err != nil {
		log.Error().Msgf("Failed to delete reports from db, Error: %s", err.Error())
		h.respondError(err, w)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Error().Msgf("Failure in db commit, error:%s", err.Error())
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventReports, ActionDelete, req, true)

	w.WriteHeader(http.StatusNoContent)

}

func (h *Handler) DeleteReport(w http.ResponseWriter, r *http.Request) {

	var req model.ReportReq
	req.ReportID = chi.URLParam(r, "report_id")
	if err := h.Validator.Struct(req); err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	ctx := r.Context()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close(ctx)

	vars := map[string]interface{}{"uid": req.ReportID}

	getQuery := `MATCH (n:Report{report_id:$uid}) RETURN n`
	result, err := tx.Run(ctx, getQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Single(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	i, ok := records.Get("n")
	if !ok {
		h.respondError(&ingesters.NodeNotFoundError{NodeID: req.ReportID}, w)
		return
	}
	da, ok := i.(dbtype.Node)
	if !ok {
		h.respondError(&ingesters.NodeNotFoundError{NodeID: req.ReportID}, w)
		return
	}

	var report model.ExportReport
	utils.FromMap(da.Props, &report)

	// upload file to file server
	mc, err := directory.FileServerClient(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to get minio client")
		h.respondError(err, w)
		return
	}

	// skip report file delete, in case of error we don't save the file
	if report.Status != utils.ScanStatusFailed {
		err = mc.DeleteFile(r.Context(), report.StoragePath, false, minio.RemoveObjectOptions{ForceDelete: true})
		if err != nil {
			log.Error().Err(err).Msg("failed to delete file in file server")
			h.respondError(err, w)
			return
		}
	}

	deleteQuery := `MATCH (n:Report{report_id:$uid}) DELETE n`
	_, err = tx.Run(ctx, deleteQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventReports, ActionDelete, req, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetReport(w http.ResponseWriter, r *http.Request) {

	var req model.ReportReq
	req.ReportID = chi.URLParam(r, "report_id")
	if err := h.Validator.Struct(req); err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	ctx := r.Context()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close(ctx)

	query := `MATCH (n:Report{report_id:$uid}) RETURN n`
	vars := map[string]interface{}{"uid": req.ReportID}
	result, err := tx.Run(ctx, query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Single(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	i, ok := records.Get("n")
	if !ok {
		h.respondError(&ingesters.NodeNotFoundError{NodeID: req.ReportID}, w)
		return
	}
	da, ok := i.(dbtype.Node)
	if !ok {
		h.respondError(&ingesters.NodeNotFoundError{NodeID: req.ReportID}, w)
		return
	}

	var report model.ExportReport
	utils.FromMap(da.Props, &report)

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	var cd url.Values
	if report.FileName != "" {
		cd = url.Values{
			"response-content-disposition": []string{"attachment; filename=\"" + report.FileName + "\""},
		}
	}
	fileServerURL, err := mc.ExposeFile(ctx, report.StoragePath, false, utils.ReportRetentionTime, cd, h.GetHostURL(r))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	report.URL = fileServerURL

	err = httpext.JSON(w, http.StatusOK, report)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) ListReports(w http.ResponseWriter, r *http.Request) {

	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	ctx := r.Context()

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close(ctx)

	query := `MATCH (n:Report) RETURN n`
	result, err := tx.Run(ctx, query, map[string]interface{}{})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Collect(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	var fileServerURL string
	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	reports := []model.ExportReport{}
	for _, rec := range records {
		i, ok := rec.Get("n")
		if !ok {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		da, ok := i.(dbtype.Node)
		if !ok {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		var report model.ExportReport
		utils.FromMap(da.Props, &report)

		var cd url.Values
		if report.FileName != "" {
			cd = url.Values{
				"response-content-disposition": []string{"attachment; filename=\"" + report.FileName + "\""},
			}
		}
		if report.StoragePath != "" {
			fileServerURL, err = mc.ExposeFile(ctx, report.StoragePath, false, utils.ReportRetentionTime, cd, h.GetHostURL(r))
			if err == nil {
				report.URL = fileServerURL
			} else {
				log.Warn().Err(err).Msg("Failed to expose report file")
			}
		}

		reports = append(reports, report)
	}

	// sort reports
	sort.Slice(reports, func(i, j int) bool {
		return reports[i].CreatedAt > reports[j].CreatedAt
	})

	err = httpext.JSON(w, http.StatusOK, reports)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

const (
	fromDateToDateMaxDifference = 180 * 24 // 180 days in hours
)

var (
	errFromDateRequired = ValidatorError{
		err:                       errors.New("from_timestamp:required if 'to date' is set"),
		skipOverwriteErrorMessage: true,
	}
	errToDateRequired = ValidatorError{
		err:                       errors.New("to_timestamp:required if 'from date' is set"),
		skipOverwriteErrorMessage: true,
	}
	errFromDateLessThanToDate = ValidatorError{
		err:                       errors.New("to_timestamp:should be greater than from date"),
		skipOverwriteErrorMessage: true,
	}
	errToDateGreaterThanToday = ValidatorError{
		err:                       errors.New("to_timestamp:should not be greater than today"),
		skipOverwriteErrorMessage: true,
	}
	errFromAndToDateDifference = ValidatorError{
		err:                       fmt.Errorf("from_timestamp:difference cannot be more than %d days", fromDateToDateMaxDifference/24),
		skipOverwriteErrorMessage: true,
	}
)

func (h *Handler) GenerateReport(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.GenerateReportReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}
	if err := h.Validator.Struct(req); err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	var fromTimestamp time.Time
	var toTimestamp time.Time
	if req.FromTimestamp > 0 && req.ToTimestamp > 0 {
		fromTimestamp = time.UnixMilli(req.FromTimestamp).UTC()
		toTimestamp = time.UnixMilli(req.ToTimestamp).UTC()

		now := time.Now().UTC()
		tomorrowDate := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 1, 0, time.UTC)
		if tomorrowDate.Before(toTimestamp) {
			h.respondError(&errToDateGreaterThanToday, w)
			return
		}
		if fromTimestamp.After(toTimestamp) {
			h.respondError(&errFromDateLessThanToDate, w)
			return
		}
		if toTimestamp.Sub(fromTimestamp).Hours() > fromDateToDateMaxDifference {
			h.respondError(&errFromAndToDateDifference, w)
			return
		}
	} else if req.FromTimestamp > 0 {
		h.respondError(&errToDateRequired, w)
		return
	} else if req.ToTimestamp > 0 {
		h.respondError(&errFromDateRequired, w)
		return
	}

	// report task params
	params := utils.ReportParams{
		ReportType:    req.ReportType,
		FromTimestamp: fromTimestamp,
		ToTimestamp:   toTimestamp,
		Filters:       req.Filters,
		Options:       req.Options,
	}

	// scan id can only be sent while downloading individual scans
	if len(params.Filters.ScanID) > 0 && params.ReportType != string(utils.ReportSBOM) {
		params.ReportID = params.Filters.ScanID
	} else if len(params.Filters.ScanID) > 0 && params.ReportType == string(utils.ReportSBOM) {
		params.ReportID = utils.SBOMFormatReplacer.Replace(params.Options.SBOMFormat) + "-" + params.Filters.ScanID
	} else {
		params.ReportID = uuid.New().String()
	}

	ctx := r.Context()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close(ctx)

	// check if report exists for this report id
	query := `MATCH (n:Report{report_id:$uid}) RETURN n`
	vars := map[string]interface{}{"uid": params.ReportID}
	result, err := tx.Run(ctx, query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	record, err := result.Single(ctx)
	if err == nil {
		// report already exists
		node, ok := record.Get("n")
		if !ok {
			h.respondError(&ingesters.NodeNotFoundError{NodeID: params.ReportID}, w)
			return
		}
		dbNode, ok := node.(dbtype.Node)
		if !ok {
			h.respondError(&ingesters.NodeNotFoundError{NodeID: params.ReportID}, w)
			return
		}
		var report model.ExportReport
		utils.FromMap(dbNode.Props, &report)

		// check report status is completed and report type fields match
		if len(report.ReportID) > 0 && report.Status != utils.ScanStatusFailed && report.Type == req.ReportType {
			log.Info().Msgf("skip generating, report exists for given filters %+v", report)
			err = httpext.JSON(w, http.StatusOK, model.GenerateReportResp{ReportID: report.ReportID})
			if err != nil {
				log.Error().Msg(err.Error())
			}
			return
		}
	}

	// generate if report doesnot exists
	// also generate if its in error state

	worker, err := directory.Worker(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	createQuery := `
	MERGE (n:Report{report_id:$uid})
	SET n.created_at=TIMESTAMP()
	SET n.type=$type
	SET n.status=$status
	SET n.filters=$filters
	SET n.from_timestamp=$from_timestamp
	SET n.to_timestamp=$to_timestamp
	RETURN n`
	createVars := map[string]interface{}{
		"type":           req.ReportType,
		"uid":            params.ReportID,
		"status":         utils.ScanStatusStarting,
		"filters":        req.Filters.String(),
		"from_timestamp": req.FromTimestamp,
		"to_timestamp":   req.ToTimestamp,
	}

	_, err = tx.Run(ctx, createQuery, createVars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	err = worker.Enqueue(utils.ReportGeneratorTask, payload, utils.DefaultTaskOpts()...)
	if err != nil {
		log.Error().Msgf("failed to publish task: %+v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventReports, ActionCreate, req, true)

	err = httpext.JSON(w, http.StatusOK, model.GenerateReportResp{ReportID: params.ReportID})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

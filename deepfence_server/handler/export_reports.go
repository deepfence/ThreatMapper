package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
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
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
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

	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close()

	vars := map[string]interface{}{"uids": req.ReportIDs}

	getQuery := `MATCH (n:Report) WHERE n.report_id IN $uids RETURN n`
	result, err := tx.Run(getQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Collect()
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

	mc, err := directory.MinioClient(r.Context())
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
	_, err = tx.Run(deleteQuery, vars)
	if err != nil {
		log.Error().Msgf("Failed to delete reports from db, Error: %s", err.Error())
		h.respondError(err, w)
		return
	}

	if err := tx.Commit(); err != nil {
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

	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close()

	vars := map[string]interface{}{"uid": req.ReportID}

	getQuery := `MATCH (n:Report{report_id:$uid}) RETURN n`
	result, err := tx.Run(getQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Single()
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

	// upload file to minio
	mc, err := directory.MinioClient(r.Context())
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
	_, err = tx.Run(deleteQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	if err := tx.Commit(); err != nil {
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
	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close()

	query := `MATCH (n:Report{report_id:$uid}) RETURN n`
	vars := map[string]interface{}{"uid": req.ReportID}
	result, err := tx.Run(query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Single()
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

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close()

	query := `MATCH (n:Report) RETURN n`
	result, err := tx.Run(query, map[string]interface{}{})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	records, err := result.Collect()
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

	// report task params
	params := utils.ReportParams{
		ReportType: req.ReportType,
		Duration:   req.Duration,
		Filters:    req.Filters,
		Options:    req.Options,
	}

	// scan id can only be sent while downloading individual scans
	if len(params.Filters.ScanID) > 0 && params.ReportType != string(utils.ReportSBOM) {
		params.ReportID = params.Filters.ScanID
	} else if len(params.Filters.ScanID) > 0 && params.ReportType == string(utils.ReportSBOM) {
		params.ReportID = utils.SBOMFormatReplacer.Replace(params.Options.SBOMFormat) + "-" + params.Filters.ScanID
	} else {
		params.ReportID = uuid.New().String()
	}

	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
	}
	defer tx.Close()

	// check if report exists for this report id
	query := `MATCH (n:Report{report_id:$uid}) RETURN n`
	vars := map[string]interface{}{"uid": params.ReportID}
	result, err := tx.Run(query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	record, err := result.Single()
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
	SET n.duration=$duration
	RETURN n`
	createVars := map[string]interface{}{
		"type":     req.ReportType,
		"uid":      params.ReportID,
		"status":   utils.ScanStatusStarting,
		"filters":  req.Filters.String(),
		"duration": req.Duration,
	}

	_, err = tx.Run(createQuery, createVars)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	if err := tx.Commit(); err != nil {
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

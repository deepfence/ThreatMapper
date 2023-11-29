package handler

import (
	"encoding/json"
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
	reportID := uuid.New().String()
	params := utils.ReportParams{
		ReportID:   reportID,
		ReportType: req.ReportType,
		Duration:   req.Duration,
		Filters:    req.Filters,
	}

	worker, err := directory.Worker(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
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

	query := `
	CREATE (n:Report{created_at:TIMESTAMP(), type:$type, report_id:$uid, status:$status, filters:$filters, duration:$duration})
	RETURN n`
	vars := map[string]interface{}{
		"type":     req.ReportType,
		"uid":      reportID,
		"status":   utils.ScanStatusStarting,
		"filters":  req.Filters.String(),
		"duration": req.Duration,
	}

	_, err = tx.Run(query, vars)
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

	err = httpext.JSON(w, http.StatusOK, model.GenerateReportResp{ReportID: reportID})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

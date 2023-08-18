package handler

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/go-playground/locales/en"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	en_translations "github.com/go-playground/validator/v10/translations/en"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
)

func (h *Handler) DeleteReport(w http.ResponseWriter, r *http.Request) {

	var req model.ReportReq
	req.ReportID = chi.URLParam(r, "report_id")
	if err := h.Validator.Struct(req); err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}

	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer tx.Close()

	vars := map[string]interface{}{"uid": req.ReportID}

	getQuery := `MATCH (n:Report{report_id:$uid}) RETURN n`
	result, err := tx.Run(getQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	records, err := result.Single()
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	i, ok := records.Get("n")
	if !ok {
		respondError(&ingesters.NodeNotFoundError{NodeId: req.ReportID}, w)
		return
	}
	da, ok := i.(dbtype.Node)
	if !ok {
		respondError(&ingesters.NodeNotFoundError{NodeId: req.ReportID}, w)
		return
	}

	var report model.ExportReport
	utils.FromMap(da.Props, &report)

	// upload file to minio
	mc, err := directory.MinioClient(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to get minio client")
		respondError(err, w)
		return
	}

	// skip report file delete, in case of error we don't save the file
	if report.Status != utils.SCAN_STATUS_FAILED {
		err = mc.DeleteFile(r.Context(), report.StoragePath, false, minio.RemoveObjectOptions{ForceDelete: true})
		if err != nil {
			respondError(err, w)
			return
		}
	}

	deleteQuery := `MATCH (n:Report{report_id:$uid}) DELETE n`
	_, err = tx.Run(deleteQuery, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}
	if err := tx.Commit(); err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_REPORTS, ACTION_DELETE, req, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetReport(w http.ResponseWriter, r *http.Request) {

	var req model.ReportReq
	req.ReportID = chi.URLParam(r, "report_id")
	if err := h.Validator.Struct(req); err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}
	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer tx.Close()

	query := `MATCH (n:Report{report_id:$uid}) RETURN n`
	vars := map[string]interface{}{"uid": req.ReportID}
	result, err := tx.Run(query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	records, err := result.Single()
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	i, ok := records.Get("n")
	if !ok {
		respondError(&ingesters.NodeNotFoundError{NodeId: req.ReportID}, w)
		return
	}
	da, ok := i.(dbtype.Node)
	if !ok {
		respondError(&ingesters.NodeNotFoundError{NodeId: req.ReportID}, w)
		return
	}

	var report model.ExportReport
	utils.FromMap(da.Props, &report)

	httpext.JSON(w, http.StatusOK, report)
}

func (h *Handler) ListReports(w http.ResponseWriter, r *http.Request) {

	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer tx.Close()

	query := `MATCH (n:Report) RETURN n`
	result, err := tx.Run(query, map[string]interface{}{})
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	records, err := result.Collect()
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
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
	sort.Slice(reports[:], func(i, j int) bool {
		return reports[i].CreatedAt > reports[j].CreatedAt
	})

	httpext.JSON(w, http.StatusOK, reports)
}

func (h *Handler) GenerateReport(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.GenerateReportReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(&BadDecoding{err}, w)
		return
	}

	en := en.New()
	uni := ut.New(en, en)
	// this is usually know or extracted from http 'Accept-Language' header
	// also see uni.FindTranslator(...)
	trans, _ := uni.GetTranslator("en")
	en_translations.RegisterDefaultTranslations(h.Validator, trans)
	log.Info().Msg("Translating Required validator")
	h.Validator.RegisterTranslation("required", trans, func(ut ut.Translator) error {
		log.Info().Msg("Reached Required override")
		return ut.Add("required", "{0} is required", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		log.Info().Msgf("Reached Required translate for %s", fe.Field())
		t, _ := ut.T("required", fe.Field())
		return t
	})
	log.Info().Msg("Translating Enum validator")
	h.Validator.RegisterTranslation("enum", trans, func(ut ut.Translator) error {
		log.Info().Msg("Reached Enum override")
		return ut.Add("enum", "{0} must be one of {1}", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		log.Info().Msgf("Reached Enum translate for %s with values %s", fe.Field(), fe.ActualTag())
		t, _ := ut.T("enum", fe.Field(), fe.ActualTag())
		return t
	})

	if err := h.Validator.Struct(req); err != nil {
		log.Error().Msgf("Validation Error: %+v", err)
		errs := err.(validator.ValidationErrors)
		log.Info().Msgf("Translations %+v", errs.Translate(trans))
		for _, e := range errs {
			// can translate each error one at a time.
			log.Info().Msg(e.Translate(trans))
		}
		respondError(&ValidatorError{err: err, messages: errs.Translate(trans)}, w)
		return
	}

	// report task params
	report_id := uuid.New().String()
	params := utils.ReportParams{
		ReportID:   report_id,
		ReportType: req.ReportType,
		Duration:   req.Duration,
		Filters:    req.Filters,
	}

	namespace, err := directory.ExtractNamespace(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	driver, err := directory.Neo4jClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(directory.ErrNamespaceNotFound, w)
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}
	defer tx.Close()

	query := `
	CREATE (n:Report{created_at:TIMESTAMP(), type:$type, report_id:$uid, status:$status, filters:$filters, duration:$duration})
	RETURN n`
	vars := map[string]interface{}{
		"type":     req.ReportType,
		"uid":      report_id,
		"status":   utils.SCAN_STATUS_STARTING,
		"filters":  req.Filters.String(),
		"duration": req.Duration,
	}

	_, err = tx.Run(query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}
	if err := tx.Commit(); err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	// create a task message
	msg := message.NewMessage(watermill.NewUUID(), payload)
	msg.Metadata = map[string]string{
		directory.NamespaceKey: string(namespace),
		"report_type":          req.ReportType,
	}
	msg.SetContext(directory.NewContextWithNameSpace(namespace))
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err = h.TasksPublisher.Publish(utils.ReportGeneratorTask, msg)
	if err != nil {
		log.Error().Msgf("failed to publish task: %+v", err)
		respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_REPORTS, ACTION_CREATE, req, true)

	httpext.JSON(w, http.StatusOK, model.GenerateReportResp{ReportID: report_id})
}

package handler

import (
	"encoding/json"
	"net/http"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func (h *Handler) DeleteReport(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) ListReports(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) GetReport(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
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

	tx, err := session.BeginTransaction()
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

	httpext.JSON(w, http.StatusOK, model.GenerateReportResp{ReportID: report_id})
}

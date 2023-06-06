package handler

import (
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	agentdiagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/agent-diagnosis"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) DiagnosticNotification(w http.ResponseWriter, r *http.Request) {

}

func (h *Handler) GenerateConsoleDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.GenerateConsoleDiagnosticLogsRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}
	err = h.ConsoleDiagnosis.GenerateDiagnosticLogs(r.Context(), strconv.Itoa(req.Tail))
	if err != nil {
		respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_SETTINGS, ACTION_LOGS, nil, true)

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) UpdateAgentDiagnosticLogsStatus(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.DiagnosticLogsStatus
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	req.NodeID = chi.URLParam(r, "node_id")
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}
	err = agentdiagnosis.UpdateAgentDiagnosticLogsStatus(r.Context(), req)
	if err != nil {
		respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GenerateAgentDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.GenerateAgentDiagnosticLogsRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}
	err = agentdiagnosis.GenerateAgentDiagnosticLogs(r.Context(), req.NodeIds, strconv.Itoa(req.Tail))
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}

	h.AuditUserActivity(r, EVENT_SETTINGS, ACTION_LOGS, nil, true)

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) GetDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	resp, err := diagnosis.GetDiagnosticLogs(r.Context())
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	httpext.JSON(w, http.StatusOK, resp)
}

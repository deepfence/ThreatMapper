package handler

import (
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	agentdiagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/agent-diagnosis"
	cloudscannerdiagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/cloudscanner-diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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
		h.respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	err = h.ConsoleDiagnosis.GenerateDiagnosticLogs(r.Context(), strconv.Itoa(req.Tail))
	if err != nil {
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventSettings, ActionLogs, nil, true)

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) UpdateAgentDiagnosticLogsStatus(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.DiagnosticLogsStatus
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	req.NodeID = chi.URLParam(r, "node_id")
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	err = agentdiagnosis.UpdateAgentDiagnosticLogsStatus(r.Context(), req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GenerateAgentDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.GenerateAgentDiagnosticLogsRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	err = agentdiagnosis.GenerateAgentDiagnosticLogs(r.Context(), req.NodeIds, strconv.Itoa(req.Tail))
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	h.AuditUserActivity(r, EventSettings, ActionLogs, nil, true)

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) GenerateCloudScannerDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.GenerateCloudScannerDiagnosticLogsRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	hostIDs, err := cloudscannerdiagnosis.GetHostIDs(r.Context(), req.NodeIds)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	err = agentdiagnosis.GenerateAgentDiagnosticLogs(r.Context(), hostIDs, strconv.Itoa(req.Tail))
	if err != nil {
		log.Error().Msgf("Error in GenerateAgentDiagnosticLogs: %s", err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	h.AuditUserActivity(r, EventSettings, ActionLogs, nil, true)

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) UpdateCloudScannerDiagnosticLogsStatus(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.DiagnosticLogsStatus
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	req.NodeID = chi.URLParam(r, "node_id")
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	err = cloudscannerdiagnosis.UpdateCloudScannerDiagnosticLogsStatus(r.Context(), req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	resp, err := diagnosis.GetDiagnosticLogs(r.Context(), h.GetHostURL(r))
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, resp)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

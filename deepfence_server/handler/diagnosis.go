package handler

import (
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) DiagnosticNotification(w http.ResponseWriter, r *http.Request) {

}

func (h *Handler) GenerateConsoleDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req diagnosis.GenerateDiagnosticLogsRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	err = h.ConsoleDiagnosis.GenerateDiagnosticLogs(strconv.Itoa(req.Tail))
	if err != nil {
		respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) GenerateAgentDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) GetDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
}

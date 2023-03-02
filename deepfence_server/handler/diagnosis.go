package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) DiagnosticNotification(w http.ResponseWriter, r *http.Request) {

}

func (h *Handler) GenerateConsoleDiagnosticLogs(w http.ResponseWriter, r *http.Request) {
	tail := chi.URLParam(r, "tail")
	_, err := strconv.Atoi(tail)
	if err != nil {
		respondError(err, w)
		return
	}
	err = h.ConsoleDiagnosis.GenerateDiagnosticLogs(tail)
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

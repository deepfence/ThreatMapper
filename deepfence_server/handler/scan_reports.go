package handler

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/rs/zerolog/log"
)

func (h *Handler) StartCVEScanHandler(w http.ResponseWriter, r *http.Request) {
	start_scan(w, r, ctl.StartCVEScan)
}

func (h *Handler) StartSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	start_scan(w, r, ctl.StartSecretScan)
}

func (h *Handler) StartComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	start_scan(w, r, ctl.StartComplianceScan)
}

func start_scan(w http.ResponseWriter, r *http.Request, action ctl.ActionID) {
	err := r.ParseForm()
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	node_id := r.Form.Get("node_id")
	if node_id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	ctx := directory.NewAccountContext()
	err = controls.SetAgentActions(ctx, node_id, []ctl.Action{
		{
			ID:             action,
			RequestPayload: nil,
		},
	})

	if err != nil {
		log.Error().Msgf("%v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Started")
}

func (h *Handler) IngestCVEReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCVEIngester()
	ingest_scan_report(w, r, ingester)
}

func (h *Handler) IngestSecretReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewSecretIngester()
	ingest_scan_report(w, r, ingester)
}

func (h *Handler) IngestComplianceReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewComplianceIngester()
	ingest_scan_report(w, r, ingester)
}

func (h *Handler) IngestCloudComplianceReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCloudComplianceIngester()
	ingest_scan_report(w, r, ingester)
}

func (h *Handler) IngestCloudResourcesReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCloudResourceIngester()
	ingest_scan_report(w, r, ingester)
}

func ingest_scan_report[T any](respWrite http.ResponseWriter, req *http.Request, ingester ingesters.Ingester[T]) {

	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
		return
	}
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		http.Error(respWrite, "Error reading request body", http.StatusInternalServerError)
		return
	}
	ctx := directory.NewAccountContext()

	var data T
	err = json.Unmarshal(body, &data)
	if err != nil {
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}
	ingester.Ingest(ctx, data)
	if err != nil {
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}

	respWrite.WriteHeader(http.StatusOK)
	fmt.Fprintf(respWrite, "Ok")
}

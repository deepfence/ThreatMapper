package handler

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/twmb/franz-go/pkg/kgo"
)

func scanId(req model.ScanTrigger) string {
	return fmt.Sprintf("%s-%d", req.NodeId, time.Now().Unix())
}

func (h *Handler) StartVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	action := ctl.Action{
		ID:             ctl.StartVulnerabilityScan,
		RequestPayload: "",
	}

	startScan(w, r, utils.NEO4J_VULNERABILTY_SCAN, scanId, req.NodeId, action)
}

func (h *Handler) StartSecretScanHandler(w http.ResponseWriter, r *http.Request) {

	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	binArgs := map[string]string{
		"scan_id":   scanId,
		"hostname":  req.NodeId,
		"node_type": ctl.ResourceTypeToString(req.ResourceType),
		"node_id":   req.NodeId,
	}

	internal_req := ctl.StartSecretScanRequest{
		ResourceId:   req.ResourceId,
		ResourceType: req.ResourceType,
		BinArgs:      binArgs,
		Hostname:     req.NodeId,
	}

	b, err := json.Marshal(internal_req)
	bstr := string(b)

	action := ctl.Action{
		ID:             ctl.StartSecretScan,
		RequestPayload: bstr,
	}

	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
		return
	}

	startScan(w, r, utils.NEO4J_SECRET_SCAN, scanId, req.NodeId, action)
}

func (h *Handler) StartComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	action := ctl.Action{
		ID:             ctl.StartComplianceScan,
		RequestPayload: "",
	}

	startScan(w, r, utils.NEO4J_COMPLIANCE_SCAN, scanId, req.NodeId, action)
}

func (h *Handler) StartMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	action := ctl.Action{
		ID:             ctl.StartMalwareScan,
		RequestPayload: "",
	}

	startScan(w, r, utils.NEO4J_MALWARE_SCAN, scanId, req.NodeId, action)
}

func (h *Handler) StopVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	stopScan(w, r, ctl.StartVulnerabilityScan)
}

func (h *Handler) StopSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	stopScan(w, r, ctl.StartSecretScan)
}

func (h *Handler) StopComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	stopScan(w, r, ctl.StartComplianceScan)
}

func (h *Handler) StopMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	stopScan(w, r, ctl.StartMalwareScan)
}

func startScan(
	w http.ResponseWriter, r *http.Request,
	scanType utils.Neo4jScanType,
	scanId string, nodeId string,
	action ctl.Action) {

	err := ingesters.AddNewScan(r.Context(), scanType, scanId, nodeId, action)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Data: err})
		return
	}

	if err != nil {
		log.Error().Msgf("%v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.ScanTriggerResp{ScanId: scanId})
	if err != nil {
		log.Error().Msg(err.Error())
	}
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

	ctx := req.Context()

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

func (h *Handler) IngestVulnerabilityReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewVulnerabilityIngester()
	ingest_scan_report_kafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestSecretReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewSecretIngester()
	ingest_scan_report_kafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestSecretScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewSecretScanStatusIngester()
	ingest_scan_report_kafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestComplianceReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewComplianceIngester()
	ingest_scan_report_kafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestCloudComplianceReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCloudComplianceIngester()
	ingest_scan_report_kafka(w, r, ingester, h.IngestChan)
}

func ingest_scan_report_kafka[T any](
	respWrite http.ResponseWriter,
	req *http.Request,
	ingester ingesters.KafkaIngester[T],
	ingestChan chan *kgo.Record) {

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

	ctx := req.Context()

	var data T
	err = json.Unmarshal(body, &data)
	if err != nil {
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}
	err = ingester.Ingest(ctx, data, ingestChan)
	if err != nil {
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}

	respWrite.WriteHeader(http.StatusOK)
	fmt.Fprintf(respWrite, "Ok")
}

func stopScan(w http.ResponseWriter, r *http.Request, action ctl.ActionID) {
	//	Stopping scan is on best-effort basis, not guaranteed
}

func extractScanTrigger(w http.ResponseWriter, r *http.Request) (model.ScanTrigger, error) {
	defer r.Body.Close()
	var req model.ScanTrigger
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
	}
	return req, err
}

func (h *Handler) StatusVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	//	Get status of scan
}

func (h *Handler) StatusSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	status, err := reporters.GetSecretScanStatus(r.Context(), req.ScanId)

	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}

	httpext.JSON(w, http.StatusOK, model.Response{Success: true, Data: status})
}

func (h *Handler) StatusComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	//	Get status of scan
}

func (h *Handler) StatusMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	//	Get status of scan
}

package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/gorilla/schema"
	"github.com/minio/minio-go/v7"
	"github.com/twmb/franz-go/pkg/kgo"
)

func scanId(req model.ScanTriggerReq) string {
	return fmt.Sprintf("%s-%d", req.NodeId, time.Now().Unix())
}

func (h *Handler) StartVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	binArgs := map[string]string{
		"scan_id":   scanId,
		"hostname":  req.NodeId,
		"node_type": req.ResourceType,
		"node_id":   req.ResourceId,
	}

	internal_req := ctl.StartSecretScanRequest{
		ResourceId:   req.ResourceId,
		ResourceType: ctl.StringToResourceType(req.ResourceType),
		BinArgs:      binArgs,
		Hostname:     req.NodeId,
	}

	b, err := json.Marshal(internal_req)
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
		return
	}

	action := ctl.Action{
		ID:             ctl.StartVulnerabilityScan,
		RequestPayload: string(b),
	}

	startScan(w, r, utils.NEO4J_VULNERABILITY_SCAN, scanId, req.NodeId, action)
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
		"node_type": req.ResourceType,
		"node_id":   req.NodeId,
	}

	internal_req := ctl.StartSecretScanRequest{
		ResourceId:   req.ResourceId,
		ResourceType: ctl.StringToResourceType(req.ResourceType),
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
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Data: err.Error()})
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

var decoder = schema.NewDecoder()

func (h *Handler) IngestSbomHandler(w http.ResponseWriter, r *http.Request) {
	namespace, err := directory.ExtractNamespace(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}
	var params utils.SbomQueryParameters
	err = decoder.Decode(&params, r.URL.Query())
	// err = httpext.DecodeQueryParams(r, &params)
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}
	log.Info().Msgf("sbom query parameters: %v", params)
	sbom, err := io.ReadAll(r.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}
	mc, err := directory.MinioClient(directory.NewGlobalContext())
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}

	err = mc.MakeBucket(r.Context(), string(namespace),
		minio.MakeBucketOptions{ObjectLocking: false})
	if err != nil {
		log.Error().Msg(err.Error())
	}
	file := string(namespace) + "/sbom/" + utils.ScanIdReplacer.Replace(params.ScanId) + ".json"
	info, err := mc.PutObject(r.Context(), string(namespace), file,
		bytes.NewReader(sbom), int64(len(sbom)),
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}

	params.SBOMFilePath = file
	params.Bucket = string(namespace)

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}

	msg := message.NewMessage(watermill.NewUUID(), payload)
	msg.Metadata = map[string]string{directory.NamespaceKey: string(namespace)}
	// msg.SetContext(directory.NewContextWithNameSpace(namespace))
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err = h.TasksPublisher.Publish("tasks_parse_sbom", msg)
	if err != nil {
		log.Error().Msgf("cannot publish message:", err)
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}

	log.Info().Msgf("scan_id: %s, minio file info: %+v", params.ScanId, info)
	httpext.JSON(w, http.StatusOK,
		model.Response{Success: true, Message: info.Location})
}

func (h *Handler) IngestVulnerabilityReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewVulnerabilityIngester()
	ingest_scan_report_kafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestVulnerabilityScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewVulnerabilityStatusIngester()
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

func extractScanTrigger(w http.ResponseWriter, r *http.Request) (model.ScanTriggerReq, error) {
	defer r.Body.Close()
	var req model.ScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return req, err
	}

	if ctl.StringToResourceType(req.ResourceType) == -1 {
		err = fmt.Errorf("Unknown ResourceType: %s", req.ResourceType)
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, Data: err.Error()})
	}

	return req, err
}

func (h *Handler) StatusVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) StatusSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) StatusComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) StatusMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_MALWARE_SCAN)
}

func statusScanHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeQueryParams(r, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}

	status, err := reporters.GetScanStatus(r.Context(), scan_type, req.ScanId)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
		return
	}

	httpext.JSON(w, http.StatusOK, status)
}

func (h *Handler) ListVulnerabilityScansHandler(w http.ResponseWriter, r *http.Request) {
	listScansHandler(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) ListSecretScansHandler(w http.ResponseWriter, r *http.Request) {
	listScansHandler(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) ListComplianceScansHandler(w http.ResponseWriter, r *http.Request) {
	listScansHandler(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) ListMalwareScansHandler(w http.ResponseWriter, r *http.Request) {
	listScansHandler(w, r, utils.NEO4J_MALWARE_SCAN)
}

func listScansHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}

	infos, err := reporters.GetScansList(r.Context(), scan_type, req.NodeId, req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
		return
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func (h *Handler) ListVulnerabilityScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	listScanResultsHandler(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) ListSecretScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	listScanResultsHandler(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) ListComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	listScanResultsHandler(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) ListMalwareScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	listScanResultsHandler(w, r, utils.NEO4J_MALWARE_SCAN)
}

func listScanResultsHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanResultsReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}

	results, err := reporters.GetScanResults(r.Context(), scan_type, req.ScanId, req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
		return
	}

	httpext.JSON(w, http.StatusOK, results)
}

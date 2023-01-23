package handler

import (
	"context"
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
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/gorilla/schema"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/twmb/franz-go/pkg/kgo"
)

func scanId(req model.ScanTriggerReq) string {
	return fmt.Sprintf("%s-%d", req.NodeId, time.Now().Unix())
}

func GetImageFromId(ctx context.Context, node_id string) (string, string, error) {
	var name string
	var tag string

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return name, tag, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return name, tag, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return name, tag, err
	}
	defer tx.Close()

	query := "MATCH (n:ContainerImage{node_id:$node_id}) return  n.docker_image_name,n.docker_image_tag"
	res, err := tx.Run(query, map[string]interface{}{"node_id": node_id})
	if err != nil {
		return name, tag, err
	}

	rec, err := res.Single()
	if err != nil {
		return name, tag, err
	}

	name = rec.Values[0].(string)
	tag = rec.Values[1].(string)

	return name, tag, nil
}

func (h *Handler) StartVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	binArgs := map[string]string{
		"scan_id":   scanId,
		"node_type": req.NodeType,
		"node_id":   req.NodeId,
	}

	nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

	if nodeTypeInternal == ctl.Image {
		name, tag, err := GetImageFromId(r.Context(), req.NodeId)
		if err != nil {
			log.Error().Msg(err.Error())
			httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
			return
		}
		binArgs["image_name"] = name + ":" + tag
		log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["image_name"])
	}

	internal_req := ctl.StartVulnerabilityScanRequest{
		NodeId:   req.NodeId,
		NodeType: nodeTypeInternal,
		BinArgs:  binArgs,
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

	startScan(w, r, utils.NEO4J_VULNERABILITY_SCAN, scanId, ctl.StringToResourceType(req.NodeType), req.NodeId, action)
}

func (h *Handler) StartSecretScanHandler(w http.ResponseWriter, r *http.Request) {

	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	binArgs := map[string]string{
		"scan_id":   scanId,
		"node_type": req.NodeType,
		"node_id":   req.NodeId,
	}

	nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

	if nodeTypeInternal == ctl.Image {
		name, tag, err := GetImageFromId(r.Context(), req.NodeId)
		if err != nil {
			log.Error().Msg(err.Error())
			httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
			return
		}
		binArgs["node_id"] = fmt.Sprintf("%s;%s", req.NodeId, name+":"+tag)
		log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["node_id"])
	}

	internal_req := ctl.StartSecretScanRequest{
		NodeId:   req.NodeId,
		NodeType: ctl.StringToResourceType(req.NodeType),
		BinArgs:  binArgs,
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

	startScan(w, r, utils.NEO4J_SECRET_SCAN, scanId, ctl.StringToResourceType(req.NodeType), req.NodeId, action)
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

	startScan(w, r, utils.NEO4J_COMPLIANCE_SCAN, scanId,
		ctl.StringToResourceType(req.NodeType), req.NodeId,
		action)
}

func (h *Handler) StartMalwareScanHandler(w http.ResponseWriter, r *http.Request) {

	req, err := extractScanTrigger(w, r)
	if err != nil {
		return
	}

	scanId := scanId(req)

	binArgs := map[string]string{
		"scan_id":   scanId,
		"node_type": req.NodeType,
		"node_id":   req.NodeId,
	}

	nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

	if nodeTypeInternal == ctl.Image {
		name, tag, err := GetImageFromId(r.Context(), req.NodeId)
		if err != nil {
			log.Error().Msg(err.Error())
			httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
			return
		}
		binArgs["node_id"] = fmt.Sprintf("%s;%s", req.NodeId, name+":"+tag)
		log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["node_id"])
	}

	internal_req := ctl.StartMalwareScanRequest{
		NodeId:   req.NodeId,
		NodeType: ctl.StringToResourceType(req.NodeType),
		BinArgs:  binArgs,
	}

	b, err := json.Marshal(internal_req)
	bstr := string(b)

	action := ctl.Action{
		ID:             ctl.StartMalwareScan,
		RequestPayload: bstr,
	}

	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
		return
	}

	startScan(w, r, utils.NEO4J_MALWARE_SCAN, scanId, ctl.StringToResourceType(req.NodeType), req.NodeId, action)

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
	scanId string,
	nodeType ctl.ScanResource,
	nodeId string,
	action ctl.Action) {

	err := ingesters.AddNewScan(r.Context(), scanType, scanId, nodeType, nodeId, action)
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
	var params utils.SbomQueryParameters
	err := decoder.Decode(&params, r.URL.Query())
	// err = httpext.DecodeQueryParams(r, &params)
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}
	log.Info().Msgf("sbom query parameters: %+v", params)
	sbom, err := io.ReadAll(r.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}
	mc, err := directory.MinioClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}

	file := "/sbom/" + utils.ScanIdReplacer.Replace(params.ScanId) + ".json"
	info, err := mc.UploadFile(r.Context(), file, sbom,
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}

	params.SBOMFilePath = file

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}

	msg := message.NewMessage(watermill.NewUUID(), payload)
	namespace, err := directory.ExtractNamespace(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		httpext.JSON(w, http.StatusInternalServerError,
			model.Response{Success: false, Message: err.Error()})
		return
	}
	msg.Metadata = map[string]string{directory.NamespaceKey: string(namespace)}
	// msg.SetContext(directory.NewContextWithNameSpace(namespace))
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err = h.TasksPublisher.Publish(utils.ParseSBOMTask, msg)
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

func (h *Handler) IngestMalwareReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewMalwareIngester()
	ingest_scan_report_kafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestMalwareScanStatusReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewMalwareScanStatusIngester()
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

	if ctl.StringToResourceType(req.NodeType) == -1 {
		err = fmt.Errorf("Unknown ResourceType: %s", req.NodeType)
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

	infos, err := reporters.GetScansList(r.Context(), scan_type, req.NodeId, controls.StringToResourceType(req.NodeType), req.Window)
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

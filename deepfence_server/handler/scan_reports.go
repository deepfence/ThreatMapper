package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/controls"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/twmb/franz-go/pkg/kgo"
)

const MaxSbomRequestSize = 500 * 1e6

func scanId(req model.ScanTrigger) string {
	return fmt.Sprintf("%s-%d", req.NodeId, time.Now().Unix())
}

func bulkScanId() string {
	random_id := uuid.New()
	return fmt.Sprintf("%s", random_id.String())
}

func cloudComplianceScanId(req model.CloudComplianceScanTrigger) string {
	return fmt.Sprintf("%s-%s-%d", req.NodeId, req.BenchmarkType, time.Now().Unix())
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

	res, err := tx.Run(`
		MATCH (n:ContainerImage{node_id:$node_id})
		RETURN  n.docker_image_name, n.docker_image_tag`,
		map[string]interface{}{"node_id": node_id})
	if err != nil {
		return name, tag, err
	}

	rec, err := res.Single()
	if err != nil {
		return name, tag, err
	}

	if vi, ok := rec.Get("n.docker_image_name"); ok && vi != nil {
		name = vi.(string)
	}
	if vt, ok := rec.Get("n.docker_image_tag"); ok && vt != nil {
		tag = vt.(string)
	}

	return name, tag, nil
}

func (h *Handler) StartVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.VulnerabilityScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	actionBuilder := func(scanId string, req model.ScanTrigger) (ctl.Action, error) {
		binArgs := map[string]string{
			"scan_id":   scanId,
			"node_type": req.NodeType,
			"node_id":   req.NodeId,
		}

		if len(reqs.ScanConfig) != 0 {
			binArgs["scan_type"] = reqs.ScanConfig
		}

		nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

		if nodeTypeInternal == ctl.Image {
			name, tag, err := GetImageFromId(r.Context(), req.NodeId)
			if err != nil {
				log.Error().Msgf("image not found %s", err.Error())
			} else {
				binArgs["image_name"] = name + ":" + tag
				log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["image_name"])
			}
		}

		internal_req := ctl.StartVulnerabilityScanRequest{
			NodeId:   req.NodeId,
			NodeType: nodeTypeInternal,
			BinArgs:  binArgs,
		}

		b, err := json.Marshal(internal_req)
		if err != nil {
			return ctl.Action{}, err
		}

		return ctl.Action{
			ID:             ctl.StartVulnerabilityScan,
			RequestPayload: string(b),
		}, nil
	}

	scan_ids, bulkId, err := startMultiScan(r.Context(), utils.NEO4J_VULNERABILITY_SCAN, reqs.ScanTriggers, actionBuilder)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.ScanTriggerResp{ScanIds: scan_ids, BulkScanId: bulkId})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) StartSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.SecretScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	actionBuilder := func(scanId string, req model.ScanTrigger) (ctl.Action, error) {
		binArgs := map[string]string{
			"scan_id":   scanId,
			"node_type": req.NodeType,
			"node_id":   req.NodeId,
		}

		nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

		if nodeTypeInternal == ctl.Image {
			name, tag, err := GetImageFromId(r.Context(), req.NodeId)
			if err != nil {
				return ctl.Action{}, err
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
		if err != nil {
			return ctl.Action{}, err
		}

		return ctl.Action{
			ID:             ctl.StartSecretScan,
			RequestPayload: bstr,
		}, nil
	}

	scan_ids, bulkId, err := startMultiScan(r.Context(), utils.NEO4J_SECRET_SCAN, reqs.ScanTriggers, actionBuilder)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.ScanTriggerResp{ScanIds: scan_ids, BulkScanId: bulkId})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) StartComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqq model.ComplianceScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqq)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	//TODO
	//for _, req := range reqq.ScanTriggers {
	//	scanId := scanId(req)

	//	action := ctl.Action{
	//		ID:             ctl.StartComplianceScan,
	//		RequestPayload: "",
	//	}

	//	startScan(w, r, utils.NEO4J_COMPLIANCE_SCAN, scanId,
	//		ctl.StringToResourceType(req.NodeType), req.NodeId,
	//		action)
	//}
}

func (h *Handler) StartCloudComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.CloudComplianceScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	scanIds, bulkId, err := startMultiCloudComplianceScan(r.Context(), reqs.ScanTriggers)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.ScanTriggerResp{ScanIds: scanIds, BulkScanId: bulkId})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) StartMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.ComplianceScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	actionBuilder := func(scanId string, req model.ScanTrigger) (ctl.Action, error) {
		binArgs := map[string]string{
			"scan_id":   scanId,
			"node_type": req.NodeType,
			"node_id":   req.NodeId,
		}

		nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

		if nodeTypeInternal == ctl.Image {
			name, tag, err := GetImageFromId(r.Context(), req.NodeId)
			if err != nil {
				return ctl.Action{}, err
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
		if err != nil {
			return ctl.Action{}, err
		}

		return ctl.Action{
			ID:             ctl.StartMalwareScan,
			RequestPayload: bstr,
		}, nil
	}

	scan_ids, bulkId, err := startMultiScan(r.Context(), utils.NEO4J_MALWARE_SCAN, reqs.ScanTriggers, actionBuilder)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.ScanTriggerResp{ScanIds: scan_ids, BulkScanId: bulkId})
	if err != nil {
		log.Error().Msg(err.Error())
	}
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
	body, err := io.ReadAll(req.Body)
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

func (h *Handler) IngestSbomHandler(w http.ResponseWriter, r *http.Request) {
	var params utils.SbomRequest
	err := httpext.DecodeJSON(r, httpext.QueryParams, MaxSbomRequestSize, &params)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}

	if params.ScanId == "" {
		log.Error().Msgf("error scan id is empty, params: %+v", params)
		httpext.JSON(w, http.StatusBadRequest,
			model.ErrorResponse{Message: "scan_id is required to process sbom"})
		return
	}

	mc, err := directory.MinioClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	file := "/sbom/" + utils.ScanIdReplacer.Replace(params.ScanId) + ".json"
	info, err := mc.UploadFile(r.Context(), file, []byte(params.SBOM),
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	params.SBOMFilePath = file

	payload, err := json.Marshal(params.SbomParameters)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	msg := message.NewMessage(watermill.NewUUID(), payload)
	namespace, err := directory.ExtractNamespace(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}
	msg.Metadata = map[string]string{directory.NamespaceKey: string(namespace)}
	// msg.SetContext(directory.NewContextWithNameSpace(namespace))
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err = h.TasksPublisher.Publish(utils.ParseSBOMTask, msg)
	if err != nil {
		log.Error().Msgf("cannot publish message:", err)
		respondError(err, w)
		return
	}

	log.Info().Msgf("scan_id: %s, minio file info: %+v", params.ScanId, info)
	httpext.JSON(w, http.StatusOK, info)
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

func (h *Handler) IngestMalwareScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewMalwareScanStatusIngester()
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

func (h *Handler) IngestCloudComplianceScanStatusReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCloudComplianceScanStatusIngester()
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
	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(respWrite, "Error reading request body", http.StatusInternalServerError)
		return
	}

	ctx := req.Context()

	var data T
	err = json.Unmarshal(body, &data)
	if err != nil {
		log.Error().Msgf("Error while unmarshalling data %+v %s", err, string(body))
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}
	err = ingester.Ingest(ctx, data, ingestChan)
	if err != nil {
		log.Error().Msgf("Error while ingesting data %+v %+v", err, data)
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}

	// respWrite.WriteHeader(http.StatusOK)
	// fmt.Fprint(respWrite, "Ok")
	httpext.JSON(respWrite, http.StatusOK, map[string]string{"status": "ok"})
}

func stopScan(w http.ResponseWriter, r *http.Request, action ctl.ActionID) {
	//	Stopping scan is on best-effort basis, not guaranteed
}

func extractCloudComplianceScanTrigger(w http.ResponseWriter, r *http.Request) (model.CloudComplianceScanTriggerReq, error) {
	defer r.Body.Close()
	var req model.CloudComplianceScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return req, err
	}

	// TODO: Add benchmarkType check here
	//if ctl.StringToResourceType(req.BenchmarkType) == -1 {
	//	err = fmt.Errorf("Unknown ResourceType: %s", req.NodeType)
	//	log.Error().Msgf("%v", err)
	//	httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, Data: err.Error()})
	//}

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

func (h *Handler) StatusCloudComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
}

func statusScanHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeQueryParams(r, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	var statuses model.ScanStatusResp
	if req.BulkScanId != "" {
		statuses, err = reporters.GetBulkScans(r.Context(), scan_type, req.BulkScanId)
	} else {
		statuses, err = reporters.GetScanStatus(r.Context(), scan_type, req.ScanIds)
	}

	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, statuses)
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

func (h *Handler) ListCloudComplianceScansHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudComplianceScanListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	infos, err := reporters.GetCloudComplianceScansList(r.Context(), utils.NEO4J_CLOUD_COMPLIANCE_SCAN, req.NodeId, req.BenchmarkType, req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func listScansHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	infos, err := reporters.GetScansList(r.Context(), scan_type, req.NodeId, controls.StringToResourceType(req.NodeType), req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func (h *Handler) ListVulnerabilityScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Vulnerability](w, r, utils.NEO4J_VULNERABILITY_SCAN)
	if err != nil {
		respondError(err, w)
		return
	}
	counts, err := reporters.GetSevCounts(r.Context(), utils.NEO4J_VULNERABILITY_SCAN, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.VulnerabilityScanResult{
		Vulnerabilities: entries, ScanResultsCommon: common, SeverityCounts: counts})
}

func (h *Handler) ListSecretScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Secret](w, r, utils.NEO4J_SECRET_SCAN)
	if err != nil {
		respondError(err, w)
		return
	}

	counts, err := reporters.GetSevCounts(r.Context(), utils.NEO4J_SECRET_SCAN, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.SecretScanResult{
		Secrets: entries, ScanResultsCommon: common, SeverityCounts: counts})
}

func (h *Handler) ListComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Compliance](w, r, utils.NEO4J_COMPLIANCE_SCAN)
	if err != nil {
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, model.ComplianceScanResult{Compliances: entries, ScanResultsCommon: common})
}

func (h *Handler) ListMalwareScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, model.MalwareScanResult{Malwares: entries, ScanResultsCommon: common})
}

func (h *Handler) ListCloudComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.CloudCompliance](w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, model.CloudComplianceScanResult{Compliances: entries, ScanResultsCommon: common})
}

func listScanResultsHandler[T any](w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) ([]T, model.ScanResultsCommon, error) {
	defer r.Body.Close()
	var req model.ScanResultsReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		return nil, model.ScanResultsCommon{}, &BadDecoding{err}
	}

	entries, common, err := reporters.GetScanResults[T](r.Context(), scan_type, req.ScanId, req.Window)
	if err != nil {
		return nil, model.ScanResultsCommon{}, err
	}
	common.ScanID = req.ScanId
	return entries, common, nil
}

func startMultiScan(ctx context.Context, scan_type utils.Neo4jScanType, reqs []model.ScanTrigger, actionBuilder func(string, model.ScanTrigger) (ctl.Action, error)) ([]string, string, error) {

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, "", err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, "", err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return nil, "", err
	}

	defer tx.Close()
	scanIds := []string{}
	for _, req := range reqs {
		scanId := scanId(req)

		action, err := actionBuilder(scanId, req)
		if err != nil {
			log.Error().Err(err)
			return nil, "", err
		}

		err = ingesters.AddNewScan(ingesters.WriteDBTransaction{Tx: tx},
			scan_type,
			scanId,
			ctl.StringToResourceType(req.NodeType),
			req.NodeId,
			action)

		if err != nil {
			log.Error().Err(err)
			return nil, "", err
		}
		scanIds = append(scanIds, scanId)
	}

	if len(scanIds) == 0 {
		return []string{}, "", nil
	}

	bulkId := bulkScanId()
	err = ingesters.AddBulkScan(ingesters.WriteDBTransaction{Tx: tx}, scan_type, bulkId, scanIds)
	if err != nil {
		log.Error().Msgf("%v", err)
		return nil, "", err
	}
	return scanIds, bulkId, tx.Commit()
}

func startMultiCloudComplianceScan(ctx context.Context, reqs []model.CloudComplianceScanTrigger) ([]string, string, error) {
	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, "", err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, "", err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return nil, "", err
	}

	defer tx.Close()
	scanIds := []string{}

	for _, req := range reqs {
		for _, benchmarkType := range req.BenchmarkTypes {
			scanId := cloudComplianceScanId(req)

			err = ingesters.AddNewCloudComplianceScan(ingesters.WriteDBTransaction{Tx: tx},
				scanId,
				benchmarkType,
				req.NodeId)

			if err != nil {
				log.Error().Err(err)
				return nil, "", err
			}
			scanIds = append(scanIds, scanId)
		}
	}

	if len(scanIds) == 0 {
		return []string{}, "", nil
	}

	var bulkId string

	bulkId = bulkScanId()
	err = ingesters.AddBulkScan(ingesters.WriteDBTransaction{Tx: tx}, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, bulkId, scanIds)
	if err != nil {
		log.Error().Msgf("%v", err)
		return nil, "", err
	}

	return scanIds, bulkId, tx.Commit()
}

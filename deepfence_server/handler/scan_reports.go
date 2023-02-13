package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"
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

func scanId(req model.NodeIdentifier) string {
	return fmt.Sprintf("%s-%d", req.NodeId, time.Now().Unix())
}

func cloudComplianceScanId(nodeId, benchmarkType string) string {
	return fmt.Sprintf("%s-%s-%d", nodeId, benchmarkType, time.Now().Unix())
}

func bulkScanId() string {
	random_id := uuid.New()
	return fmt.Sprintf("%s", random_id.String())
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

	actionBuilder := func(scanId string, req model.NodeIdentifier, registryId string) (ctl.Action, error) {
		binArgs := map[string]string{
			"scan_id":     scanId,
			"node_type":   req.NodeType,
			"node_id":     req.NodeId,
			"registry_id": registryId,
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

	scan_ids, bulkId, err := startMultiScan(r.Context(), true, utils.NEO4J_VULNERABILITY_SCAN, reqs.ScanTriggerCommon, actionBuilder)
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

	actionBuilder := func(scanId string, req model.NodeIdentifier, registryId string) (ctl.Action, error) {
		binArgs := map[string]string{
			"scan_id":     scanId,
			"node_type":   req.NodeType,
			"node_id":     req.NodeId,
			"registry_id": registryId,
		}

		nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

		if nodeTypeInternal == ctl.Image {
			name, tag, err := GetImageFromId(r.Context(), req.NodeId)
			if err != nil {
				return ctl.Action{}, err
			}
			binArgs["image_name"] = name + ":" + tag
			log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["image_name"])
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

	scan_ids, bulkId, err := startMultiScan(r.Context(), true, utils.NEO4J_SECRET_SCAN, reqs.ScanTriggerCommon, actionBuilder)
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
	var reqs model.ComplianceScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	ctx := r.Context()

	regular, k8s, _ := extractBulksNodes(reqs.NodeIds)

	cloudNodeIds, err := reporters.GetCloudAccountIDs(ctx, regular)
	if err != nil {
		respondError(errors.New(err.Error()), w)
		return
	}

	var nodes []model.NodeIdentifier
	if len(reqs.NodeIds) == 0 {
		nodes, err = FindNodesMatching(ctx,
			[]model.NodeIdentifier{},
			[]model.NodeIdentifier{},
			[]model.NodeIdentifier{},
			cloudNodeIds,
			k8s,
			reqs.Filters)
		if err != nil {
			respondError(err, w)
			return
		}
	} else {
		nodes = reqs.NodeIds
	}

	var scanTrigger model.NodeIdentifier
	if len(nodes) > 0 {
		scanTrigger = nodes[0]
	}

	var scanIds []string
	var bulkId string
	if scanTrigger.NodeType == controls.ResourceTypeToString(controls.CloudAccount) {
		scanIds, bulkId, err = startMultiCloudComplianceScan(ctx, nodes, reqs.BenchmarkTypes)
	} else {
		scanIds, bulkId, err = startMultiComplianceScan(ctx, nodes, reqs.BenchmarkTypes)
	}

	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	if len(scanIds) == 0 {
		respondError(errors.New("unable to spawn any new scans with the given criteria"), w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.ScanTriggerResp{ScanIds: scanIds, BulkScanId: bulkId})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) StartMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.MalwareScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	actionBuilder := func(scanId string, req model.NodeIdentifier, registryId string) (ctl.Action, error) {
		binArgs := map[string]string{
			"scan_id":     scanId,
			"node_type":   req.NodeType,
			"node_id":     req.NodeId,
			"registry_id": registryId,
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

	scan_ids, bulkId, err := startMultiScan(r.Context(), true, utils.NEO4J_MALWARE_SCAN, reqs.ScanTriggerCommon, actionBuilder)
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
	var params utils.ScanSbomRequest
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

	file := path.Join("/sbom/", utils.ScanIdReplacer.Replace(params.ScanId)+".json")
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
	msg.SetContext(directory.NewContextWithNameSpace(namespace))
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err = h.TasksPublisher.Publish(utils.ScanSBOMTask, msg)
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
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}
	err = ingester.Ingest(ctx, data, ingestChan)
	if err != nil {
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

func (h *Handler) StatusVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) StatusSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) StatusComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	complianceStatusScanHandler(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) StatusMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	statusScanHandler(w, r, utils.NEO4J_MALWARE_SCAN)
}

func (h *Handler) StatusCloudComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	complianceStatusScanHandler(w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
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

	if err == reporters.NotFoundErr {
		err = &NotFoundError{err}
	}

	if err != nil {
		log.Error().Msgf("%v, req=%s,%v", err, req.BulkScanId, req.ScanIds)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, statuses)
}

func complianceStatusScanHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeQueryParams(r, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	var statuses model.ComplianceScanStatusResp
	if req.BulkScanId != "" {
		statuses, err = reporters.GetComplianceBulkScans(r.Context(), scan_type, req.BulkScanId)
	} else {
		statuses, err = reporters.GetComplianceScanStatus(r.Context(), scan_type, req.ScanIds)
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
	if err == reporters.NotFoundErr {
		err = &NotFoundError{err}
	}
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

	counts, err := reporters.GetSevCounts(r.Context(), utils.NEO4J_MALWARE_SCAN, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.MalwareScanResult{Malwares: entries, ScanResultsCommon: common, SeverityCounts: counts})
}

func (h *Handler) ListCloudComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.CloudCompliance](w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		respondError(err, w)
		return
	}

	additionalInfo, err := reporters.GetCloudComplianceStats(r.Context(), common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.CloudComplianceScanResult{Compliances: entries, ScanResultsCommon: common,
		ComplianceAdditionalInfo: additionalInfo})
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

func fields_filter2cypher(node string, firstCond bool, fieldsFilter model.FieldsFilter) string {
	if len(fieldsFilter.FieldsValues) == 0 {
		return ""
	}
	res := ""
	if firstCond {
		res += " WHERE "
	} else {
		res += " AND "
	}
	strs := []string{}
	for _, fieldValue := range fieldsFilter.FieldsValues {
		if len(fieldValue.Values) > 0 {
			strs = append(strs, fmt.Sprintf("%s.%s IN ['%v']", node, fieldValue.Key, strings.Join(fieldValue.Values, "','")))
		}
	}

	return res + strings.Join(strs, " AND ")
}

func get_node_ids(tx neo4j.Transaction, ids []model.NodeIdentifier, neo4jNode controls.ScanResource, filter model.FieldsFilter) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	wherePattern := fields_filter2cypher("n", false, filter)
	if len(wherePattern) == 0 {
		return ids, nil
	}
	nres, err := tx.Run(fmt.Sprintf(`
		MATCH (n:%s)
		WHERE n.node_id IN $ids
		%s
		RETURN n.node_id`,
		controls.ResourceTypeToNeo4j(neo4jNode),
		wherePattern),
		map[string]interface{}{"ids": reporters.NodeIdentifierToIdList(ids)})
	if err != nil {
		return res, err
	}

	rec, err := nres.Collect()
	if err != nil {
		return res, err
	}

	for i := range rec {
		res = append(res, model.NodeIdentifier{
			NodeId:   rec[i].Values[0].(string),
			NodeType: controls.ResourceTypeToString(neo4jNode),
		})
	}
	return res, nil
}

func FindNodesMatching(ctx context.Context,
	host_ids []model.NodeIdentifier,
	image_ids []model.NodeIdentifier,
	container_ids []model.NodeIdentifier,
	cloud_account_ids []model.NodeIdentifier,
	kubernetes_cluster_ids []model.NodeIdentifier,
	filter model.ScanFilter) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	rh, err := get_node_ids(tx, host_ids, controls.Host, filter.HostScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rh...)
	ri, err := get_node_ids(tx, image_ids, controls.Image, filter.ImageScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, ri...)
	rc, err := get_node_ids(tx, container_ids, controls.Container, filter.ContainerScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rc...)
	rca, err := get_node_ids(tx, cloud_account_ids, controls.CloudAccount, filter.CloudAccountScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rca...)
	rk, err := get_node_ids(tx, kubernetes_cluster_ids, controls.KubernetesCluster, filter.KubernetesClusterScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rk...)

	return res, nil
}

func FindImageRegistryId(ctx context.Context, image_id string) (string, error) {
	res := ""

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (n:ContainerImage{node_id:$node_id})
		MATCH (m:RegistryAccount) -[:HOSTS]-> (n)
		RETURN m.container_registry_id
		LIMIT 1`,
		map[string]interface{}{"node_id": image_id})
	if err != nil {
		return res, err
	}

	rec, err := nres.Single()
	if err != nil {
		return res, nil
	}

	return fmt.Sprintf("%v", rec.Values[0]), nil
}

func extractBulksNodes(nodes []model.NodeIdentifier) (regularNodes []model.NodeIdentifier, clusterNodes []model.NodeIdentifier, registryNodes []model.NodeIdentifier) {
	regularNodes = []model.NodeIdentifier{}
	clusterNodes = []model.NodeIdentifier{}
	registryNodes = []model.NodeIdentifier{}

	for i := range nodes {
		if nodes[i].NodeType == controls.ResourceTypeToString(ctl.KubernetesCluster) {
			clusterNodes = append(clusterNodes, nodes[i])
		} else if nodes[i].NodeType == controls.ResourceTypeToString(ctl.RegistryAccount) {
			registryNodes = append(registryNodes, nodes[i])
		} else {
			regularNodes = append(regularNodes, nodes[i])
		}
	}

	return regularNodes, clusterNodes, registryNodes
}

func startMultiScan(ctx context.Context,
	gen_bulk_id bool,
	scan_type utils.Neo4jScanType,
	req model.ScanTriggerCommon,
	actionBuilder func(string, model.NodeIdentifier, string) (ctl.Action, error)) ([]string, string, error) {

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

	regular, k8s, registry := extractBulksNodes(req.NodeIds)

	image_nodes, err := reporters.GetRegistriesImageIDs(ctx, registry)
	if err != nil {
		return nil, "", err
	}

	k8s_host_nodes, err := reporters.GetKubernetesHostsIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	k8s_image_nodes, err := reporters.GetKubernetesImageIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	k8s_container_nodes, err := reporters.GetKubernetesContainerIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	reqs := regular
	if len(k8s) != 0 || len(registry) != 0 {
		reqs_extra, err := FindNodesMatching(ctx,
			k8s_host_nodes,
			append(image_nodes, k8s_image_nodes...),
			k8s_container_nodes,
			[]model.NodeIdentifier{},
			[]model.NodeIdentifier{},
			req.Filters)
		if err != nil {
			return nil, "", err
		}
		reqs = append(reqs, reqs_extra...)
	} else {
		reqs = req.NodeIds
	}

	defer tx.Close()
	scanIds := []string{}
	for _, req := range reqs {
		scanId := scanId(req)

		registryId := ""
		if req.NodeType == ctl.ResourceTypeToString(controls.Image) {
			registryId, err = FindImageRegistryId(ctx, req.NodeId)
			if err != nil {
				return nil, "", err
			}
		}

		action, err := actionBuilder(scanId, req, registryId)
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
			if e, is := err.(*ingesters.AlreadyRunningScanError); is {
				scanIds = append(scanIds, e.ScanId)
				continue
			}
			log.Error().Err(err)
			return nil, "", err
		}
		scanIds = append(scanIds, scanId)
	}

	if len(scanIds) == 0 {
		return []string{}, "", nil
	}

	var bulkId string
	if gen_bulk_id {
		bulkId = bulkScanId()
		err = ingesters.AddBulkScan(ingesters.WriteDBTransaction{Tx: tx}, scan_type, bulkId, scanIds)
		if err != nil {
			log.Error().Msgf("%v", err)
			return nil, "", err
		}
	}
	return scanIds, bulkId, tx.Commit()
}

func startMultiCloudComplianceScan(ctx context.Context, reqs []model.NodeIdentifier, benchmarkTypes []string) ([]string, string, error) {
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
		for _, benchmarkType := range benchmarkTypes {
			scanId := cloudComplianceScanId(req.NodeId, benchmarkType)

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

func startMultiComplianceScan(ctx context.Context, reqs []model.NodeIdentifier, benchmarkTypes []string) ([]string, string, error) {
	scanIds := []string{}
	bulkId := bulkScanId()
	for _, req := range reqs {
		for _, benchmarkType := range benchmarkTypes {
			scanIds = append(scanIds, cloudComplianceScanId(req.NodeId, benchmarkType))
		}
	}
	return scanIds, bulkId, nil
}

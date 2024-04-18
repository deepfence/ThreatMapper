package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reportersScan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/samber/lo"
	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	MaxSbomRequestSize      = 500 * 1e6
	DownloadReportURLExpiry = 5 * time.Minute
)

var (
	noNodesMatchedInNeo4jError = ValidatorError{
		err:                       errors.New("node_ids:nodes not found with the provided filters"),
		skipOverwriteErrorMessage: true,
	}
	errStartScan         = errors.New("unable to spawn any new scans with the given criteria")
	errIncorrectScanType = errors.New("unknown scan type")
)

func scanID(req model.NodeIdentifier) string {
	return fmt.Sprintf("%s-%d", req.NodeID, time.Now().Unix())
}

func cloudComplianceScanID(nodeID string) string {
	return fmt.Sprintf("%s-%d", nodeID, time.Now().Unix())
}

func bulkScanID() string {
	return uuid.New().String()
}

func GetImageFromID(ctx context.Context, nodeID string) (string, string, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-image-from-id")
	defer span.End()

	var name string
	var tag string

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return name, tag, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return name, tag, err
	}
	defer tx.Close(ctx)

	res, err := tx.Run(ctx, `
		MATCH (n:ContainerImage{node_id:$node_id})
		RETURN  n.docker_image_name, n.docker_image_tag`,
		map[string]interface{}{"node_id": nodeID})
	if err != nil {
		return name, tag, err
	}

	rec, err := res.Single(ctx)
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

func GetContainerKubeClusterNameFromID(ctx context.Context, nodeID string) (string, string, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-container-kube-cluster-name-from-id")
	defer span.End()

	var clusterID string
	var clusterName string

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return clusterID, clusterName, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return clusterID, clusterName, err
	}
	defer tx.Close(ctx)

	res, err := tx.Run(ctx, `
		MATCH (n:Container{node_id:$node_id})
		RETURN n.kubernetes_cluster_id, n.kubernetes_cluster_name`,
		map[string]interface{}{"node_id": nodeID})
	if err != nil {
		return clusterID, clusterName, err
	}

	rec, err := res.Single(ctx)
	if err != nil {
		return clusterID, clusterName, err
	}

	if vi, ok := rec.Get("n.kubernetes_cluster_id"); ok && vi != nil {
		clusterID = vi.(string)
	}
	if vt, ok := rec.Get("n.kubernetes_cluster_name"); ok && vt != nil {
		clusterName = vt.(string)
	}

	return clusterID, clusterName, nil
}

func StartScanActionBuilder(ctx context.Context, scanType controls.ActionID, additionalBinArgs map[string]string) func(string, model.NodeIdentifier, int32) (controls.Action, error) {
	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "start-scan-action-builder")
	defer span.End()

	return func(scanId string, req model.NodeIdentifier, registryId int32) (controls.Action, error) {
		registryIDStr := ""
		if registryId != -1 {
			registryIDStr = strconv.Itoa(int(registryId))
		}
		binArgs := map[string]string{
			"scan_id":     scanId,
			"node_type":   req.NodeType,
			"node_id":     req.NodeID,
			"registry_id": registryIDStr,
		}
		for k, v := range additionalBinArgs {
			binArgs[k] = v
		}

		nodeTypeInternal := controls.StringToResourceType(req.NodeType)

		if nodeTypeInternal == controls.Image {
			name, tag, err := GetImageFromID(ctx, req.NodeID)
			if err != nil {
				log.Error().Msgf("image not found %s", err.Error())
			} else {
				binArgs["image_name"] = name + ":" + tag
				log.Info().Msgf("node_id=%s image_name=%s", req.NodeID, binArgs["image_name"])
			}
			if tag == "" || tag == "<none>" {
				return controls.Action{}, errors.New("image tag not found")
			}
		}

		if nodeTypeInternal == controls.Container {
			clusterID, clusterName, err := GetContainerKubeClusterNameFromID(ctx, req.NodeID)
			if err != nil {
				log.Error().Msgf("container kube cluster name not found %s", err.Error())
			} else if len(clusterName) > 0 {
				binArgs["kubernetes_cluster_name"] = clusterName
				log.Info().Msgf("node_id=%s clusterName=%s clusterID=%s", req.NodeID, clusterName, clusterID)
			}
		}

		var internalReq interface{}

		switch scanType {
		case controls.StartVulnerabilityScan:
			internalReq = controls.StartVulnerabilityScanRequest{NodeID: req.NodeID, NodeType: nodeTypeInternal, BinArgs: binArgs}
		case controls.StartSecretScan:
			internalReq = controls.StartSecretScanRequest{NodeID: req.NodeID, NodeType: nodeTypeInternal, BinArgs: binArgs}
		case controls.StartMalwareScan:
			internalReq = controls.StartMalwareScanRequest{NodeID: req.NodeID, NodeType: nodeTypeInternal, BinArgs: binArgs}
		}

		b, err := json.Marshal(internalReq)
		if err != nil {
			return controls.Action{}, err
		}

		return controls.Action{ID: scanType, RequestPayload: string(b)}, nil
	}
}

func (h *Handler) StartVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.VulnerabilityScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	err = h.Validator.Struct(reqs)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	binArgs := make(map[string]string, 0)
	if len(reqs.ScanConfigLanguages) != 0 {
		languages := []string{}
		for i := range reqs.ScanConfigLanguages {
			err = h.Validator.Struct(reqs.ScanConfigLanguages[i])
			if err != nil {
				h.respondError(&ValidatorError{err: err}, w)
				return
			}
			languages = append(languages, reqs.ScanConfigLanguages[i].Language)
		}
		binArgs["scan_type"] = strings.Join(languages, ",")
	}

	actionBuilder := StartScanActionBuilder(r.Context(), controls.StartVulnerabilityScan, binArgs)

	scanIDs, bulkID, err := StartMultiScan(r.Context(), true, utils.NEO4JVulnerabilityScan, reqs.ScanTriggerCommon, actionBuilder)
	if err != nil {
		if err.Error() == "Result contains no more records" {
			h.respondError(&noNodesMatchedInNeo4jError, w)
			return
		}
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventVulnerabilityScan, ActionStart, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scanIDs, BulkScanID: bulkID})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) DiffAddVulnerabilityScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reportersScan.GetScanResultDiff[model.Vulnerability](r.Context(), utils.NEO4JVulnerabilityScan, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Vulnerability]{New: new})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) DiffAddSecretScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reportersScan.GetScanResultDiff[model.Secret](r.Context(), utils.NEO4JSecretScan, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Secret]{New: new})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) DiffAddComplianceScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reportersScan.GetScanResultDiff[model.Compliance](r.Context(), utils.NEO4JComplianceScan, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Compliance]{New: new})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) DiffAddMalwareScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reportersScan.GetScanResultDiff[model.Malware](r.Context(), utils.NEO4JMalwareScan, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Malware]{New: new})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) DiffAddCloudComplianceScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reportersScan.GetScanResultDiff[model.CloudCompliance](r.Context(), utils.NEO4JCloudComplianceScan, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.CloudCompliance]{New: new})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) StartSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.SecretScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	actionBuilder := StartScanActionBuilder(r.Context(), controls.StartSecretScan, nil)

	scanIDs, bulkID, err := StartMultiScan(r.Context(), true, utils.NEO4JSecretScan, reqs.ScanTriggerCommon, actionBuilder)
	if err != nil {
		if err.Error() == "Result contains no more records" {
			h.respondError(&noNodesMatchedInNeo4jError, w)
			return
		}
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventSecretScan, ActionStart, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scanIDs, BulkScanID: bulkID})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) StartComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.ComplianceScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	ctx := r.Context()

	regular, k8s, _, _ := extractBulksNodes(reqs.NodeIDs)

	cloudNodeIds, err := reportersScan.GetCloudAccountIDs(ctx, regular)
	if err != nil {
		h.respondError(err, w)
		return
	}

	var nodes []model.NodeIdentifier
	switch {
	case len(reqs.NodeIDs) == 0:
		nodes, err = FindNodesMatching(ctx,
			[]model.NodeIdentifier{},
			[]model.NodeIdentifier{},
			[]model.NodeIdentifier{},
			cloudNodeIds,
			k8s,
			reqs.Filters)
		if err != nil {
			h.respondError(err, w)
			return
		}
	case len(cloudNodeIds) > 0:
		nodes = cloudNodeIds
	default:
		nodes = reqs.NodeIDs
	}

	var scanTrigger model.NodeIdentifier
	if len(nodes) > 0 {
		scanTrigger = nodes[0]
	}

	if scanTrigger.NodeType == controls.ResourceTypeToString(controls.Image) ||
		scanTrigger.NodeType == controls.ResourceTypeToString(controls.Container) {
		h.respondError(&BadDecoding{errors.New("not supported")}, w)
		return
	}

	var scanIds []string
	var bulkID string
	var scanStatusType string
	if scanTrigger.NodeType == controls.ResourceTypeToString(controls.CloudAccount) ||
		scanTrigger.NodeType == controls.ResourceTypeToString(controls.KubernetesCluster) ||
		scanTrigger.NodeType == controls.ResourceTypeToString(controls.Host) {
		scanIds, bulkID, err = StartMultiCloudComplianceScan(ctx, nodes, reqs.BenchmarkTypes, reqs.IsPriority)
		scanStatusType = utils.CloudComplianceScanStatus
	} else {
		scanIds, bulkID, err = startMultiComplianceScan(ctx, nodes, reqs.BenchmarkTypes)
		scanStatusType = utils.ComplianceScanStatus
	}
	if err != nil {
		if err.Error() == "Result contains no more records" {
			h.respondError(&noNodesMatchedInNeo4jError, w)
			return
		}
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	for _, i := range scanIds {
		h.SendScanStatus(r.Context(), scanStatusType, NewScanStatus(i, utils.ScanStatusStarting, ""))
	}

	if len(scanIds) == 0 {
		h.respondError(errStartScan, w)
		return
	}

	h.AuditUserActivity(r, EventComplianceScan, ActionStart, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scanIds, BulkScanID: bulkID})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) StartMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.MalwareScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	actionBuilder := StartScanActionBuilder(r.Context(), controls.StartMalwareScan, nil)

	scanIDs, bulkID, err := StartMultiScan(r.Context(), true, utils.NEO4JMalwareScan, reqs.ScanTriggerCommon, actionBuilder)
	if err != nil {
		if err.Error() == "Result contains no more records" {
			h.respondError(&noNodesMatchedInNeo4jError, w)
			return
		}
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventMalwareScan, ActionStart, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scanIDs, BulkScanID: bulkID})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func NewScanStatus(scanID, status, message string) map[string]interface{} {
	return map[string]interface{}{
		"scan_id":      scanID,
		"scan_status":  status,
		"scan_message": message,
	}
}

func (h *Handler) SendScanStatus(
	ctx context.Context, scanStatusType string, status map[string]interface{}) {

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	cb, err := json.Marshal(status)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}
	h.IngestChan <- &kgo.Record{
		Topic:   scanStatusType,
		Value:   cb,
		Headers: rh,
	}
}

func (h *Handler) StopVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	h.stopScan(w, r, "StopVulnerabilityScan")
}

func (h *Handler) StopSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	h.stopScan(w, r, "StopSecretScan")
}

func (h *Handler) StopComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	h.stopScan(w, r, "StopComplianceScan")
}

func (h *Handler) StopMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	h.stopScan(w, r, "StopMalwareScan")
}

func (h *Handler) IngestCloudResourcesReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCloudResourceIngester()
	ingestCloudScanReport(w, r, ingester, h.IngestChan)
}

func ingestCloudScanReport[T any](respWrite http.ResponseWriter, req *http.Request,
	ingester ingesters.KafkaIngester[T],
	ingestChan chan *kgo.Record) {

	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
		return
	}
	body, err := io.ReadAll(req.Body)
	if err != nil {
		log.Error().Msgf("error: %+v", err)
		http.Error(respWrite, "Error reading request body", http.StatusInternalServerError)
		return
	}

	ctx := req.Context()

	var data T
	err = json.Unmarshal(body, &data)
	if err != nil {
		log.Error().Msgf("error: %+v", err)
		log.Error().Msgf("Failed to parse: %s", body)
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}
	err = ingester.Ingest(ctx, data, ingestChan)
	if err != nil {
		log.Error().Msgf("error: %+v", err)
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
		log.Error().Err(err).Msg("failed to decode message")
		h.respondError(&BadDecoding{err}, w)
		return
	}

	b64, err := base64.StdEncoding.DecodeString(params.SBOM)
	if err != nil {
		log.Error().Err(err).Msgf("error b64 reader")
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if params.ScanID == "" {
		log.Error().Msgf("error scan id is empty, params: %+v", params)
		err = httpext.JSON(w, http.StatusBadRequest,
			model.ErrorResponse{Message: "scan_id is required to process sbom"})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	mc, err := directory.FileServerClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	sbomFile := path.Join("sbom", utils.ScanIDReplacer.Replace(params.ScanID)+".json.gz")
	info, err := mc.UploadFile(r.Context(), sbomFile, b64, true,
		minio.PutObjectOptions{ContentType: "application/gzip"})
	if err != nil {
		log.Error().Err(err).Msg("failed to uplaod sbom")
		h.respondError(err, w)
		return
	}

	// check if sbom has to be scanned
	if params.SkipScan {
		log.Info().Msgf("skip sbom scan for id %s", params.ScanID)
		err = httpext.JSON(w, http.StatusOK, info)
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	params.SBOMFilePath = sbomFile

	payload, err := json.Marshal(params.SbomParameters)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	worker, err := directory.Worker(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	err = worker.Enqueue(utils.ScanSBOMTask, payload, utils.DefaultTaskOpts()...)
	if err != nil {
		log.Error().Msgf("cannot publish message: %v", err)
		h.respondError(err, w)
		return
	}

	log.Info().Msgf("scan_id: %s, minio file info: %+v", params.ScanID, info)
	err = httpext.JSON(w, http.StatusOK, info)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) IngestVulnerabilityReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewVulnerabilityIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestVulnerabilityScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewVulnerabilityStatusIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestSecretReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewSecretIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestSecretScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewSecretScanStatusIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestMalwareScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewMalwareScanStatusIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestComplianceReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewComplianceIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestComplianceScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewComplianceScanStatusIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestCloudComplianceReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCloudComplianceIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestMalwareReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewMalwareIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestMalwareScanStatusReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewMalwareScanStatusIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func (h *Handler) IngestCloudComplianceScanStatusReportHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewCloudComplianceScanStatusIngester()
	ingestScanReportKafka(w, r, ingester, h.IngestChan)
}

func ingestScanReportKafka[T any](
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
		log.Error().Msgf("error: %+v", err)
		http.Error(respWrite, "Error reading request body", http.StatusInternalServerError)
		return
	}

	ctx := req.Context()

	var data T
	err = json.Unmarshal(body, &data)
	if err != nil {
		log.Error().Msgf("error: %+v", err)
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}
	err = ingester.Ingest(ctx, data, ingestChan)
	if err != nil {
		log.Error().Msgf("error: %+v", err)
		http.Error(respWrite, "Error processing request body", http.StatusInternalServerError)
		return
	}

	// respWrite.WriteHeader(http.StatusOK)
	// fmt.Fprint(respWrite, "Ok")
	err = httpext.JSON(respWrite, http.StatusOK, map[string]string{"status": "ok"})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) stopScan(w http.ResponseWriter, r *http.Request, tag string) {
	//	Stopping scan is on best-effort basis, not guaranteed
	defer r.Body.Close()
	var req model.StopScanRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%s Failed to DecodeJSON: %v", tag, err)
		h.respondError(err, w)
		return
	}

	err = h.Validator.Struct(req)
	if err != nil {
		log.Error().Msgf("Failed to validate the request: %v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	if req.ScanType == "CloudComplianceScan" {
		tag = "StopCloudComplianceScan"
		log.Info().Msgf("StopCloudComplianceScan request, tag: %v, type: %s, scan id: %v",
			tag, req.ScanType, req.ScanIds)

		err = reportersScan.StopCloudComplianceScan(r.Context(), req.ScanIds)
	} else {
		log.Info().Msgf("%s request, type: %s, scan id: %v",
			tag, req.ScanType, req.ScanIds)
		err = reportersScan.StopScan(r.Context(), req.ScanType, req.ScanIds)
	}

	if err != nil {
		log.Error().Msgf("%s Error in StopScan: %v", tag, err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	h.AuditUserActivity(r, req.ScanType, ActionStop, req, true)

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) StatusVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4JVulnerabilityScan)
}

func (h *Handler) StatusSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4JSecretScan)
}

func (h *Handler) StatusComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4JComplianceScan)
}

func (h *Handler) StatusMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4JMalwareScan)
}

func (h *Handler) StatusCloudComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	h.complianceStatusScanHandler(w, r, utils.NEO4JCloudComplianceScan)
}

func (h *Handler) statusScanHandler(w http.ResponseWriter, r *http.Request, scanType utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeJSON(r, httpext.QueryParams, MaxSbomRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	var statuses model.ScanStatusResp
	if req.BulkScanID != "" {
		statuses, err = reportersScan.GetBulkScans(r.Context(), scanType, req.BulkScanID)
	} else {
		statuses, err = reportersScan.GetScanStatus(r.Context(), scanType, req.ScanIds)
	}

	if err == reporters.ErrNotFound {
		err = &NotFoundError{err}
	}

	if err != nil {
		log.Error().Msgf("%v, req=%s,%v", err, req.BulkScanID, req.ScanIds)
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, statuses)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) complianceStatusScanHandler(w http.ResponseWriter, r *http.Request, scanType utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeJSON(r, httpext.QueryParams, MaxSbomRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	var statuses model.ComplianceScanStatusResp
	if req.BulkScanID != "" {
		statuses, err = reportersScan.GetComplianceBulkScans(r.Context(), scanType, req.BulkScanID)
	} else {
		statuses, err = reportersScan.GetComplianceScanStatus(r.Context(), scanType, req.ScanIds)
	}

	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, statuses)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListVulnerabilityScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4JVulnerabilityScan)
}

func (h *Handler) ListSecretScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4JSecretScan)
}

func (h *Handler) ListComplianceScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4JComplianceScan)
}

func (h *Handler) ListMalwareScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4JMalwareScan)
}

func (h *Handler) ListCloudComplianceScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4JCloudComplianceScan)
}

func (h *Handler) listScansHandler(w http.ResponseWriter, r *http.Request, scanType utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	infos, err := reportersScan.GetScansList(r.Context(), scanType, req.NodeIds, req.FieldsFilter, req.Window)
	if err == reporters.ErrNotFound {
		err = &NotFoundError{err}
	}

	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		h.respondError(err, w)
		return
	}

	for i := range infos.ScansInfo {
		counts, err := reportersScan.GetSevCounts(r.Context(), scanType, infos.ScansInfo[i].ScanID)
		infos.ScansInfo[i].SeverityCounts = counts
		if err != nil {
			log.Error().Err(err).Msg("Counts computation issue")
		}
	}

	err = httpext.JSON(w, http.StatusOK, infos)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) GetScanReportFields(w http.ResponseWriter, r *http.Request) {
	// iterate over empty struct "model.Vulnerability" fields
	// and push the field json tag name to an array
	vulnerabilityFields := []string{}
	vulnerability := model.Vulnerability{}
	vulnerabilityType := reflect.TypeOf(vulnerability)
	for i := 0; i < vulnerabilityType.NumField(); i++ {
		fieldString := vulnerabilityType.Field(i).Tag.Get("json")
		fields := strings.Split(fieldString, ",")
		vulnerabilityFields = append(vulnerabilityFields, fields[0])
	}

	// iterate over empty struct "model.Secret" fields
	// and push the field json tag name to an array
	secretFields := []string{}
	secret := model.Secret{}
	secretType := reflect.TypeOf(secret)
	for i := 0; i < secretType.NumField(); i++ {
		fieldString := vulnerabilityType.Field(i).Tag.Get("json")
		fields := strings.Split(fieldString, ",")
		secretFields = append(secretFields, fields[0])
	}

	// iterate over empty struct "model.Compliance" fields
	// and push the field json tag name to an array
	complianceFields := []string{}
	compliance := model.Compliance{}
	complianceType := reflect.TypeOf(compliance)
	for i := 0; i < complianceType.NumField(); i++ {
		fieldString := vulnerabilityType.Field(i).Tag.Get("json")
		fields := strings.Split(fieldString, ",")
		complianceFields = append(complianceFields, fields[0])
	}

	// iterate over empty struct "model.Malware" fields
	// and push the field json tag name to an array
	malwareFields := []string{}
	malware := model.Malware{}
	malwareType := reflect.TypeOf(malware)
	for i := 0; i < malwareType.NumField(); i++ {
		fieldString := vulnerabilityType.Field(i).Tag.Get("json")
		fields := strings.Split(fieldString, ",")
		malwareFields = append(malwareFields, fields[0])
	}

	response := model.ScanReportFieldsResponse{
		Vulnerability: vulnerabilityFields,
		Secret:        secretFields,
		Compliance:    complianceFields,
		Malware:       malwareFields,
	}

	err := httpext.JSON(w, http.StatusOK, response)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListVulnerabilityScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Vulnerability](w, r, utils.NEO4JVulnerabilityScan)
	if err != nil {
		h.respondError(err, w)
		return
	}
	counts, err := reportersScan.GetSevCounts(r.Context(), utils.NEO4JVulnerabilityScan, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	err = httpext.JSON(w, http.StatusOK, model.VulnerabilityScanResult{
		Vulnerabilities: entries, ScanResultsCommon: common, SeverityCounts: counts})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListSecretScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Secret](w, r, utils.NEO4JSecretScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	counts, err := reportersScan.GetSevCounts(r.Context(), utils.NEO4JSecretScan, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	err = httpext.JSON(w, http.StatusOK, model.SecretScanResult{
		Secrets: entries, ScanResultsCommon: common, SeverityCounts: counts})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListSecretScanResultRulesHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Secret](w, r, utils.NEO4JSecretScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	rules := []string{}
	for _, e := range entries {
		rules = append(rules, e.Name)
	}

	err = httpext.JSON(w, http.StatusOK, model.SecretScanResultRules{Rules: lo.Uniq(rules)})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Compliance](w, r, utils.NEO4JComplianceScan)
	if err != nil {
		h.respondError(err, w)
		return
	}
	additionalInfo, err := reportersScan.GetCloudComplianceStats(r.Context(), common.ScanID, utils.NEO4JComplianceScan)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	err = httpext.JSON(w, http.StatusOK, model.ComplianceScanResult{Compliances: entries, ScanResultsCommon: common,
		ComplianceAdditionalInfo: additionalInfo})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListMalwareScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4JMalwareScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	counts, err := reportersScan.GetSevCounts(r.Context(), utils.NEO4JMalwareScan, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	err = httpext.JSON(w, http.StatusOK, model.MalwareScanResult{Malwares: entries, ScanResultsCommon: common, SeverityCounts: counts})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListMalwareScanResultRulesHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4JMalwareScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	rules := []string{}
	for _, e := range entries {
		rules = append(rules, e.RuleName)
	}

	err = httpext.JSON(w, http.StatusOK, model.MalwareScanResultRules{Rules: lo.Uniq(rules)})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListMalwareScanResultClassHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4JMalwareScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	class := []string{}
	for _, e := range entries {
		class = append(class, e.Class)
	}

	err = httpext.JSON(w, http.StatusOK, model.MalwareScanResultClass{Class: lo.Uniq(class)})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListCloudComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.CloudCompliance](w, r, utils.NEO4JCloudComplianceScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	additionalInfo, err := reportersScan.GetCloudComplianceStats(r.Context(), common.ScanID, utils.NEO4JCloudComplianceScan)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	err = httpext.JSON(w, http.StatusOK, model.CloudComplianceScanResult{Compliances: entries, ScanResultsCommon: common,
		ComplianceAdditionalInfo: additionalInfo})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) CountVulnerabilityScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Vulnerability](w, r, utils.NEO4JVulnerabilityScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) CountSecretScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Secret](w, r, utils.NEO4JSecretScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) CountComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Compliance](w, r, utils.NEO4JComplianceScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) CountMalwareScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4JMalwareScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) CountCloudComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.CloudCompliance](w, r, utils.NEO4JCloudComplianceScan)
	if err != nil {
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func groupSecrets(ctx context.Context) ([]reporters_search.ResultGroup, error) {
	results := []reporters_search.ResultGroup{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return results, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return results, err
	}
	defer tx.Close(ctx)

	query := `
	MATCH (n:Secret)-[:IS]->(m:SecretRule)
	WHERE exists((n)<-[:DETECTED]-(:SecretScan))
	RETURN m.name as name, n.level as severity, count(*) as count
	`

	res, err := tx.Run(ctx, query, map[string]interface{}{})
	if err != nil {
		return results, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return results, err
	}

	for _, rec := range recs {
		results = append(results,
			reporters_search.ResultGroup{
				Name:     rec.Values[0].(string),
				Severity: rec.Values[1].(string),
				Count:    rec.Values[2].(int64),
			},
		)
	}

	return results, nil
}

func (h *Handler) GroupSecretResultsHandler(w http.ResponseWriter, r *http.Request) {

	groups, err := groupSecrets(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to group secrets")
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.ResultGroupResp{
		Groups: groups,
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func groupMalwares(ctx context.Context, byClass bool) ([]reporters_search.ResultGroup, error) {
	results := []reporters_search.ResultGroup{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return results, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return results, err
	}
	defer tx.Close(ctx)

	query := `
	MATCH (n:Malware)-[:IS]->(m:MalwareRule)
	WHERE exists((n)<-[:DETECTED]-(:MalwareScan))
	RETURN m.rule_name as name, n.file_severity as severity, count(*) as count
	`

	if byClass {
		query = `
		MATCH (n:Malware)-[:IS]->(m:MalwareRule)
		WHERE exists((n)<-[:DETECTED]-(:MalwareScan))
		RETURN m.info as name, n.file_severity as severity, count(*) as count
		`
	}

	res, err := tx.Run(ctx, query, map[string]interface{}{})
	if err != nil {
		return results, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return results, err
	}

	for _, rec := range recs {
		results = append(results,
			reporters_search.ResultGroup{
				Name:     rec.Values[0].(string),
				Severity: rec.Values[1].(string),
				Count:    rec.Values[2].(int64),
			},
		)
	}

	return results, nil
}

func (h *Handler) GroupMalwareResultsHandler(w http.ResponseWriter, r *http.Request) {

	groups, err := groupMalwares(r.Context(), false)
	if err != nil {
		log.Error().Err(err).Msg("failed to group malwares")
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.ResultGroupResp{
		Groups: groups,
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) GroupMalwareClassResultsHandler(w http.ResponseWriter, r *http.Request) {

	groups, err := groupMalwares(r.Context(), true)
	if err != nil {
		log.Error().Err(err).Msg("failed to group malwares")
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.ResultGroupResp{
		Groups: groups,
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) CloudComplianceFiltersHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.FiltersReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	res, err := reportersScan.GetFilters(r.Context(), req.Having, utils.ScanTypeDetectedNode[utils.NEO4JCloudComplianceScan], req.RequiredFilters)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	err = httpext.JSON(w, http.StatusOK, model.FiltersResult{Filters: res})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ComplianceFiltersHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.FiltersReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	res, err := reportersScan.GetFilters(r.Context(), req.Having, utils.ScanTypeDetectedNode[utils.NEO4JComplianceScan], req.RequiredFilters)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	err = httpext.JSON(w, http.StatusOK, model.FiltersResult{Filters: res})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func listScanResultsHandler[T any](w http.ResponseWriter, r *http.Request, scanType utils.Neo4jScanType) ([]T, model.ScanResultsCommon, error) {
	defer r.Body.Close()
	var req model.ScanResultsReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		return nil, model.ScanResultsCommon{}, &BadDecoding{err}
	}

	entries, common, err := reportersScan.GetScanResults[T](r.Context(), scanType, req.ScanID, req.FieldsFilter, req.Window)
	if err != nil {
		return nil, model.ScanResultsCommon{}, err
	}
	common.ScanID = req.ScanID
	return entries, common, nil
}

func getNodeIDs(ctx context.Context, tx neo4j.ExplicitTransaction, ids []model.NodeIdentifier, neo4jNode controls.ScanResource, filter reporters.ContainsFilter) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	wherePattern := reporters.ContainsFilter2CypherWhereConditions("n", filter, false)
	if len(wherePattern) == 0 {
		return ids, nil
	}
	nres, err := tx.Run(ctx, fmt.Sprintf(`
		MATCH (n:%s)
		WHERE n.node_id IN $ids
		%s
		RETURN n.node_id`,
		controls.ResourceTypeToNeo4j(neo4jNode),
		wherePattern),
		map[string]interface{}{"ids": reportersScan.NodeIdentifierToIDList(ids)})
	if err != nil {
		return res, err
	}

	rec, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for i := range rec {
		res = append(res, model.NodeIdentifier{
			NodeID:   rec[i].Values[0].(string),
			NodeType: controls.ResourceTypeToString(neo4jNode),
		})
	}
	return res, nil
}

func (h *Handler) scanResultMaskHandler(w http.ResponseWriter, r *http.Request, action string) {
	defer r.Body.Close()
	var req model.ScanResultsMaskRequest
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
	switch action {
	case "mask":
		err = reportersScan.UpdateScanResultMasked(r.Context(), &req, true)
	case "unmask":
		err = reportersScan.UpdateScanResultMasked(r.Context(), &req, false)
	}
	if err != nil {
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) scanResultActionHandler(w http.ResponseWriter, r *http.Request, action string) {
	defer r.Body.Close()
	var req model.ScanResultsActionRequest
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
	switch action {
	case "delete":
		err = reportersScan.DeleteScanResults(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID, req.ResultIDs)
		if req.ScanType == string(utils.NEO4JCloudComplianceScan) {
			err := h.CachePostureProviders(r.Context())
			if err != nil {
				h.respondError(err, w)
				return
			}
		}
		h.AuditUserActivity(r, req.ScanType, ActionDelete, req, true)
	case "notify":
		// NotifyIndividual is true, then notify each result individually, meaning create seperate notification for each result
		if req.NotifyIndividual {
			for _, resultID := range req.ResultIDs {
				err = reportersScan.NotifyScanResult(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID, []string{resultID}, req.IntegrationIDs)
				if err != nil {
					h.respondError(err, w)
					return
				}
			}
		} else {
			err = reportersScan.NotifyScanResult(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID, req.ResultIDs, req.IntegrationIDs)
			if err != nil {
				h.respondError(err, w)
				return
			}
		}
		h.AuditUserActivity(r, req.ScanType, ActionNotify, req, true)
	}
	if err != nil {
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ScanResultMaskHandler(w http.ResponseWriter, r *http.Request) {
	h.scanResultMaskHandler(w, r, "mask")
}

func (h *Handler) ScanResultUnmaskHandler(w http.ResponseWriter, r *http.Request) {
	h.scanResultMaskHandler(w, r, "unmask")
}

func (h *Handler) ScanResultDeleteHandler(w http.ResponseWriter, r *http.Request) {
	h.scanResultActionHandler(w, r, "delete")
}

func (h *Handler) ScanResultNotifyHandler(w http.ResponseWriter, r *http.Request) {
	h.scanResultActionHandler(w, r, "notify")
}

func getScanResults(ctx context.Context, scanID, scanType string) (model.DownloadScanResultsResponse, error) {
	resp := model.DownloadScanResultsResponse{}
	switch scanType {
	case "VulnerabilityScan":
		result, common, err := reportersScan.GetScanResults[model.Vulnerability](
			ctx, utils.StringToNeo4jScanType(scanType), scanID,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "SecretScan":
		result, common, err := reportersScan.GetScanResults[model.Secret](
			ctx, utils.StringToNeo4jScanType(scanType), scanID,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "MalwareScan":
		result, common, err := reportersScan.GetScanResults[model.Malware](
			ctx, utils.StringToNeo4jScanType(scanType), scanID,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "ComplianceScan":
		result, common, err := reportersScan.GetScanResults[model.Compliance](
			ctx, utils.StringToNeo4jScanType(scanType), scanID,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "CloudComplianceScan":
		result, common, err := reportersScan.GetScanResults[model.CloudCompliance](
			ctx, utils.StringToNeo4jScanType(scanType), scanID,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	default:
		return resp, errIncorrectScanType
	}
}

func (h *Handler) scanIDActionHandler(w http.ResponseWriter, r *http.Request, action string) {
	req := model.ScanActionRequest{
		ScanID:   chi.URLParam(r, "scan_id"),
		ScanType: chi.URLParam(r, "scan_type"),
	}
	err := h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	switch action {
	case "download":
		resp, err := getScanResults(r.Context(), req.ScanID, req.ScanType)
		if err != nil {
			log.Error().Msg(err.Error())
			h.respondError(err, w)
		}
		data, err := json.Marshal(resp)
		if err != nil {
			log.Error().Msg(err.Error())
			h.respondError(err, w)
		}
		w.Header().Set("Content-Disposition",
			"attachment; filename="+strconv.Quote(utils.ScanIDReplacer.Replace(req.ScanID)+".json"))
		w.Header().Set("Content-Type", "application/octet-stream")
		w.WriteHeader(http.StatusOK)
		_, err = w.Write(data)
		if err != nil {
			log.Error().Msg(err.Error())
		}
		h.AuditUserActivity(r, req.ScanType, ActionDownload, req, true)

	case "delete":
		err = reportersScan.DeleteScan(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID)
		if err != nil {
			h.respondError(err, w)
			return
		}
		if req.ScanType == string(utils.NEO4JCloudComplianceScan) {
			err := h.CachePostureProviders(r.Context())
			if err != nil {
				h.respondError(err, w)
				return
			}
		}
		w.WriteHeader(http.StatusNoContent)
		h.AuditUserActivity(r, req.ScanType, ActionDelete, req, true)
	}
}

func (h *Handler) ScanResultDownloadHandler(w http.ResponseWriter, r *http.Request) {
	h.scanIDActionHandler(w, r, "download")
}

func (h *Handler) ScanDeleteHandler(w http.ResponseWriter, r *http.Request) {
	h.scanIDActionHandler(w, r, "delete")
}

func (h *Handler) BulkDeleteScans(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.BulkDeleteScansRequest
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

	log.Info().Msgf("bulk delete %s scans filters %+v", req.ScanType, req.Filters)

	err = h.bulkDeleteScanResults(r.Context(), req)
	if err != nil {
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, ActionBulk, ActionDelete, req, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) bulkDeleteScanResults(ctx context.Context, req model.BulkDeleteScansRequest) error {
	// Mark the scans as delete pending
	scanType := utils.DetectedNodeScanType[req.ScanType]
	scansList, err := reportersScan.GetScansList(ctx, scanType, nil,
		req.Filters, model.FetchWindow{})
	if err != nil {
		return err
	}
	scanIds := make([]string, 0, len(scansList.ScansInfo))
	for _, entry := range scansList.ScansInfo {
		scanIds = append(scanIds, entry.ScanID)
	}

	err = reportersScan.MarkScanDeletePending(ctx, scanType, scanIds)
	if err != nil {
		log.Error().Msgf("Failed to mark the scanids: %v as DELETE_PENDING",
			scanIds)
		return err
	}

	worker, err := directory.Worker(ctx)
	if err != nil {
		return err
	}

	data, err := json.Marshal(req)
	if err != nil {
		return err
	}

	return worker.Enqueue(utils.BulkDeleteScans, data, utils.CritialTaskOpts()...)
}

func (h *Handler) GetAllNodesInScanResultBulkHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.NodesInScanResultRequest
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
	resp, err := reportersScan.GetNodesInScanResults(r.Context(), utils.Neo4jScanType(req.ScanType), req.ResultIDs)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, resp)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) sbomHandler(w http.ResponseWriter, r *http.Request, action string) {
	defer r.Body.Close()
	var req model.SbomRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	mc, err := directory.FileServerClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	switch action {
	case "get":
		sbom := make([]model.SbomResponse, 0)
		runtimeSbom := path.Join("/sbom", "runtime-"+utils.ScanIDReplacer.Replace(req.ScanID)+".json")
		buff, err := mc.DownloadFileContexts(r.Context(), runtimeSbom, minio.GetObjectOptions{})
		if err != nil {
			log.Error().Msg(err.Error())
			h.respondError(err, w)
			return
		}
		if err := json.Unmarshal(buff, &sbom); err != nil {
			log.Error().Msg(err.Error())
			h.respondError(err, w)
			return
		}
		err = httpext.JSON(w, http.StatusOK, sbom)
		if err != nil {
			log.Error().Msgf("%v", err)
		}
	case "download":
		resp := model.DownloadReportResponse{}
		sbomFile := path.Join("/sbom", utils.ScanIDReplacer.Replace(req.ScanID)+".json.gz")
		cd := url.Values{
			"response-content-disposition": []string{
				"attachment; filename=" + strconv.Quote(utils.ScanIDReplacer.Replace(req.ScanID)+".json.gz")},
		}
		url, err := mc.ExposeFile(r.Context(), sbomFile, true, DownloadReportURLExpiry, cd, h.GetHostURL(r))
		if err != nil {
			log.Error().Msg(err.Error())
			h.respondError(err, w)
			return
		}
		resp.URLLink = url
		err = httpext.JSON(w, http.StatusOK, resp)
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		h.AuditUserActivity(r, EventVulnerabilityScan, ActionDownload, req, true)
	}
}

func (h *Handler) GetSbomHandler(w http.ResponseWriter, r *http.Request) {
	h.sbomHandler(w, r, "get")
}

func (h *Handler) SbomDownloadHandler(w http.ResponseWriter, r *http.Request) {
	h.sbomHandler(w, r, "download")
}

func FindNodesMatching(ctx context.Context,
	hostIDs []model.NodeIdentifier,
	imageIDs []model.NodeIdentifier,
	containerIDs []model.NodeIdentifier,
	cloudAccountIDs []model.NodeIdentifier,
	kubernetesClusterIDs []model.NodeIdentifier,
	filter model.ScanFilter) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	rh, err := getNodeIDs(ctx, tx, hostIDs, controls.Host, filter.HostScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rh...)

	if len(filter.ImageScanFilter.FieldsValues["docker_image_name"]) > 0 &&
		len(filter.ImageScanFilter.FieldsValues["docker_image_tag"]) > 0 {
		ri, err := GetImagesFromAdvanceFilter(ctx, imageIDs, filter.ImageScanFilter)
		if err != nil {
			return res, err
		}
		res = append(res, ri...)
	} else {
		ri, err := getNodeIDs(ctx, tx, imageIDs, controls.Image, filter.ImageScanFilter)
		if err != nil {
			return res, err
		}
		res = append(res, ri...)
	}

	rc, err := getNodeIDs(ctx, tx, containerIDs, controls.Container, filter.ContainerScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rc...)
	rca, err := getNodeIDs(ctx, tx, cloudAccountIDs, controls.CloudAccount, filter.CloudAccountScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rca...)
	rk, err := getNodeIDs(ctx, tx, kubernetesClusterIDs, controls.KubernetesCluster, filter.KubernetesClusterScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rk...)

	return res, nil
}

func GetImagesFromAdvanceFilter(ctx context.Context, ids []model.NodeIdentifier, filter reporters.ContainsFilter) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	for i := range filter.FieldsValues["docker_image_name"] {
		rr, err := tx.Run(ctx, `
		MATCH (n:ContainerImage)-[:IS]->(m:ImageStub)
		WHERE n.node_id IN $ids
		AND m.docker_image_name = $image_name
		RETURN n.node_id, n.updated_at, n.docker_image_tag
		`, map[string]interface{}{
			"ids":        reportersScan.NodeIdentifierToIDList(ids),
			"image_name": filter.FieldsValues["docker_image_name"][i],
		})
		if err != nil {
			return res, err
		}

		rec, err := rr.Collect(ctx)
		if err != nil {
			return res, err
		}

		if len(rec) == 0 {
			return res, nil
		}

		switch filter.FieldsValues["docker_image_tag"][0] {
		case "latest":
			for j := range rec {
				if rec[j].Values[2].(string) == filter.FieldsValues["docker_image_tag"][0] {
					res = append(res, model.NodeIdentifier{
						NodeID:   rec[j].Values[0].(string),
						NodeType: controls.ResourceTypeToString(controls.Image),
					})
					break
				}
			}
		case "all":
			for j := range rec {
				res = append(res, model.NodeIdentifier{
					NodeID:   rec[j].Values[0].(string),
					NodeType: controls.ResourceTypeToString(controls.Image),
				})
			}
		case "recent": // kludge: what if the image tag is actually named "recent"?
			recentNodeID := rec[0].Values[0].(string)
			recentTimeUNIX := rec[0].Values[1].(int64)
			for j := range rec {
				recentTime := time.Unix(recentTimeUNIX, 0)
				t := time.Unix(rec[j].Values[1].(int64), 0)
				if t.After(recentTime) {
					recentTimeUNIX = rec[j].Values[1].(int64)
					recentNodeID = rec[j].Values[0].(string)
				}
			}
			res = append(res, model.NodeIdentifier{
				NodeID:   recentNodeID,
				NodeType: controls.ResourceTypeToString(controls.Image),
			})
		}
	}
	return res, nil
}

func FindImageRegistryIDs(ctx context.Context, imageID string) ([]int32, error) {
	res := []int32{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	nres, err := tx.Run(ctx, `
		MATCH (n:ContainerImage{node_id:$node_id})
		MATCH (m:RegistryAccount) -[:HOSTS]-> (n)
		RETURN m.container_registry_ids
		LIMIT 1`,
		map[string]interface{}{"node_id": imageID})
	if err != nil {
		return res, err
	}

	rec, err := nres.Single(ctx)
	if err != nil {
		return res, nil
	}

	pgIds := rec.Values[0].([]interface{})
	for i := range pgIds {
		res = append(res, int32(pgIds[i].(int64)))
	}

	return res, nil
}

func extractBulksNodes(nodes []model.NodeIdentifier) ([]model.NodeIdentifier,
	[]model.NodeIdentifier, []model.NodeIdentifier, []model.NodeIdentifier) {

	regularNodes := []model.NodeIdentifier{}
	clusterNodes := []model.NodeIdentifier{}
	registryNodes := []model.NodeIdentifier{}
	podNodes := []model.NodeIdentifier{}

	for i := range nodes {
		switch nodes[i].NodeType {
		case controls.ResourceTypeToString(controls.KubernetesCluster):
			clusterNodes = append(clusterNodes, nodes[i])
		case controls.ResourceTypeToString(controls.RegistryAccount):
			registryNodes = append(registryNodes, nodes[i])
		case controls.ResourceTypeToString(controls.Pod):
			podNodes = append(podNodes, nodes[i])
		default:
			regularNodes = append(regularNodes, nodes[i])
		}
	}

	return regularNodes, clusterNodes, registryNodes, podNodes
}

func StartMultiScan(ctx context.Context,
	genBulkID bool,
	scanType utils.Neo4jScanType,
	req model.ScanTriggerCommon,
	actionBuilder func(string, model.NodeIdentifier, int32) (controls.Action, error)) ([]string, string, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "start-multi-scan")
	defer span.End()

	isPriority := req.IsPriority

	regular, k8s, registry, pods := extractBulksNodes(req.NodeIDs)

	imageNodes, err := reportersScan.GetRegistriesImageIDs(ctx, registry)
	if err != nil {
		return nil, "", err
	}

	k8sHostNodes, err := reportersScan.GetKubernetesHostsIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	k8sImageNodes, err := reportersScan.GetKubernetesImageIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	k8sContainerNodes, err := reportersScan.GetKubernetesContainerIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	podContainerNodes, err := reportersScan.GetPodContainerIDs(ctx, pods)
	if err != nil {
		log.Info().Msgf("Error in reporters_scan.GetPodContainerIDs:%v", err)
		return nil, "", err
	}

	reqs := regular
	if len(k8s) != 0 || len(registry) != 0 {
		reqsExtra, err := FindNodesMatching(ctx,
			k8sHostNodes,
			append(imageNodes, k8sImageNodes...),
			k8sContainerNodes,
			[]model.NodeIdentifier{},
			[]model.NodeIdentifier{},
			req.Filters)
		if err != nil {
			return nil, "", err
		}
		reqs = append(reqs, reqsExtra...)
	} else {
		reqs = req.NodeIDs
	}

	if len(podContainerNodes) > 0 {
		reqs = append(reqs, podContainerNodes...)
	}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, "", err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(60*time.Second))
	if err != nil {
		return nil, "", err
	}
	defer tx.Close(ctx)
	scanIds := []string{}
	for _, req := range reqs {
		if req.NodeType == controls.ResourceTypeToString(controls.Pod) {
			continue
		}

		scanID := scanID(req)

		registryID := int32(-1)
		if req.NodeType == controls.ResourceTypeToString(controls.Image) {
			registryIds, err := FindImageRegistryIDs(ctx, req.NodeID)
			if err != nil {
				return nil, "", err
			}

			if len(registryIds) != 0 {
				registryID = registryIds[0]
			}
		}

		action, err := actionBuilder(scanID, req, registryID)
		if err != nil {
			log.Error().Err(err)
			return nil, "", err
		}

		err = ingesters.AddNewScan(ctx, tx,
			scanType,
			scanID,
			controls.StringToResourceType(req.NodeType),
			req.NodeID,
			isPriority,
			action)

		if err != nil {
			if e, is := err.(*ingesters.AlreadyRunningScanError); is {
				scanIds = append(scanIds, e.ScanID)
				continue
			} else if _, is = err.(*ingesters.AgentNotInstalledError); is {
				continue
			}
			log.Error().Err(err)
			return nil, "", err
		}
		scanIds = append(scanIds, scanID)
	}

	if len(scanIds) == 0 {
		return []string{}, "", nil
	}

	var bulkID string
	if genBulkID {
		bulkID = bulkScanID()
		err = ingesters.AddBulkScan(ctx, tx, scanType, bulkID, scanIds)
		if err != nil {
			log.Error().Msgf("%v", err)
			return nil, "", err
		}
	}
	return scanIds, bulkID, tx.Commit(ctx)
}

func StartMultiCloudComplianceScan(ctx context.Context, reqs []model.NodeIdentifier,
	benchmarkTypes []string, isPriority bool) ([]string, string, error) {
	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, "", err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return nil, "", err
	}

	defer tx.Close(ctx)
	scanIds := []string{}

	for _, req := range reqs {
		scanID := cloudComplianceScanID(req.NodeID)

		err = ingesters.AddNewCloudComplianceScan(
			ctx,
			tx,
			scanID,
			benchmarkTypes,
			req.NodeID,
			reqs[0].NodeType,
			isPriority)

		if err != nil {
			log.Info().Msgf("Error in AddNewCloudComplianceScan:%v", err)
			if e, is := err.(*ingesters.AlreadyRunningScanError); is {
				scanIds = append(scanIds, e.ScanID)
				continue
			} else if _, is = err.(*ingesters.AgentNotInstalledError); is {
				continue
			}
			log.Error().Msgf("%v", err)
			return nil, "", err
		}
		scanIds = append(scanIds, scanID)
	}

	if len(scanIds) == 0 {
		return []string{}, "", nil
	}

	bulkID := bulkScanID()
	scanType := utils.NEO4JCloudComplianceScan
	if reqs[0].NodeType == controls.ResourceTypeToString(controls.KubernetesCluster) || reqs[0].NodeType == controls.ResourceTypeToString(controls.Host) {
		scanType = utils.NEO4JComplianceScan
	}
	err = ingesters.AddBulkScan(ctx, tx, scanType, bulkID, scanIds)
	if err != nil {
		log.Error().Msgf("%v", err)
		return nil, "", err
	}

	return scanIds, bulkID, tx.Commit(ctx)
}

func startMultiComplianceScan(ctx context.Context, reqs []model.NodeIdentifier, benchmarkTypes []string) ([]string, string, error) {
	scanIDs := []string{}
	bulkID := bulkScanID()
	for _, req := range reqs {
		scanID := cloudComplianceScanID(req.NodeID)
		scanIDs = append(scanIDs, scanID)
	}
	return scanIDs, bulkID, nil
}

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
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/samber/lo"
	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	MaxSbomRequestSize      = 500 * 1e6
	DownloadReportUrlExpiry = 5 * time.Minute
)

var (
	noNodesMatchedInNeo4jError = ValidatorError{
		err:                       errors.New("node_ids:nodes not found with the provided filters"),
		skipOverwriteErrorMessage: true,
	}
	startScanError         = errors.New("unable to spawn any new scans with the given criteria")
	incorrectScanTypeError = errors.New("unknown scan type")
)

func scanId(req model.NodeIdentifier) string {
	return fmt.Sprintf("%s-%d", req.NodeId, time.Now().Unix())
}

func cloudComplianceScanId(nodeId string) string {
	return fmt.Sprintf("%s-%d", nodeId, time.Now().Unix())
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

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
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

func GetContainerKubeClusterNameFromId(ctx context.Context, node_id string) (string, string, error) {
	var clusterID string
	var clusterName string

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return clusterID, clusterName, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return clusterID, clusterName, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return clusterID, clusterName, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (n:Container{node_id:$node_id})
		RETURN n.kubernetes_cluster_id, n.kubernetes_cluster_name`,
		map[string]interface{}{"node_id": node_id})
	if err != nil {
		return clusterID, clusterName, err
	}

	rec, err := res.Single()
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

func StartScanActionBuilder(ctx context.Context, scanType ctl.ActionID, additionalBinArgs map[string]string) func(string, model.NodeIdentifier, int32) (ctl.Action, error) {
	return func(scanId string, req model.NodeIdentifier, registryId int32) (ctl.Action, error) {
		registryIdStr := ""
		if registryId != -1 {
			registryIdStr = strconv.Itoa(int(registryId))
		}
		binArgs := map[string]string{
			"scan_id":     scanId,
			"node_type":   req.NodeType,
			"node_id":     req.NodeId,
			"registry_id": registryIdStr,
		}
		for k, v := range additionalBinArgs {
			binArgs[k] = v
		}

		nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

		if nodeTypeInternal == ctl.Image {
			name, tag, err := GetImageFromId(ctx, req.NodeId)
			if err != nil {
				log.Error().Msgf("image not found %s", err.Error())
			} else {
				binArgs["image_name"] = name + ":" + tag
				log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["image_name"])
			}
			if tag == "" || tag == "<none>" {
				return ctl.Action{}, errors.New("image tag not found")
			}
		}

		if nodeTypeInternal == ctl.Container {
			clusterID, clusterName, err := GetContainerKubeClusterNameFromId(ctx, req.NodeId)
			if err != nil {
				log.Error().Msgf("container kube cluster name not found %s", err.Error())
			} else if len(clusterName) > 0 {
				binArgs["kubernetes_cluster_name"] = clusterName
				log.Info().Msgf("node_id=%s clusterName=%s clusterID=%s", req.NodeId, clusterName, clusterID)
			}
		}

		var internal_req interface{}

		switch scanType {
		case ctl.StartVulnerabilityScan:
			internal_req = ctl.StartVulnerabilityScanRequest{NodeId: req.NodeId, NodeType: nodeTypeInternal, BinArgs: binArgs}
		case ctl.StartSecretScan:
			internal_req = ctl.StartSecretScanRequest{NodeId: req.NodeId, NodeType: nodeTypeInternal, BinArgs: binArgs}
		case ctl.StartMalwareScan:
			internal_req = ctl.StartMalwareScanRequest{NodeId: req.NodeId, NodeType: nodeTypeInternal, BinArgs: binArgs}
		}

		b, err := json.Marshal(internal_req)
		if err != nil {
			return ctl.Action{}, err
		}

		return ctl.Action{ID: scanType, RequestPayload: string(b)}, nil
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

	actionBuilder := StartScanActionBuilder(r.Context(), ctl.StartVulnerabilityScan, binArgs)

	scan_ids, bulkId, err := StartMultiScan(r.Context(), true, utils.NEO4J_VULNERABILITY_SCAN, reqs.ScanTriggerCommon, actionBuilder)
	if err != nil {
		if err.Error() == "Result contains no more records" {
			h.respondError(&noNodesMatchedInNeo4jError, w)
			return
		}
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_VULNERABILITY_SCAN, ACTION_START, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scan_ids, BulkScanId: bulkId})
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

	new, err := reporters_scan.GetScanResultDiff[model.Vulnerability](r.Context(), utils.NEO4J_VULNERABILITY_SCAN, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		h.respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Vulnerability]{New: new})
}

func (h *Handler) DiffAddSecretScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reporters_scan.GetScanResultDiff[model.Secret](r.Context(), utils.NEO4J_SECRET_SCAN, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		h.respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Secret]{New: new})
}

func (h *Handler) DiffAddComplianceScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reporters_scan.GetScanResultDiff[model.Compliance](r.Context(), utils.NEO4J_COMPLIANCE_SCAN, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		h.respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Compliance]{New: new})
}

func (h *Handler) DiffAddMalwareScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reporters_scan.GetScanResultDiff[model.Malware](r.Context(), utils.NEO4J_MALWARE_SCAN, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		h.respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.Malware]{New: new})
}

func (h *Handler) DiffAddCloudComplianceScan(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.ScanCompareReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
	}

	new, err := reporters_scan.GetScanResultDiff[model.CloudCompliance](r.Context(), utils.NEO4J_CLOUD_COMPLIANCE_SCAN, req.BaseScanID, req.ToScanID, req.FieldsFilter, req.Window)
	if err != nil {
		h.respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.ScanCompareRes[model.CloudCompliance]{New: new})
}

func (h *Handler) StartSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	var reqs model.SecretScanTriggerReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &reqs)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	actionBuilder := StartScanActionBuilder(r.Context(), ctl.StartSecretScan, nil)

	scan_ids, bulkId, err := StartMultiScan(r.Context(), true, utils.NEO4J_SECRET_SCAN, reqs.ScanTriggerCommon, actionBuilder)
	if err != nil {
		if err.Error() == "Result contains no more records" {
			h.respondError(&noNodesMatchedInNeo4jError, w)
			return
		}
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_SECRET_SCAN, ACTION_START, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scan_ids, BulkScanId: bulkId})
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

	regular, k8s, _, _ := extractBulksNodes(reqs.NodeIds)

	cloudNodeIds, err := reporters_scan.GetCloudAccountIDs(ctx, regular)
	if err != nil {
		h.respondError(err, w)
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
			h.respondError(err, w)
			return
		}
	} else {
		nodes = reqs.NodeIds
	}

	var scanTrigger model.NodeIdentifier
	if len(nodes) > 0 {
		scanTrigger = nodes[0]
	}

	if scanTrigger.NodeType == controls.ResourceTypeToString(controls.Image) ||
		scanTrigger.NodeType == controls.ResourceTypeToString(controls.Container) {
		h.respondError(&BadDecoding{fmt.Errorf("Not supported")}, w)
		return
	}

	var scanIds []string
	var bulkId string
	var scanStatusType string
	if scanTrigger.NodeType == controls.ResourceTypeToString(controls.CloudAccount) ||
		scanTrigger.NodeType == controls.ResourceTypeToString(controls.KubernetesCluster) ||
		scanTrigger.NodeType == controls.ResourceTypeToString(controls.Host) {
		scanIds, bulkId, err = StartMultiCloudComplianceScan(ctx, nodes, reqs.BenchmarkTypes)
		scanStatusType = utils.CLOUD_COMPLIANCE_SCAN_STATUS
	} else {
		scanIds, bulkId, err = startMultiComplianceScan(ctx, nodes, reqs.BenchmarkTypes)
		scanStatusType = utils.COMPLIANCE_SCAN_STATUS
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
		h.SendScanStatus(r.Context(), scanStatusType, NewScanStatus(i, utils.SCAN_STATUS_STARTING, ""))
	}

	if len(scanIds) == 0 {
		h.respondError(startScanError, w)
		return
	}

	h.AuditUserActivity(r, EVENT_COMPLIANCE_SCAN, ACTION_START, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scanIds, BulkScanId: bulkId})
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

	actionBuilder := StartScanActionBuilder(r.Context(), ctl.StartMalwareScan, nil)

	scan_ids, bulkId, err := StartMultiScan(r.Context(), true, utils.NEO4J_MALWARE_SCAN, reqs.ScanTriggerCommon, actionBuilder)
	if err != nil {
		if err.Error() == "Result contains no more records" {
			h.respondError(&noNodesMatchedInNeo4jError, w)
			return
		}
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_MALWARE_SCAN, ACTION_START, reqs, true)

	err = httpext.JSON(w, http.StatusAccepted, model.ScanTriggerResp{ScanIds: scan_ids, BulkScanId: bulkId})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func NewScanStatus(scanId, status, message string) map[string]interface{} {
	return map[string]interface{}{
		"scan_id":      scanId,
		"scan_status":  status,
		"scan_message": message,
	}
}

func (h *Handler) SendScanStatus(
	ctx context.Context, scanStatusType string, status map[string]interface{}) error {

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	cb, err := json.Marshal(status)
	if err != nil {
		log.Error().Msg(err.Error())
	} else {
		h.IngestChan <- &kgo.Record{
			Topic:   scanStatusType,
			Value:   cb,
			Headers: rh,
		}
	}

	return nil
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
	ingest_cloud_scan_report(w, r, ingester, h.IngestChan)
}

func ingest_cloud_scan_report[T any](respWrite http.ResponseWriter, req *http.Request,
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

	if params.ScanId == "" {
		log.Error().Msgf("error scan id is empty, params: %+v", params)
		httpext.JSON(w, http.StatusBadRequest,
			model.ErrorResponse{Message: "scan_id is required to process sbom"})
		return
	}

	mc, err := directory.MinioClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	sbomFile := path.Join("sbom", utils.ScanIdReplacer.Replace(params.ScanId)+".json.gz")
	info, err := mc.UploadFile(r.Context(), sbomFile, b64,
		minio.PutObjectOptions{ContentType: "application/gzip"})

	if err != nil {
		logError := true
		if strings.Contains(err.Error(), "Already exists here") {
			/*If the file already exists, we will delete the old file and upload the new one
			  File can exists in 2 conditions:
			  - When the earlier scan was stuck during the scan phase
			  - When the service was restarted
			  - Bug/Race conditon in the worker service
			*/
			log.Warn().Msg(err.Error() + ", Will try to overwrite the file: " + sbomFile)
			err = mc.DeleteFile(r.Context(), sbomFile, true, minio.RemoveObjectOptions{ForceDelete: true})
			if err == nil {
				info, err = mc.UploadFile(r.Context(), sbomFile, b64,
					minio.PutObjectOptions{ContentType: "application/gzip"})

				if err == nil {
					log.Info().Msgf("Successfully overwritten the file: %s", sbomFile)
					logError = false
				} else {
					log.Error().Msgf("Failed to upload the file, error is: %v", err)
				}
			} else {
				log.Error().Msgf("Failed to delete the old file, error is: %v", err)
			}
		}

		if logError == true {
			log.Error().Msg(err.Error())
			h.respondError(err, w)
			return
		}
	}

	// check if sbom has to be scanned
	if params.SkipScan {
		log.Info().Msgf("skip sbom scan for id %s", params.ScanId)
		httpext.JSON(w, http.StatusOK, info)
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

	err = worker.Enqueue(utils.ScanSBOMTask, payload)
	if err != nil {
		log.Error().Msgf("cannot publish message:", err)
		h.respondError(err, w)
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

func (h *Handler) IngestComplianceScanStatusHandler(w http.ResponseWriter, r *http.Request) {
	ingester := ingesters.NewComplianceScanStatusIngester()
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
	httpext.JSON(respWrite, http.StatusOK, map[string]string{"status": "ok"})
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
		log.Info().Msgf("CloudComplianceScan request, type: %s, scanid: %s",
			req.ScanType, req.ScanID)
		err = reporters_scan.StopCloudComplianceScan(r.Context(), req.ScanType, req.ScanID)
	} else {
		log.Info().Msgf("%s request, type: %s, scanid: %s",
			tag, req.ScanType, req.ScanID)
		err = reporters_scan.StopScan(r.Context(), req.ScanType, req.ScanID)
	}

	if err != nil {
		log.Error().Msgf("Error in StopScan: %v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	h.AuditUserActivity(r, req.ScanType, ACTION_STOP, req, true)

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) StatusVulnerabilityScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) StatusSecretScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) StatusComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) StatusMalwareScanHandler(w http.ResponseWriter, r *http.Request) {
	h.statusScanHandler(w, r, utils.NEO4J_MALWARE_SCAN)
}

func (h *Handler) StatusCloudComplianceScanHandler(w http.ResponseWriter, r *http.Request) {
	h.complianceStatusScanHandler(w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
}

func (h *Handler) statusScanHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeJSON(r, httpext.QueryParams, MaxSbomRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	var statuses model.ScanStatusResp
	if req.BulkScanId != "" {
		statuses, err = reporters_scan.GetBulkScans(r.Context(), scan_type, req.BulkScanId)
	} else {
		statuses, err = reporters_scan.GetScanStatus(r.Context(), scan_type, req.ScanIds)
	}

	if err == reporters.NotFoundErr {
		err = &NotFoundError{err}
	}

	if err != nil {
		log.Error().Msgf("%v, req=%s,%v", err, req.BulkScanId, req.ScanIds)
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, statuses)
}

func (h *Handler) complianceStatusScanHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanStatusReq
	err := httpext.DecodeJSON(r, httpext.QueryParams, MaxSbomRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	var statuses model.ComplianceScanStatusResp
	if req.BulkScanId != "" {
		statuses, err = reporters_scan.GetComplianceBulkScans(r.Context(), scan_type, req.BulkScanId)
	} else {
		statuses, err = reporters_scan.GetComplianceScanStatus(r.Context(), scan_type, req.ScanIds)
	}

	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, statuses)
}

func (h *Handler) ListVulnerabilityScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) ListSecretScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) ListComplianceScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) ListMalwareScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4J_MALWARE_SCAN)
}

func (h *Handler) ListCloudComplianceScansHandler(w http.ResponseWriter, r *http.Request) {
	h.listScansHandler(w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
}

func (h *Handler) listScansHandler(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req model.ScanListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	infos, err := reporters_scan.GetScansList(r.Context(), scan_type, req.NodeIds, req.FieldsFilter, req.Window)
	if err == reporters.NotFoundErr {
		err = &NotFoundError{err}
	}

	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		h.respondError(err, w)
		return
	}

	for i := range infos.ScansInfo {
		counts, err := reporters_scan.GetSevCounts(r.Context(), scan_type, infos.ScansInfo[i].ScanId)
		infos.ScansInfo[i].SeverityCounts = counts
		if err != nil {
			log.Error().Err(err).Msg("Counts computation issue")
		}
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func (h *Handler) ListVulnerabilityScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Vulnerability](w, r, utils.NEO4J_VULNERABILITY_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}
	counts, err := reporters_scan.GetSevCounts(r.Context(), utils.NEO4J_VULNERABILITY_SCAN, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.VulnerabilityScanResult{
		Vulnerabilities: entries, ScanResultsCommon: common, SeverityCounts: counts})
}

func (h *Handler) ListSecretScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Secret](w, r, utils.NEO4J_SECRET_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	counts, err := reporters_scan.GetSevCounts(r.Context(), utils.NEO4J_SECRET_SCAN, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.SecretScanResult{
		Secrets: entries, ScanResultsCommon: common, SeverityCounts: counts})
}

func (h *Handler) ListSecretScanResultRulesHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Secret](w, r, utils.NEO4J_SECRET_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	rules := []string{}
	for _, e := range entries {
		rules = append(rules, e.Name)
	}

	httpext.JSON(w, http.StatusOK, model.SecretScanResultRules{Rules: lo.Uniq(rules)})
}

func (h *Handler) ListComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Compliance](w, r, utils.NEO4J_COMPLIANCE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}
	additionalInfo, err := reporters_scan.GetCloudComplianceStats(r.Context(), common.ScanID, utils.NEO4J_COMPLIANCE_SCAN)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.ComplianceScanResult{Compliances: entries, ScanResultsCommon: common,
		ComplianceAdditionalInfo: additionalInfo})
}

func (h *Handler) ListMalwareScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	counts, err := reporters_scan.GetSevCounts(r.Context(), utils.NEO4J_MALWARE_SCAN, common.ScanID)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.MalwareScanResult{Malwares: entries, ScanResultsCommon: common, SeverityCounts: counts})
}

func (h *Handler) ListMalwareScanResultRulesHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	rules := []string{}
	for _, e := range entries {
		rules = append(rules, e.RuleName)
	}

	httpext.JSON(w, http.StatusOK, model.MalwareScanResultRules{Rules: lo.Uniq(rules)})
}

func (h *Handler) ListMalwareScanResultClassHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	class := []string{}
	for _, e := range entries {
		class = append(class, e.Class)
	}

	httpext.JSON(w, http.StatusOK, model.MalwareScanResultClass{Class: lo.Uniq(class)})
}

func (h *Handler) ListCloudComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, common, err := listScanResultsHandler[model.CloudCompliance](w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	additionalInfo, err := reporters_scan.GetCloudComplianceStats(r.Context(), common.ScanID, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		log.Error().Err(err).Msg("Counts computation issue")
	}

	httpext.JSON(w, http.StatusOK, model.CloudComplianceScanResult{Compliances: entries, ScanResultsCommon: common,
		ComplianceAdditionalInfo: additionalInfo})
}

func (h *Handler) CountVulnerabilityScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Vulnerability](w, r, utils.NEO4J_VULNERABILITY_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
}

func (h *Handler) CountSecretScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Secret](w, r, utils.NEO4J_SECRET_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
}

func (h *Handler) CountComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Compliance](w, r, utils.NEO4J_COMPLIANCE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
}

func (h *Handler) CountMalwareScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.Malware](w, r, utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
}

func (h *Handler) CountCloudComplianceScanResultsHandler(w http.ResponseWriter, r *http.Request) {
	entries, _, err := listScanResultsHandler[model.CloudCompliance](w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(entries),
	})
}

func groupSecrets(ctx context.Context) ([]reporters_search.ResultGroup, error) {
	results := []reporters_search.ResultGroup{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return results, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return results, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return results, err
	}
	defer tx.Close()

	query := `
	MATCH (n:Secret)-[:IS]->(m:SecretRule)
	WHERE exists((n)<-[:DETECTED]-(:SecretScan))
	RETURN m.name as name, n.level as severity, count(*) as count
	`

	res, err := tx.Run(query, map[string]interface{}{})
	if err != nil {
		return results, err
	}

	recs, err := res.Collect()
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

	httpext.JSON(w, http.StatusOK, reporters_search.ResultGroupResp{
		Groups: groups,
	})
}

func groupMalwares(ctx context.Context, byClass bool) ([]reporters_search.ResultGroup, error) {
	results := []reporters_search.ResultGroup{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return results, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return results, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return results, err
	}
	defer tx.Close()

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

	res, err := tx.Run(query, map[string]interface{}{})
	if err != nil {
		return results, err
	}

	recs, err := res.Collect()
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

	httpext.JSON(w, http.StatusOK, reporters_search.ResultGroupResp{
		Groups: groups,
	})
}

func (h *Handler) GroupMalwareClassResultsHandler(w http.ResponseWriter, r *http.Request) {

	groups, err := groupMalwares(r.Context(), true)
	if err != nil {
		log.Error().Err(err).Msg("failed to group malwares")
		h.respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, reporters_search.ResultGroupResp{
		Groups: groups,
	})
}

func (h *Handler) CloudComplianceFiltersHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.FiltersReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	res, err := reporters_scan.GetFilters(r.Context(), req.Having, utils.ScanTypeDetectedNode[utils.NEO4J_CLOUD_COMPLIANCE_SCAN], req.RequiredFilters)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	httpext.JSON(w, http.StatusOK, model.FiltersResult{Filters: res})
}

func (h *Handler) ComplianceFiltersHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.FiltersReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	res, err := reporters_scan.GetFilters(r.Context(), req.Having, utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN], req.RequiredFilters)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
	}
	httpext.JSON(w, http.StatusOK, model.FiltersResult{Filters: res})
}

func listScanResultsHandler[T any](w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) ([]T, model.ScanResultsCommon, error) {
	defer r.Body.Close()
	var req model.ScanResultsReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		return nil, model.ScanResultsCommon{}, &BadDecoding{err}
	}

	entries, common, err := reporters_scan.GetScanResults[T](r.Context(), scan_type, req.ScanId, req.FieldsFilter, req.Window)
	if err != nil {
		return nil, model.ScanResultsCommon{}, err
	}
	common.ScanID = req.ScanId
	return entries, common, nil
}

func get_node_ids(tx neo4j.Transaction, ids []model.NodeIdentifier, neo4jNode controls.ScanResource, filter reporters.ContainsFilter) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	wherePattern := reporters.ContainsFilter2CypherWhereConditions("n", filter, false)
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
		map[string]interface{}{"ids": reporters_scan.NodeIdentifierToIdList(ids)})
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
		err = reporters_scan.UpdateScanResultMasked(r.Context(), &req, true)
	case "unmask":
		err = reporters_scan.UpdateScanResultMasked(r.Context(), &req, false)
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
		err = reporters_scan.DeleteScan(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID, req.ResultIDs)
		if req.ScanType == string(utils.NEO4J_CLOUD_COMPLIANCE_SCAN) {
			err := h.CachePostureProviders(r.Context())
			if err != nil {
				h.respondError(err, w)
				return
			}
		}
		h.AuditUserActivity(r, req.ScanType, ACTION_DELETE, req, true)
	case "notify":
		if req.NotifyIndividual {
			for _, resultID := range req.ResultIDs {
				err = reporters_scan.NotifyScanResult(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID, []string{resultID})
				if err != nil {
					h.respondError(err, w)
					return
				}
			}
		} else {
			err = reporters_scan.NotifyScanResult(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID, req.ResultIDs)
			if err != nil {
				h.respondError(err, w)
				return
			}
		}
		h.AuditUserActivity(r, req.ScanType, ACTION_NOTIFY, req, true)
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

func getScanResults(ctx context.Context, scanId, scanType string) (model.DownloadScanResultsResponse, error) {
	resp := model.DownloadScanResultsResponse{}
	switch scanType {
	case "VulnerabilityScan":
		result, common, err := reporters_scan.GetScanResults[model.Vulnerability](
			ctx, utils.StringToNeo4jScanType(scanType), scanId,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "SecretScan":
		result, common, err := reporters_scan.GetScanResults[model.Secret](
			ctx, utils.StringToNeo4jScanType(scanType), scanId,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "MalwareScan":
		result, common, err := reporters_scan.GetScanResults[model.Malware](
			ctx, utils.StringToNeo4jScanType(scanType), scanId,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "ComplianceScan":
		result, common, err := reporters_scan.GetScanResults[model.Compliance](
			ctx, utils.StringToNeo4jScanType(scanType), scanId,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	case "CloudComplianceScan":
		result, common, err := reporters_scan.GetScanResults[model.CloudCompliance](
			ctx, utils.StringToNeo4jScanType(scanType), scanId,
			reporters.FieldsFilters{}, model.FetchWindow{})
		if err != nil {
			return resp, err
		}
		resp.ScanInfo = common
		resp.ScanResults = []interface{}{result}
		return resp, nil

	default:
		return resp, incorrectScanTypeError
	}
}

func (h *Handler) scanIdActionHandler(w http.ResponseWriter, r *http.Request, action string) {
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
			"attachment; filename="+strconv.Quote(utils.ScanIdReplacer.Replace(req.ScanID)+".json"))
		w.Header().Set("Content-Type", "application/octet-stream")
		w.WriteHeader(http.StatusOK)
		w.Write(data)
		h.AuditUserActivity(r, req.ScanType, ACTION_DOWNLOAD, req, true)

	case "delete":
		err = reporters_scan.DeleteScan(r.Context(), utils.Neo4jScanType(req.ScanType), req.ScanID, []string{})
		if err != nil {
			h.respondError(err, w)
			return
		}
		if req.ScanType == string(utils.NEO4J_CLOUD_COMPLIANCE_SCAN) {
			err := h.CachePostureProviders(r.Context())
			if err != nil {
				h.respondError(err, w)
				return
			}
		}
		w.WriteHeader(http.StatusNoContent)
		h.AuditUserActivity(r, req.ScanType, ACTION_DELETE, req, true)
	}
}

func (h *Handler) ScanResultDownloadHandler(w http.ResponseWriter, r *http.Request) {
	h.scanIdActionHandler(w, r, "download")
}

func (h *Handler) ScanDeleteHandler(w http.ResponseWriter, r *http.Request) {
	h.scanIdActionHandler(w, r, "delete")
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

	h.AuditUserActivity(r, ACTION_BULK, ACTION_DELETE, req, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) bulkDeleteScanResults(ctx context.Context, req model.BulkDeleteScansRequest) error {
	scanType := utils.DetectedNodeScanType[req.ScanType]
	scansList, err := reporters_scan.GetScansList(ctx, scanType, nil, req.Filters, model.FetchWindow{})
	if err != nil {
		return err
	}

	for _, s := range scansList.ScansInfo {
		log.Info().Msgf("delete scan %s %s", req.ScanType, s.ScanId)
		err = reporters_scan.DeleteScan(ctx, scanType, s.ScanId, []string{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to delete scan id %s", s.ScanId)
			continue
		}
	}

	if len(scansList.ScansInfo) > 0 && (scanType == utils.NEO4J_COMPLIANCE_SCAN || scanType == utils.NEO4J_CLOUD_COMPLIANCE_SCAN) {
		err = h.CachePostureProviders(ctx)
		if err != nil {
			return err
		}
	}
	return nil
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
	resp, err := reporters_scan.GetNodesInScanResults(r.Context(), utils.Neo4jScanType(req.ScanType), req.ResultIDs)
	if err != nil {
		h.respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, resp)
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

	mc, err := directory.MinioClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	switch action {
	case "get":
		sbom := make([]model.SbomResponse, 0)
		runtimeSbom := path.Join("sbom", "runtime-"+utils.ScanIdReplacer.Replace(req.ScanID)+".json")
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
		httpext.JSON(w, http.StatusOK, sbom)
	case "download":
		resp := model.DownloadReportResponse{}
		sbomFile := path.Join("sbom", utils.ScanIdReplacer.Replace(req.ScanID)+".json.gz")
		cd := url.Values{
			"response-content-disposition": []string{
				"attachment; filename=" + strconv.Quote(utils.ScanIdReplacer.Replace(req.ScanID)+".json.gz")},
		}
		url, err := mc.ExposeFile(r.Context(), sbomFile, true, DownloadReportUrlExpiry, cd)
		if err != nil {
			log.Error().Msg(err.Error())
			h.respondError(err, w)
			return
		}
		resp.UrlLink = url
		httpext.JSON(w, http.StatusOK, resp)
		h.AuditUserActivity(r, EVENT_VULNERABILITY_SCAN, ACTION_DOWNLOAD, req, true)
	}
}

func (h *Handler) GetSbomHandler(w http.ResponseWriter, r *http.Request) {
	h.sbomHandler(w, r, "get")
}

func (h *Handler) SbomDownloadHandler(w http.ResponseWriter, r *http.Request) {
	h.sbomHandler(w, r, "download")
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

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	rh, err := get_node_ids(tx, host_ids, controls.Host, filter.HostScanFilter)
	if err != nil {
		return res, err
	}
	res = append(res, rh...)

	if len(filter.ImageScanFilter.FieldsValues["docker_image_name"]) > 0 &&
		len(filter.ImageScanFilter.FieldsValues["docker_image_tag"]) > 0 {
		ri, err := GetImagesFromAdvanceFilter(ctx, image_ids, filter.ImageScanFilter)
		if err != nil {
			return res, err
		}
		res = append(res, ri...)
	} else {
		ri, err := get_node_ids(tx, image_ids, controls.Image, filter.ImageScanFilter)
		if err != nil {
			return res, err
		}
		res = append(res, ri...)
	}

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

func GetImagesFromAdvanceFilter(ctx context.Context, ids []model.NodeIdentifier, filter reporters.ContainsFilter) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})

	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	for i := range filter.FieldsValues["docker_image_name"] {
		rr, err := tx.Run(`
		MATCH (n:ContainerImage)-[:IS]->(m:ImageStub)
		WHERE n.node_id IN $ids
		AND m.docker_image_name = $image_name
		RETURN n.node_id, n.updated_at, n.docker_image_tag
		`, map[string]interface{}{
			"ids":        reporters_scan.NodeIdentifierToIdList(ids),
			"image_name": filter.FieldsValues["docker_image_name"][i],
		})
		if err != nil {
			return res, err
		}

		rec, err := rr.Collect()
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
						NodeId:   rec[j].Values[0].(string),
						NodeType: controls.ResourceTypeToString(controls.Image),
					})
					break
				}
			}
		case "all":
			for j := range rec {
				res = append(res, model.NodeIdentifier{
					NodeId:   rec[j].Values[0].(string),
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
				NodeId:   recentNodeID,
				NodeType: controls.ResourceTypeToString(controls.Image),
			})
		}
	}
	return res, nil
}

func FindImageRegistryIds(ctx context.Context, image_id string) ([]int32, error) {
	res := []int32{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (n:ContainerImage{node_id:$node_id})
		MATCH (m:RegistryAccount) -[:HOSTS]-> (n)
		RETURN m.container_registry_ids
		LIMIT 1`,
		map[string]interface{}{"node_id": image_id})
	if err != nil {
		return res, err
	}

	rec, err := nres.Single()
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
		if nodes[i].NodeType == controls.ResourceTypeToString(ctl.KubernetesCluster) {
			clusterNodes = append(clusterNodes, nodes[i])
		} else if nodes[i].NodeType == controls.ResourceTypeToString(ctl.RegistryAccount) {
			registryNodes = append(registryNodes, nodes[i])
		} else if nodes[i].NodeType == controls.ResourceTypeToString(ctl.Pod) {
			podNodes = append(podNodes, nodes[i])
		} else {
			regularNodes = append(regularNodes, nodes[i])
		}
	}

	return regularNodes, clusterNodes, registryNodes, podNodes
}

func StartMultiScan(ctx context.Context,
	gen_bulk_id bool,
	scan_type utils.Neo4jScanType,
	req model.ScanTriggerCommon,
	actionBuilder func(string, model.NodeIdentifier, int32) (ctl.Action, error)) ([]string, string, error) {

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, "", err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, "", err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return nil, "", err
	}

	regular, k8s, registry, pods := extractBulksNodes(req.NodeIds)

	image_nodes, err := reporters_scan.GetRegistriesImageIDs(ctx, registry)
	if err != nil {
		return nil, "", err
	}

	k8s_host_nodes, err := reporters_scan.GetKubernetesHostsIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	k8s_image_nodes, err := reporters_scan.GetKubernetesImageIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	k8s_container_nodes, err := reporters_scan.GetKubernetesContainerIDs(ctx, k8s)
	if err != nil {
		return nil, "", err
	}

	pod_container_nodes, err := reporters_scan.GetPodContainerIDs(ctx, pods)
	if err != nil {
		log.Info().Msgf("Error in reporters_scan.GetPodContainerIDs:%v", err)
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

	if len(pod_container_nodes) > 0 {
		reqs = append(reqs, pod_container_nodes...)
	}

	defer tx.Close()
	scanIds := []string{}
	for _, req := range reqs {
		if req.NodeType == ctl.ResourceTypeToString(controls.Pod) {
			continue
		}

		scanId := scanId(req)

		registryId := int32(-1)
		if req.NodeType == ctl.ResourceTypeToString(controls.Image) {
			registryIds, err := FindImageRegistryIds(ctx, req.NodeId)
			if err != nil {
				return nil, "", err
			}

			if len(registryIds) != 0 {
				registryId = registryIds[0]
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
			} else if _, is = err.(*ingesters.AgentNotInstalledError); is {
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

func StartMultiCloudComplianceScan(ctx context.Context, reqs []model.NodeIdentifier, benchmarkTypes []string) ([]string, string, error) {
	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, "", err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, "", err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return nil, "", err
	}

	defer tx.Close()
	scanIds := []string{}

	for _, req := range reqs {
		scanId := cloudComplianceScanId(req.NodeId)

		err = ingesters.AddNewCloudComplianceScan(ingesters.WriteDBTransaction{Tx: tx},
			scanId,
			benchmarkTypes,
			req.NodeId,
			reqs[0].NodeType)

		if err != nil {
			log.Info().Msgf("Error in AddNewCloudComplianceScan:%v", err)
			if e, is := err.(*ingesters.AlreadyRunningScanError); is {
				scanIds = append(scanIds, e.ScanId)
				continue
			} else if _, is = err.(*ingesters.AgentNotInstalledError); is {
				continue
			}
			log.Error().Msgf("%v", err)
			return nil, "", err
		}
		scanIds = append(scanIds, scanId)
	}

	if len(scanIds) == 0 {
		return []string{}, "", nil
	}

	var bulkId string

	bulkId = bulkScanId()
	scanType := utils.NEO4J_CLOUD_COMPLIANCE_SCAN
	if reqs[0].NodeType == controls.ResourceTypeToString(controls.KubernetesCluster) || reqs[0].NodeType == controls.ResourceTypeToString(controls.Host) {
		scanType = utils.NEO4J_COMPLIANCE_SCAN
	}
	err = ingesters.AddBulkScan(ingesters.WriteDBTransaction{Tx: tx}, scanType, bulkId, scanIds)
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
		scanId := cloudComplianceScanId(req.NodeId)
		scanIds = append(scanIds, scanId)
	}
	return scanIds, bulkId, nil
}

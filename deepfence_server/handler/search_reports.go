package handler

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) NodeCountHandler(w http.ResponseWriter, r *http.Request) {
	counts, err := reporters_search.CountNodes(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, counts)
}

func SearchCountHandler[T reporters.CypherableAndCategorizable](w http.ResponseWriter, r *http.Request, h *Handler) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	// Optimize query for counting
	var dummy T
	dummy_ff := reporters_search.SearchFilter{
		InFieldFilter: []string{dummy.GetJsonCategory()},
		Filters:       req.NodeFilter.Filters,
	}

	dummy_ext_ff := reporters_search.SearchFilter{
		InFieldFilter: []string{dummy.GetJsonCategory()},
		Filters:       req.ExtendedNodeFilter.Filters,
	}

	entries, err := reporters_search.SearchReport[T](r.Context(), dummy_ff, dummy_ext_ff, req.IndirectFilters, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	counts := reporters.GetCategoryCounts(entries)

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count:      len(entries),
		Categories: counts,
	})

	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func SearchCloudNodeHandler[T reporters.Cypherable](w http.ResponseWriter, r *http.Request, h *Handler) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	entries, err := reporters_search.SearchCloudNodeReport[T](r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, entries)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

// SearchCloudNodeCountHandler TODO: Handle Generic more gracefully
func SearchCloudNodeCountHandler[T reporters.CypherableAndCategorizable](w http.ResponseWriter, r *http.Request, h *Handler) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	dummy_ff := reporters_search.SearchFilter{
		Filters: req.NodeFilter.Filters,
	}

	entries, err := reporters_search.SearchCloudNodeReport[T](r.Context(), dummy_ff, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	counts := reporters.GetCategoryCounts(entries)

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count:      len(entries),
		Categories: counts,
	})

	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func SearchHandler[T reporters.Cypherable](w http.ResponseWriter, r *http.Request, h *Handler) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	entries, err := reporters_search.SearchReport[T](r.Context(), req.NodeFilter, req.ExtendedNodeFilter, req.IndirectFilters, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, entries)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func SearchCloudResourcesHandler(w http.ResponseWriter, r *http.Request, h *Handler) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	entries, err := reporters_search.SearchReport[model.CloudResource](r.Context(), req.NodeFilter, req.ExtendedNodeFilter, req.IndirectFilters, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	accountIDs := make(map[string]model.CloudNode)
	for _, entry := range entries {
		if entry.AccountId == "" {
			continue
		}
		if _, ok := accountIDs[entry.AccountId]; !ok {
			accountIDs[entry.AccountId] = model.CloudNode{}
		}
	}

	searchFilter := reporters_search.SearchFilter{
		Filters: reporters.FieldsFilters{
			ContainsFilter: reporters.ContainsFilter{FieldsValues: map[string][]interface{}{"node_id": {}}},
		},
	}
	for accountId := range accountIDs {
		searchFilter.Filters.ContainsFilter.FieldsValues["node_id"] = append(searchFilter.Filters.ContainsFilter.FieldsValues["node_id"], accountId)
	}
	accountIdEntries, err := reporters_search.SearchReport[model.CloudNode](r.Context(), searchFilter, reporters_search.SearchFilter{}, nil, model.FetchWindow{})
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	for _, accountIdEntry := range accountIdEntries {
		accountIDs[accountIdEntry.ID] = accountIdEntry
	}
	for i, entry := range entries {
		if entry.AccountId == "" {
			continue
		}
		entries[i].CloudComplianceLatestScanId = accountIDs[entry.AccountId].CloudComplianceLatestScanId
		entries[i].CloudCompliancesCount = accountIDs[entry.AccountId].CloudCompliancesCount
		entries[i].CloudComplianceScanStatus = accountIDs[entry.AccountId].CloudComplianceScanStatus
	}

	err = httpext.JSON(w, http.StatusOK, entries)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchHosts(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Host](w, r, h)
}

func (h *Handler) SearchContainers(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Container](w, r, h)
}

func (h *Handler) SearchContainerImages(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.ContainerImage](w, r, h)
}

func (h *Handler) SearchVulnerabilities(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Vulnerability](w, r, h)
}

func (h *Handler) SearchSecrets(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Secret](w, r, h)
}

func (h *Handler) SearchMalwares(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Malware](w, r, h)
}

func (h *Handler) SearchCloudCompliances(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.CloudCompliance](w, r, h)
}

func (h *Handler) SearchCloudResources(w http.ResponseWriter, r *http.Request) {
	SearchCloudResourcesHandler(w, r, h)
}

func (h *Handler) SearchKubernetesClusters(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.KubernetesCluster](w, r, h)
}

func (h *Handler) SearchPods(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Pod](w, r, h)
}

func (h *Handler) SearchCompliances(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Compliance](w, r, h)
}

func (h *Handler) SearchSecretRules(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.SecretRule](w, r, h)
}

func (h *Handler) SearchMalwareRules(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.MalwareRule](w, r, h)
}

func (h *Handler) SearchComplianceRules(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.ComplianceRule](w, r, h)
}

func (h *Handler) SearchVulnerabilityRules(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.VulnerabilityRule](w, r, h)
}

func (h *Handler) SearchVulnerabilityScans(w http.ResponseWriter, r *http.Request) {
	h.SearchScans(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) SearchSecretScans(w http.ResponseWriter, r *http.Request) {
	h.SearchScans(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) SearchMalwareScans(w http.ResponseWriter, r *http.Request) {
	h.SearchScans(w, r, utils.NEO4J_MALWARE_SCAN)
}

func (h *Handler) SearchComplianceScans(w http.ResponseWriter, r *http.Request) {
	h.SearchScans(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) SearchCloudComplianceScans(w http.ResponseWriter, r *http.Request) {
	h.SearchScans(w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
}

func (h *Handler) SearchCloudNodes(w http.ResponseWriter, r *http.Request) {
	SearchCloudNodeHandler[model.CloudNodeAccountInfo](w, r, h)
}

func (h *Handler) NodeCount(w http.ResponseWriter, r *http.Request) {
	h.NodeCountHandler(w, r)
}

func (h *Handler) SearchHostsCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.Host](w, r, h)
}

func (h *Handler) SearchContainersCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.Container](w, r, h)
}

func (h *Handler) SearchContainerImagesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.ContainerImage](w, r, h)
}

func (h *Handler) SearchVulnerabilitiesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.Vulnerability](w, r, h)
}

func (h *Handler) SearchSecretsCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.Secret](w, r, h)
}

func (h *Handler) SearchMalwaresCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.Malware](w, r, h)
}

func (h *Handler) SearchCloudCompliancesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.CloudCompliance](w, r, h)
}

func (h *Handler) SearchCloudResourcesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.CloudResource](w, r, h)
}

func (h *Handler) SearchKubernetesClustersCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.KubernetesCluster](w, r, h)
}

func (h *Handler) SearchPodsCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.Pod](w, r, h)
}

func (h *Handler) SearchCloudAccountCount(w http.ResponseWriter, r *http.Request) {
	SearchCloudNodeCountHandler[model.CloudNodeAccountInfo](w, r, h)
}

func (h *Handler) SearchCompliancesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.Compliance](w, r, h)
}

func (h *Handler) SearchSecretRulesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.SecretRule](w, r, h)
}

func (h *Handler) SearchMalwareRulesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.MalwareRule](w, r, h)
}

func (h *Handler) SearchComplianceRulesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.ComplianceRule](w, r, h)
}

func (h *Handler) SearchVulnerabilityRulesCount(w http.ResponseWriter, r *http.Request) {
	SearchCountHandler[model.VulnerabilityRule](w, r, h)
}

func (h *Handler) SearchVulnerabilityScansCount(w http.ResponseWriter, r *http.Request) {
	h.SearchScansCount(w, r, utils.NEO4J_VULNERABILITY_SCAN)
}

func (h *Handler) SearchSecretScansCount(w http.ResponseWriter, r *http.Request) {
	h.SearchScansCount(w, r, utils.NEO4J_SECRET_SCAN)
}

func (h *Handler) SearchMalwareScansCount(w http.ResponseWriter, r *http.Request) {
	h.SearchScansCount(w, r, utils.NEO4J_MALWARE_SCAN)
}

func (h *Handler) SearchComplianceScansCount(w http.ResponseWriter, r *http.Request) {
	h.SearchScansCount(w, r, utils.NEO4J_COMPLIANCE_SCAN)
}

func (h *Handler) SearchCloudComplianceScansCount(w http.ResponseWriter, r *http.Request) {
	h.SearchScansCount(w, r, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
}

func (h *Handler) SearchScans(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	hosts, err := reporters_search.SearchScansReport(r.Context(), req, scan_type)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchScansCount(w http.ResponseWriter, r *http.Request, scan_type utils.Neo4jScanType) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	hosts, err := reporters_search.SearchScansReport(r.Context(), req, scan_type)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: len(hosts),
	})
	if err != nil {
		log.Error().Msg(err.Error())
	}

}

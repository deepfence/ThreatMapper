package handler

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

//func (h *Handler) SearchCount(w http.ResponseWriter, r *http.Request) {
//	defer r.Body.Close()
//	var req reporters_search.SearchNodeReq
//	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
//
//	hosts, err := reporters_search.SearchCountReport(r.Context(), req.NodeFilter, req.Window)
//	if err != nil {
//		log.Error().Msg(err.Error())
//		http.Error(w, "Error processing request body", http.StatusBadRequest)
//	}
//
//	err = httpext.JSON(w, http.StatusOK, hosts)
//	if err != nil {
//		log.Error().Msg(err.Error())
//	}
//}

func SearchHandler[T model.Cypherable](w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchReport[T](r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchHosts(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Host](w, r)
}

func (h *Handler) SearchContainers(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Container](w, r)
}

func (h *Handler) SearchContainerImages(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.ContainerImage](w, r)
}

func (h *Handler) SearchVulnerabilities(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Vulnerability](w, r)
}

func (h *Handler) SearchSecrets(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Secret](w, r)
}

func (h *Handler) SearchMalwares(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Malware](w, r)
}

func (h *Handler) SearchCloudCompliances(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.CloudCompliance](w, r)
}

func (h *Handler) SearchCompliances(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Compliance](w, r)
}

func (h *Handler) SearchHostsCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Host](w, r)
}

func (h *Handler) SearchContainersCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Container](w, r)
}

func (h *Handler) SearchContainerImagesCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.ContainerImage](w, r)
}

func (h *Handler) SearchVulnerabilitiesCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Vulnerability](w, r)
}

func (h *Handler) SearchSecretsCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Secret](w, r)
}

func (h *Handler) SearchMalwaresCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Malware](w, r)
}

func (h *Handler) SearchCloudCompliancesCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.CloudCompliance](w, r)
}

func (h *Handler) SearchCompliancesCount(w http.ResponseWriter, r *http.Request) {
	SearchHandler[model.Compliance](w, r)
}

func (h *Handler) SearchVulnerabilityScans(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchScansReport(r.Context(), req, utils.NEO4J_VULNERABILITY_SCAN)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchSecretScans(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchScansReport(r.Context(), req, utils.NEO4J_SECRET_SCAN)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchMalwareScans(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchScansReport(r.Context(), req, utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchComplianceScans(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchScansReport(r.Context(), req, utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchCloudComplianceScans(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchScansReport(r.Context(), req, utils.NEO4J_COMPLIANCE_SCAN)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

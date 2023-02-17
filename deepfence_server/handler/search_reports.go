package handler

import (
	"net/http"

	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) SearchHosts(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchHostsReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchContainers(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchContainersReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchContainerImages(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchContainerImagesReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchVulnerabilities(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchVulnerabilitiesReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchSecrets(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchSecretsReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchMalwares(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchMalwaresReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchCloudCompliances(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchCloudCompliancesReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchCompliances(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchNodeReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchCompliancesReport(r.Context(), req.NodeFilter, req.Window)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SearchVulnerabilityScans(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_search.SearchScanReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_search.SearchVulnerabilityScansReport(r.Context(), req)
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

	hosts, err := reporters_search.SearchSecretScansReport(r.Context(), req)
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

	hosts, err := reporters_search.SearchMalwareScansReport(r.Context(), req)
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

	hosts, err := reporters_search.SearchComplianceScansReport(r.Context(), req)
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

	hosts, err := reporters_search.SearchCloudComplianceScansReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

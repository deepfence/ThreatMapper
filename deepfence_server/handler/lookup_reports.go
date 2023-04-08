package handler

import (
	"net/http"

	reporters_lookup "github.com/deepfence/ThreatMapper/deepfence_server/reporters/lookup"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetHosts(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := reporters_lookup.GetHostsReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetContainers(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	containers, err := reporters_lookup.GetContainersReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, containers)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetProcesses(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	processes, err := reporters_lookup.GetProcessesReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, processes)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetKubernetesClusters(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	clusters, err := reporters_lookup.GetKubernetesClustersReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, clusters)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetContainerImages(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	images, err := reporters_lookup.GetContainerImagesReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, images)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetPods(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	pods, err := reporters_lookup.GetPodsReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, pods)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetRegistryAccount(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	registry, err := reporters_lookup.GetRegistryAccountReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, registry)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetCloudResources(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	resources, err := reporters_lookup.GetCloudResourcesReport(r.Context(), req)
	if err != nil {
		log.Error().Msg(err.Error())
		http.Error(w, "Error processing request body", http.StatusBadRequest)
		return
	}

	err = httpext.JSON(w, http.StatusOK, resources)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

package handler

import (
	"context"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_lookup "github.com/deepfence/ThreatMapper/deepfence_server/reporters/lookup"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func getGeneric[T any](h *Handler, w http.ResponseWriter, r *http.Request, getter func(context.Context, reporters_lookup.LookupFilter) ([]T, error)) {
	defer r.Body.Close()
	var req reporters_lookup.LookupFilter
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	hosts, err := getter(r.Context(), req)
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

func (h *Handler) GetHosts(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Host](h, w, r, reporters_lookup.GetHostsReport)
}

func (h *Handler) GetContainers(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Container](h, w, r, reporters_lookup.GetContainersReport)
}

func (h *Handler) GetProcesses(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Process](h, w, r, reporters_lookup.GetProcessesReport)
}

func (h *Handler) GetKubernetesClusters(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.KubernetesCluster](h, w, r, reporters_lookup.GetKubernetesClustersReport)
}

func (h *Handler) GetContainerImages(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.ContainerImage](h, w, r, reporters_lookup.GetContainerImagesReport)
}

func (h *Handler) GetPods(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Pod](h, w, r, reporters_lookup.GetPodsReport)
}

func (h *Handler) GetRegistryAccount(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.RegistryAccount](h, w, r, reporters_lookup.GetRegistryAccountReport)
}

func (h *Handler) GetCloudResources(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.CloudResource](h, w, r, reporters_lookup.GetCloudResourcesReport)
}

func (h *Handler) GetVulnerabilities(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Vulnerability](h, w, r, reporters_lookup.GetVulnerabilitiesReport)
}

func (h *Handler) GetSecrets(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Secret](h, w, r, reporters_lookup.GetSecretsReport)
}

func (h *Handler) GetMalwares(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Malware](h, w, r, reporters_lookup.GetMalwaresReport)
}

func (h *Handler) GetCompliances(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.Compliance](h, w, r, reporters_lookup.GetComplianceReport)
}

func (h *Handler) GetCloudCompliances(w http.ResponseWriter, r *http.Request) {
	getGeneric[model.CloudCompliance](h, w, r, reporters_lookup.GetCloudComplianceReport)
}

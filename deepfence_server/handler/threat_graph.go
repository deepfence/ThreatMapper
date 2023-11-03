package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_graph "github.com/deepfence/ThreatMapper/deepfence_server/reporters/graph"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetThreatGraph(w http.ResponseWriter, r *http.Request) {

	ctx := r.Context()

	if err := r.ParseForm(); err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	filters := reporters_graph.ThreatFilters{
		IssueType:   "all",
		AwsFilter:   reporters_graph.CloudProviderFilter{AccountIds: nil},
		GcpFilter:   reporters_graph.CloudProviderFilter{AccountIds: nil},
		AzureFilter: reporters_graph.CloudProviderFilter{AccountIds: nil},
	}
	err = json.Unmarshal(body, &filters)
	if err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	reporter, err := reporters_graph.NewThreatGraphReporter(ctx)

	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	graph, err := reporter.GetThreatGraph(ctx, filters)
	if err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	respondWith(ctx, w, http.StatusOK, graph)
}

func (h *Handler) GetIndividualThreatGraph(w http.ResponseWriter, r *http.Request) {
	var req reporters_graph.IndividualThreatGraphRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	var individualThreatGraph []reporters_graph.IndividualThreatGraph
	switch req.IssueType {
	case "vulnerability":
		individualThreatGraph, err = reporters_graph.GetIndividualThreatGraph[model.Vulnerability](
			r.Context(),
			req.GraphType,
			req.NodeIds)
	case "secret":
		individualThreatGraph, err = reporters_graph.GetIndividualThreatGraph[model.Secret](
			r.Context(),
			req.GraphType,
			req.NodeIds)
	case "malware":
		individualThreatGraph, err = reporters_graph.GetIndividualThreatGraph[model.Malware](
			r.Context(),
			req.GraphType,
			req.NodeIds)
	case "compliance":
		individualThreatGraph, err = reporters_graph.GetIndividualThreatGraph[model.Compliance](
			r.Context(),
			req.GraphType,
			req.NodeIds)
	case "cloud_compliance":
		individualThreatGraph, err = reporters_graph.GetIndividualThreatGraph[model.CloudCompliance](
			r.Context(),
			req.GraphType,
			req.NodeIds)
	}

	if err != nil {
		log.Error().Msgf("Error GetIndividualThreatGraph: %v", err)
		h.respondError(err, w)
		return
	}
	_ = httpext.JSON(w, http.StatusOK, individualThreatGraph)
}

package handler

import (
	"encoding/json"
	"io"
	"net/http"

	reporters_graph "github.com/deepfence/ThreatMapper/deepfence_server/reporters/graph"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
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
		IssueType: "all",
		AwsFilter: reporters_graph.CloudProviderFilter{AccountIds: nil},
		GcpFilter: reporters_graph.CloudProviderFilter{AccountIds: nil},
		AzureFilter: reporters_graph.CloudProviderFilter{AccountIds: nil},
	}
	err = json.Unmarshal(body, &filters)

	reporter, err := reporters_graph.NewThreatGraphReporter(ctx)

	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	graph, err := reporter.GetThreatGraph(filters)
	if err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	respondWith(ctx, w, http.StatusOK, graph)
}

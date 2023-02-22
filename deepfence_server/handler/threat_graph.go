package handler

import (
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

	reporter, err := reporters_graph.NewThreatGraphReporter(ctx)

	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	if err := reporter.ComputeThreatGraph(); err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}
	graph, err := reporter.GetThreatGraph()
	if err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	respondWith(ctx, w, http.StatusOK, graph)
}

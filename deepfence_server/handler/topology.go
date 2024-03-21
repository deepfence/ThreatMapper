package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/render/detailed"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	reportersGraph "github.com/deepfence/ThreatMapper/deepfence_server/reporters/graph"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

var (
	inboundInternetNode = detailed.NodeSummary{
		ID:                "in-the-internet",
		Label:             "The Internet (Inbound)",
		ImmediateParentID: "",
		Type:              "pseudo",
	}
	outboundInternetNode = detailed.NodeSummary{
		ID:                "out-the-internet",
		Label:             "The Internet (Outbound)",
		ImmediateParentID: "",
		Type:              "pseudo",
	}
)

var topologyReporters sync.Map

func init() {
	topologyReporters = sync.Map{}
}

func getTopologyReporter(ctx context.Context) (reportersGraph.TopologyReporter, error) {
	nid, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	ing, has := topologyReporters.Load(nid)
	if has {
		return ing.(reportersGraph.TopologyReporter), nil
	}
	newEntry, err := reportersGraph.NewNeo4jCollector(ctx)
	if err != nil {
		return nil, err
	}
	trueEntry, loaded := topologyReporters.LoadOrStore(nid, newEntry)
	if loaded {
		newEntry.Close()
	}
	return trueEntry.(reportersGraph.TopologyReporter), nil
}

func (h *Handler) GetTopologyGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reportersGraph.TopologyFilters, reporter reportersGraph.TopologyReporter) (reportersGraph.RenderedGraph, error) {
		return reporter.Graph(ctx, filters)
	})
}

func (h *Handler) GetTopologyHostsGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reportersGraph.TopologyFilters, reporter reportersGraph.TopologyReporter) (reportersGraph.RenderedGraph, error) {
		return reporter.HostGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyKubernetesGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reportersGraph.TopologyFilters, reporter reportersGraph.TopologyReporter) (reportersGraph.RenderedGraph, error) {
		return reporter.KubernetesGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyContainersGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reportersGraph.TopologyFilters, reporter reportersGraph.TopologyReporter) (reportersGraph.RenderedGraph, error) {
		return reporter.ContainerGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyPodsGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reportersGraph.TopologyFilters, reporter reportersGraph.TopologyReporter) (reportersGraph.RenderedGraph, error) {
		return reporter.PodGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyDelta(w http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	var deltaReq model.TopologyDeltaReq
	err := httpext.DecodeJSON(req, httpext.NoQueryParams, MaxPostRequestSize, &deltaReq)
	if err != nil {
		log.Error().Msgf("Failed to DecodeJSON: %v", err)
		h.respondError(err, w)
		return
	}

	err = h.Validator.Struct(deltaReq)
	if err != nil {
		log.Error().Msgf("Failed to validate the request: %v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	ctx := req.Context()
	delta, err := reportersGraph.GetTopologyDelta(ctx, deltaReq)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, delta)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) getTopologyGraph(w http.ResponseWriter, req *http.Request, getGraph func(context.Context, reportersGraph.TopologyFilters, reportersGraph.TopologyReporter) (reportersGraph.RenderedGraph, error)) {

	ctx := req.Context()

	ctx, span := telemetry.NewSpan(ctx, "toploogy", "get-topology-graph")
	defer span.End()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	filters := reportersGraph.TopologyFilters{
		CloudFilter:      []string{},
		RegionFilter:     []string{},
		KubernetesFilter: []string{},
		HostFilter:       []string{},
		PodFilter:        []string{},
	}
	err = json.Unmarshal(body, &filters)

	if err != nil {
		http.Error(w, "Error unmarshalling request body", http.StatusBadRequest)
		return
	}

	log.Info().Msgf("filters: %v", filters)

	reporter, err := getTopologyReporter(ctx)

	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	graph, err := getGraph(ctx, filters, reporter)
	if err != nil {
		log.Error().Msgf("Error getGraph: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	newTopo, newConnections := graphToSummaries(graph, filters.CloudFilter, filters.RegionFilter, filters.KubernetesFilter, filters.HostFilter)

	respondWith(ctx, w, http.StatusOK, model.GraphResult{Nodes: newTopo, Edges: newConnections})
}

func graphToSummaries(
	graph reportersGraph.RenderedGraph,
	providerFilter,
	regionFilter,
	kubernetesFilter,
	hostFilter []string,
) (detailed.NodeSummaries, detailed.TopologyConnectionSummaries) {
	nodes := detailed.NodeSummaries{}
	edges := detailed.TopologyConnectionSummaries{}

	for _, conn := range graph.Connections {
		leftSplits := strings.Split(conn.Source, ";")
		rightSplits := strings.Split(conn.Target, ";")
		source := ""
		switch {
		case contains(hostFilter, leftSplits[2]):
			if leftSplits[3] != "-1" {
				source = leftSplits[2] + ";" + leftSplits[3]
			} else {
				source = leftSplits[2]
			}
		case contains(regionFilter, leftSplits[1]) || contains(kubernetesFilter, leftSplits[1]):
			source = leftSplits[2]
		case contains(providerFilter, leftSplits[0]):
			source = leftSplits[1]
		default:
			source = leftSplits[0]
		}

		target := ""
		switch {
		case contains(hostFilter, rightSplits[2]):
			if rightSplits[3] != "-1" {
				target = rightSplits[2] + ";" + rightSplits[3]
			} else {
				target = rightSplits[2]
			}
		case contains(regionFilter, rightSplits[1]) || contains(kubernetesFilter, rightSplits[1]):
			target = rightSplits[2]
		case contains(providerFilter, rightSplits[0]):
			target = rightSplits[1]
		default:
			target = rightSplits[0]
		}

		if source == "internet" {
			source = "in-the-internet"
		}
		if target == "internet" {
			target = "out-the-internet"
		}
		// log.Info().Msgf("%v -> %v\n", source, target)
		edges[source+target] = detailed.ConnectionSummary{Source: source, Target: target}
	}

	for _, cpStub := range graph.Providers {
		cp := string(cpStub.ID)
		nodes[cp] = detailed.NodeSummary{
			ID:                string(cpStub.ID),
			Label:             cpStub.Name,
			ImmediateParentID: "",
			Type:              report.CloudProvider,
		}
	}

	for cp, crs := range graph.Kubernetes {
		for _, crStub := range crs {
			cr := string(crStub.ID)
			nodes[cr] = detailed.NodeSummary{
				ID:                string(crStub.ID),
				Label:             crStub.Name,
				ImmediateParentID: string(cp),
				Type:              report.KubernetesCluster,
			}
		}
	}

	for cp, crs := range graph.Regions {
		for _, crStub := range crs {
			cr := string(crStub.ID)
			nodes[cr] = detailed.NodeSummary{
				ID:                string(crStub.ID),
				Label:             crStub.Name,
				ImmediateParentID: string(cp),
				Type:              report.CloudRegion,
			}
		}
	}

	for cr, n := range graph.Hosts {
		for _, hostStub := range n {
			host := string(hostStub.ID)
			nodes[host] = detailed.NodeSummary{
				ID:                string(hostStub.ID),
				Label:             hostStub.Name,
				ImmediateParentID: string(cr),
				Type:              report.Host,
			}
		}
	}

	NodeIDs2strings := func(arr []reportersGraph.NodeID) []string {
		res := []string{}
		for i := range arr {
			res = append(res, string(arr[i]))
		}
		return res
	}

	for cp, crs := range graph.CloudServices {
		for _, crStub := range crs {
			cr := string(crStub.ID)
			nodes[cr] = detailed.NodeSummary{
				ID:                string(crStub.ID),
				Label:             crStub.Name,
				ImmediateParentID: string(cp),
				Type:              crStub.ResourceType,
				IDs:               NodeIDs2strings(crStub.IDs),
			}
		}
	}

	nodes["in-the-internet"] = inboundInternetNode
	nodes["out-the-internet"] = outboundInternetNode

	for h, n := range graph.Processes {
		for _, idStub := range n {
			id := string(idStub.ID)
			nodes[id] = detailed.NodeSummary{
				ID:                string(idStub.ID),
				Label:             idStub.Name,
				ImmediateParentID: string(h),
				Type:              report.Process,
			}
		}
	}

	for h, n := range graph.Pods {
		for _, idStub := range n {
			id := string(idStub.ID)
			nodes[id] = detailed.NodeSummary{
				ID:                string(idStub.ID),
				Label:             idStub.Name,
				ImmediateParentID: string(h),
				Type:              report.Pod,
			}
		}
	}

	for h, n := range graph.Containers {
		for _, idStub := range n {
			id := string(idStub.ID)
			nodes[id] = detailed.NodeSummary{
				ID:                string(idStub.ID),
				Label:             idStub.Name,
				ImmediateParentID: string(h),
				Type:              report.Container,
			}
		}
	}

	return nodes, edges

}

func contains(s []string, str string) bool {
	for _, v := range s {
		if v == str {
			return true
		}
	}
	return false
}

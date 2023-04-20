package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/render/detailed"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	reporters_graph "github.com/deepfence/ThreatMapper/deepfence_server/reporters/graph"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
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

var topology_reporters map[directory.NamespaceID]reporters_graph.TopologyReporter

func init() {
	topology_reporters = map[directory.NamespaceID]reporters_graph.TopologyReporter{}
}

func getTopologyReporter(ctx context.Context) (reporters_graph.TopologyReporter, error) {
	nid, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	ing, has := topology_reporters[nid]
	if has {
		return ing, nil
	}
	new_entry, err := reporters_graph.NewNeo4jCollector(ctx)
	if err != nil {
		return nil, err
	}
	topology_reporters[nid] = new_entry
	return new_entry, nil
}

func (h *Handler) GetTopologyGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters_graph.TopologyFilters, reporter reporters_graph.TopologyReporter) (reporters_graph.RenderedGraph, error) {
		return reporter.Graph(ctx, filters)
	})
}

func (h *Handler) GetTopologyHostsGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters_graph.TopologyFilters, reporter reporters_graph.TopologyReporter) (reporters_graph.RenderedGraph, error) {
		return reporter.HostGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyKubernetesGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters_graph.TopologyFilters, reporter reporters_graph.TopologyReporter) (reporters_graph.RenderedGraph, error) {
		return reporter.KubernetesGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyContainersGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters_graph.TopologyFilters, reporter reporters_graph.TopologyReporter) (reporters_graph.RenderedGraph, error) {
		return reporter.ContainerGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyPodsGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters_graph.TopologyFilters, reporter reporters_graph.TopologyReporter) (reporters_graph.RenderedGraph, error) {
		return reporter.PodGraph(ctx, filters)
	})
}

func (h *Handler) getTopologyGraph(w http.ResponseWriter, req *http.Request, getGraph func(context.Context, reporters_graph.TopologyFilters, reporters_graph.TopologyReporter) (reporters_graph.RenderedGraph, error)) {

	type GraphResult struct {
		Nodes detailed.NodeSummaries               `json:"nodes" required:"true"`
		Edges detailed.TopologyConnectionSummaries `json:"edges" required:"true"`
	}

	ctx := req.Context()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	filters := reporters_graph.TopologyFilters{
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

	respondWith(ctx, w, http.StatusOK, GraphResult{Nodes: newTopo, Edges: newConnections})
}

func graphToSummaries(graph reporters_graph.RenderedGraph, provider_filter, region_filter, kubernetes_filter, host_filter []string) (detailed.NodeSummaries, detailed.TopologyConnectionSummaries) {
	nodes := detailed.NodeSummaries{}
	edges := detailed.TopologyConnectionSummaries{}

	for _, conn := range graph.Connections {
		left_splits := strings.Split(conn.Source, ";")
		right_splits := strings.Split(conn.Target, ";")
		source := ""
		if contains(host_filter, left_splits[2]) {
			source = left_splits[2] + ";" + left_splits[3]
		} else if contains(region_filter, left_splits[1]) || contains(kubernetes_filter, left_splits[1]) {
			source = left_splits[2]
		} else if contains(provider_filter, left_splits[0]) {
			source = left_splits[1]
		} else {
			source = left_splits[0]
		}

		target := ""
		if contains(host_filter, right_splits[2]) {
			target = right_splits[2] + ";" + right_splits[3]
		} else if contains(region_filter, right_splits[1]) || contains(kubernetes_filter, right_splits[1]) {
			target = right_splits[2]
		} else if contains(provider_filter, right_splits[0]) {
			target = right_splits[1]
		} else {
			target = right_splits[0]
		}

		if source == "internet" {
			source = "in-the-internet"
		}
		if target == "internet" {
			target = "out-the-internet"
		}
		//log.Info().Msgf("%v -> %v\n", source, target)
		edges[source+target] = detailed.ConnectionSummary{Source: source, Target: target}
	}

	for _, cp_stub := range graph.Providers {
		cp := string(cp_stub.ID)
		nodes[cp] = detailed.NodeSummary{
			ID:                string(cp_stub.ID),
			Label:             cp_stub.Name,
			ImmediateParentID: "",
			Type:              report.CloudProvider,
		}
	}

	for cp, crs := range graph.Kubernetes {
		for _, cr_stub := range crs {
			cr := string(cr_stub.ID)
			nodes[cr] = detailed.NodeSummary{
				ID:                string(cr_stub.ID),
				Label:             cr_stub.Name,
				ImmediateParentID: string(cp),
				Type:              report.KubernetesCluster,
			}
		}
	}

	for cp, crs := range graph.Regions {
		for _, cr_stub := range crs {
			cr := string(cr_stub.ID)
			nodes[cr] = detailed.NodeSummary{
				ID:                string(cr_stub.ID),
				Label:             cr_stub.Name,
				ImmediateParentID: string(cp),
				Type:              report.CloudRegion,
			}
		}
	}

	for cr, n := range graph.Hosts {
		for _, host_stub := range n {
			host := string(host_stub.ID)
			nodes[host] = detailed.NodeSummary{
				ID:                string(host_stub.ID),
				Label:             host_stub.Name,
				ImmediateParentID: string(cr),
				Type:              report.Host,
			}
		}
	}

	NodeIDs2strings := func(arr []reporters_graph.NodeID) []string {
		res := []string{}
		for i := range arr {
			res = append(res, string(arr[i]))
		}
		return res
	}

	for cp, crs := range graph.CloudServices {
		for _, cr_stub := range crs {
			cr := string(cr_stub.ID)
			nodes[cr] = detailed.NodeSummary{
				ID:                string(cr_stub.ID),
				Label:             cr_stub.Name,
				ImmediateParentID: string(cp),
				Type:              cr_stub.ResourceType,
				IDs:               NodeIDs2strings(cr_stub.IDs),
			}
		}
	}

	nodes["in-the-internet"] = inboundInternetNode
	nodes["out-the-internet"] = outboundInternetNode

	for h, n := range graph.Processes {
		for _, id_stub := range n {
			id := string(id_stub.ID)
			nodes[id] = detailed.NodeSummary{
				ID:                string(id_stub.ID),
				Label:             id_stub.Name,
				ImmediateParentID: string(h),
				Type:              report.Process,
			}
		}
	}

	for h, n := range graph.Pods {
		for _, id_stub := range n {
			id := string(id_stub.ID)
			nodes[id] = detailed.NodeSummary{
				ID:                string(id_stub.ID),
				Label:             id_stub.Name,
				ImmediateParentID: string(h),
				Type:              report.Pod,
			}
		}
	}

	for h, n := range graph.Containers {
		for _, id_stub := range n {
			id := string(id_stub.ID)
			nodes[id] = detailed.NodeSummary{
				ID:                string(id_stub.ID),
				Label:             id_stub.Name,
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

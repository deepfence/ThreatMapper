package handler

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	hst "github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/render/detailed"
	"github.com/weaveworks/scope/report"
)

var topology_reporters map[directory.NamespaceID]reporters.TopologyReporter

func init() {
	agent_report_ingesters = map[directory.NamespaceID]*ingesters.Ingester[report.Report]{}
	topology_reporters = map[directory.NamespaceID]reporters.TopologyReporter{}
}

func getTopologyReporter(ctx context.Context) (reporters.TopologyReporter, error) {
	nid, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	ing, has := topology_reporters[nid]
	if has {
		return ing, nil
	}
	new_entry, err := reporters.NewNeo4jCollector(ctx)
	if err != nil {
		return nil, err
	}
	topology_reporters[nid] = new_entry
	return new_entry, nil
}

func (h *Handler) GetTopologyGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters.TopologyFilters, reporter reporters.TopologyReporter) (reporters.RenderedGraph, error) {
		return reporter.Graph(ctx, filters)
	})
}

func (h *Handler) GetTopologyHostsGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters.TopologyFilters, reporter reporters.TopologyReporter) (reporters.RenderedGraph, error) {
		return reporter.HostGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyKubernetesGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters.TopologyFilters, reporter reporters.TopologyReporter) (reporters.RenderedGraph, error) {
		return reporter.KubernetesGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyContainersGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters.TopologyFilters, reporter reporters.TopologyReporter) (reporters.RenderedGraph, error) {
		return reporter.ContainerGraph(ctx, filters)
	})
}

func (h *Handler) GetTopologyPodsGraph(w http.ResponseWriter, req *http.Request) {
	h.getTopologyGraph(w, req, func(ctx context.Context, filters reporters.TopologyFilters, reporter reporters.TopologyReporter) (reporters.RenderedGraph, error) {
		return reporter.PodGraph(ctx, filters)
	})
}

func (h *Handler) getTopologyGraph(w http.ResponseWriter, req *http.Request, getGraph func(context.Context, reporters.TopologyFilters, reporters.TopologyReporter) (reporters.RenderedGraph, error)) {

	type GraphResult struct {
		Nodes detailed.NodeSummaries               `json:"nodes" required:"true"`
		Edges detailed.TopologyConnectionSummaries `json:"edges" required:"true"`
	}

	ctx := req.Context()

	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	filters := reporters.TopologyFilters{
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
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	newTopo, newConnections := graphToSummaries(graph, filters.CloudFilter, filters.RegionFilter, filters.KubernetesFilter, filters.HostFilter)

	respondWith(ctx, w, http.StatusOK, GraphResult{Nodes: newTopo, Edges: newConnections})
}

func nodeStubToMetadata(stub reporters.NodeStub) []report.MetadataRow {
	return []report.MetadataRow{
		{
			ID:       "id",
			Label:    "ID",
			Value:    string(stub.ID),
			Priority: 1,
		},
		{
			ID:       "label",
			Label:    "Label",
			Value:    stub.Name,
			Priority: 2,
		},
	}
}

func nodeStubToSummary(stub reporters.NodeStub) detailed.BasicNodeSummary {
	return detailed.BasicNodeSummary{
		ID:    string(stub.ID),
		Label: stub.Name,
	}
}

func graphToSummaries(graph reporters.RenderedGraph, provider_filter, region_filter, kubernetes_filter, host_filter []string) (detailed.NodeSummaries, detailed.TopologyConnectionSummaries) {
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
		log.Info().Msgf("%v -> %v\n", source, target)
		edges[source+target] = detailed.ConnectionSummary{Source: source, Target: target}
	}

	nodes["in-the-internet"] = detailed.NodeSummary{
		ImmediateParentID: "",
		BasicNodeSummary: detailed.BasicNodeSummary{
			ID:    "in-the-internet",
			Label: "The Internet",
		},
		Type: "pseudo",
	}

	nodes["out-the-internet"] = detailed.NodeSummary{
		ImmediateParentID: "",
		BasicNodeSummary: detailed.BasicNodeSummary{
			ID:    "out-the-internet",
			Label: "The Internet",
		},
		Type: "pseudo",
	}

	for _, cp_stub := range graph.Providers {
		cp := string(cp_stub.ID)
		nodes[cp] = detailed.NodeSummary{
			ImmediateParentID: "",
			BasicNodeSummary:  nodeStubToSummary(cp_stub),
			Type:              report.CloudProvider,
		}
	}

	for cp, crs := range graph.Kubernetes {
		for _, cr_stub := range crs {
			cr := string(cr_stub.ID)
			nodes[cr] = detailed.NodeSummary{
				ImmediateParentID: string(cp),
				BasicNodeSummary:  nodeStubToSummary(cr_stub),
				Type:              report.KubernetesCluster,
			}
		}
	}

	for cp, crs := range graph.Regions {
		for _, cr_stub := range crs {
			cr := string(cr_stub.ID)
			nodes[cr] = detailed.NodeSummary{
				ImmediateParentID: string(cp),
				BasicNodeSummary:  nodeStubToSummary(cr_stub),
				Type:              report.CloudRegion,
			}
		}
	}

	for cr, n := range graph.Hosts {
		for _, host_stub := range n {
			host := string(host_stub.ID)
			nodes[host] = detailed.NodeSummary{
				ImmediateParentID: string(cr),
				BasicNodeSummary:  nodeStubToSummary(host_stub),
				Metrics: []report.MetricRow{
					{ID: hst.CPUUsage, Metric: &report.Metric{}, Label: "CPU", Value: 0.0, Format: report.PercentFormat, Priority: 1},
					{ID: hst.MemoryUsage, Metric: &report.Metric{}, Label: "Memory", Value: 0.0, Format: report.FilesizeFormat, Priority: 2},
					{ID: hst.Load1, Metric: &report.Metric{}, Label: "Load (1m)", Value: 0.0, Format: report.DefaultFormat, Group: "load", Priority: 11},
				},
				Metadata: []report.MetadataRow{
					{ID: report.KernelVersion, Label: "Kernel version", Value: report.FromLatest, Priority: 1},
					{ID: report.Uptime, Label: "Uptime", Value: report.FromLatest, Priority: 2},
					{ID: report.HostName, Label: "Hostname", Value: host, Priority: 11},
					{ID: report.OS, Label: "OS", Value: report.FromLatest, Priority: 12},
					{ID: hst.LocalNetworks, Label: "Local networks", Value: report.FromSets, Priority: 13},
					{ID: hst.InterfaceNames, Label: "Interface Names", Value: report.FromLatest, Priority: 15},
					//PublicIpAddr:   {ID: PublicIpAddr, Label: "Public IP Address", Value: report.FromLatest, Priority: 16},
					{ID: hst.ProbeId, Label: "Probe ID", Value: report.FromLatest, Priority: 17},
					//ScopeVersion:  {ID: ScopeVersion, Label: "Scope version", Value: report.FromLatest, Priority: 14},
					{ID: hst.InterfaceIPs, Label: "All Interface IP's", Value: report.FromLatest, Priority: 21},
					{ID: report.CloudProvider, Label: "Cloud Provider", Value: report.FromLatest, Priority: 22},
					{ID: report.CloudRegion, Label: "Cloud Region", Value: report.FromLatest, Priority: 23},
					{ID: hst.CloudMetadata, Label: "Cloud Metadata", Value: report.FromLatest, Priority: 24},
					{ID: report.KubernetesClusterId, Label: "Kubernetes Cluster Id", Value: report.FromLatest, Priority: 25},
					{ID: report.KubernetesClusterName, Label: "Kubernetes Cluster Name", Value: report.FromLatest, Priority: 26},
					{ID: hst.UserDfndTags, Label: "User Defined Tags", Value: report.FromLatest, Priority: 27},
					{ID: hst.AgentVersion, Label: "Sensor Version", Value: report.FromLatest, Priority: 28},
					{ID: hst.IsUiVm, Label: "UI vm", Value: "yes", Priority: 29},
					{ID: hst.AgentRunning, Label: "Sensor", Value: "yes", Priority: 33},
				},
				Type: report.Host,
			}
		}
	}

	for h, n := range graph.Processes {
		for _, id_stub := range n {
			id := string(id_stub.ID)
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: string(h),
				BasicNodeSummary:  nodeStubToSummary(id_stub),
				Type:              report.Process,
			}
		}
	}

	for h, n := range graph.Pods {
		for _, id_stub := range n {
			id := string(id_stub.ID)
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: string(h),
				BasicNodeSummary:  nodeStubToSummary(id_stub),
				Type:              report.Pod,
			}
		}
	}

	for h, n := range graph.Containers {
		for _, id_stub := range n {
			id := string(id_stub.ID)
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: string(h),
				BasicNodeSummary:  nodeStubToSummary(id_stub),
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

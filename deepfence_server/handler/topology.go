package handler

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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

	var filters reporters.TopologyFilters
	json.Unmarshal(body, &filters)

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

	graph, err := reporter.Graph(ctx, filters)
	if err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	newTopo, newConnections := graphToSummaries(graph, filters.RegionFilter, filters.HostFilter)

	respondWith(ctx, w, http.StatusOK, GraphResult{Nodes: newTopo, Edges: newConnections})
}

func graphToSummaries(graph reporters.RenderedGraph, region_filter []string, host_filter []string) (detailed.NodeSummaries, detailed.TopologyConnectionSummaries) {
	nodes := detailed.NodeSummaries{}
	edges := detailed.TopologyConnectionSummaries{}

	for _, conn := range graph.Connections {
		left_splits := strings.Split(conn.Source, ";")
		right_splits := strings.Split(conn.Target, ";")
		source := ""
		if contains(host_filter, left_splits[2]) {
			source = left_splits[2] + ";" + left_splits[3]
		} else if contains(region_filter, left_splits[1]) {
			source = left_splits[2] + ";<host>"
		} else {
			source = left_splits[1] + ";<cloud_region>"
		}

		target := ""
		if contains(host_filter, right_splits[2]) {
			target = right_splits[2] + ";" + right_splits[3]
		} else if contains(region_filter, right_splits[1]) {
			target = right_splits[2] + ";<host>"
		} else {
			target = right_splits[1] + ";<cloud_region>"
		}

		if source == "internet;<cloud_region>" {
			source = "in-the-internet"
		}
		if target == "internet;<cloud_region>" {
			target = "out-the-internet"
		}
		log.Info().Msgf("%v -> %v\n", source, target)
		edges[source+target] = detailed.ConnectionSummary{Source: source, Target: target}
	}

	nodes["in-the-internet"] = detailed.NodeSummary{
		ImmediateParentID: "",
		BasicNodeSummary: detailed.BasicNodeSummary{
			ID:     "in-the-internet",
			Rank:   "in-theinternet",
			Label:  "The Internet",
			Shape:  "cloud",
			Pseudo: true,
		},
	}

	nodes["out-the-internet"] = detailed.NodeSummary{
		ImmediateParentID: "",
		BasicNodeSummary: detailed.BasicNodeSummary{
			ID:     "out-the-internet",
			Rank:   "out-theinternet",
			Label:  "The Internet",
			Shape:  "cloud",
			Pseudo: true,
		},
	}

	for _, cp := range graph.Providers {
		nodes[cp] = detailed.NodeSummary{
			ImmediateParentID: "",
			BasicNodeSummary: detailed.BasicNodeSummary{
				ID:    cp + ";<cloud_provider>",
				Rank:  cp,
				Label: cp,
				Shape: cp,
			},
			Metadata: []report.MetadataRow{
				{
					ID:       "name",
					Label:    "Name",
					Value:    cp,
					Priority: 1,
				},
				{
					ID:       "label",
					Label:    "Label",
					Value:    cp,
					Priority: 2,
				},
			},
			Type: "cloud_provider",
		}
	}

	for cp, crs := range graph.Regions {
		for _, cr := range crs {
			nodes[cr] = detailed.NodeSummary{
				ImmediateParentID: cp + ";<cloud_provider>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    cr + ";<cloud_region>",
					Rank:  cr,
					Label: cr,
					Shape: report.Circle,
				},
				Metadata: []report.MetadataRow{
					{
						ID:       "name",
						Label:    "Name",
						Value:    cr,
						Priority: 1,
					},
					{
						ID:       "label",
						Label:    "Label",
						Value:    cr,
						Priority: 2,
					},
				},
				Type: "cloud_region",
			}
		}
	}

	for _, n := range graph.Hosts {
		for cr, hosts := range n {
			for _, host := range hosts {
				nodes[host] = detailed.NodeSummary{
					ImmediateParentID: cr + ";<cloud_region>",
					BasicNodeSummary: detailed.BasicNodeSummary{
						ID:    host + ";<host>",
						Rank:  host,
						Label: host,
						Shape: report.Host,
					},
					Metrics: []report.MetricRow{
						{ID: hst.CPUUsage, Metric: &report.Metric{}, Label: "CPU", Value: 0.0, Format: report.PercentFormat, Priority: 1},
						{ID: hst.MemoryUsage, Metric: &report.Metric{}, Label: "Memory", Value: 0.0, Format: report.FilesizeFormat, Priority: 2},
						{ID: hst.Load1, Metric: &report.Metric{}, Label: "Load (1m)", Value: 0.0, Format: report.DefaultFormat, Group: "load", Priority: 11},
					},
					Metadata: []report.MetadataRow{
						{
							ID:       "name",
							Label:    "Name",
							Value:    host,
							Priority: 1,
						},
						{
							ID:       "label",
							Label:    "Label",
							Value:    host,
							Priority: 2,
						},
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
					Type: "host",
				}
			}
		}
	}

	for h, n := range graph.Processes {
		for _, id := range n {
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: h + ";<host>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    id,
					Label: id,
					Shape: report.Process,
				},
				Metadata: []report.MetadataRow{
					{
						ID:       "name",
						Label:    "Name",
						Value:    id,
						Priority: 1,
					},
					{
						ID:       "label",
						Label:    "Label",
						Value:    id,
						Priority: 2,
					},
				},
				Type: "process",
			}
		}
	}

	for h, n := range graph.Pods {
		for _, id := range n {
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: h + ";<host>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    id,
					Label: id,
					Shape: report.Pod,
				},
				Metadata: []report.MetadataRow{
					{
						ID:       "name",
						Label:    "Name",
						Value:    id,
						Priority: 1,
					},
					{
						ID:       "label",
						Label:    "Label",
						Value:    id,
						Priority: 2,
					},
				},
				Type: "pod",
			}
		}
	}

	for h, n := range graph.Containers {
		for _, id := range n {
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: h + ";<host>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    id,
					Label: id,
					Shape: report.Container,
				},
				Type: "container",
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

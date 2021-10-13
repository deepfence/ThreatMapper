package detailed

import (
	"context"
	"github.com/opentracing/opentracing-go"
	"github.com/weaveworks/scope/report"
)

var (
	parentOrder map[string][]string
)

type NodeFilters struct {
	TopologyId string `json:"topology_id"`
	NodeId     string `json:"node_id"`
	Children   []struct {
		TopologyID string            `json:"topology_id"`
		Filters    map[string]string `json:"filters"`
	} `json:"children"`
	Parents map[string]string `json:"parents"`
}

type TopologyFilters struct {
	Add    NodeFilters `json:"add"`
	Remove NodeFilters `json:"remove"`
}

func init() {
	parentOrder = map[string][]string{
		report.Process:           {report.Container, report.Pod, report.Host, report.KubernetesCluster, report.CloudRegion, report.CloudProvider},
		report.Container:         {report.Pod, report.Host, report.KubernetesCluster, report.CloudRegion, report.CloudProvider},
		report.Pod:               {report.Host, report.KubernetesCluster, report.CloudRegion, report.CloudProvider},
		report.Service:           {report.KubernetesCluster, report.CloudProvider},
		report.Host:              {report.KubernetesCluster, report.CloudRegion, report.CloudProvider},
		report.KubernetesCluster: {report.CloudProvider},
		report.CloudRegion:       {report.CloudProvider},
	}
}

type ConnectionSummary struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type TopologyConnectionSummaries map[string]ConnectionSummary

func findVisibleParentNode(node report.Node, nodeSummaries *NodeSummaries) (string, bool) {
	if nodeSummaries == nil {
		return "", false
	}
	if _, ok := (*nodeSummaries)[node.ID]; ok {
		return node.ID, true
	}
	parentsNodeTypes, ok := parentOrder[node.Topology]
	if !ok {
		return "", false
	}
	for _, parentsNodeType := range parentsNodeTypes {
		parentIds, found := node.Parents.Lookup(parentsNodeType)
		if !found {
			continue
		}
		for _, parentId := range parentIds {
			if _, ok := (*nodeSummaries)[parentId]; ok {
				return parentId, true
			}
		}
	}
	return "", false
}

func GetTopologyConnectionSummaries(ctx context.Context, nodeSummaries NodeSummaries, rns report.Nodes) TopologyConnectionSummaries {
	span, ctx := opentracing.StartSpanFromContext(ctx, "detailed.ConnectionSummaries")
	defer span.Finish()

	connectionSummaries := make(map[string]ConnectionSummary)

	for _, node := range rns {
		if len(node.Adjacency) == 0 {
			continue
		}
		sourceId, found := findVisibleParentNode(node, &nodeSummaries)
		if !found || sourceId == "" {
			continue
		}
		for _, adjId := range node.Adjacency {
			adjacentNode, ok := rns[adjId]
			if !ok || adjacentNode.ID == "" {
				continue
			}
			targetId, found := findVisibleParentNode(adjacentNode, &nodeSummaries)
			if !found {
				continue
			}
			connectionSummaries[sourceId+":"+targetId] = ConnectionSummary{
				Source: sourceId,
				Target: targetId,
			}
		}
	}
	return connectionSummaries
}

type EdgesTopologyDiff struct {
	Add    []ConnectionSummary `json:"add"`
	Remove []ConnectionSummary `json:"remove"`
}

type TopologyConnectionDiffMetadata struct {
	RecommendedView string                    `json:"recommended_view,omitempty"`
	Connections     string                    `json:"connections,omitempty"`
	ChildrenCount   map[string]map[string]int `json:"children_count,omitempty"`
}

// TopologyConnectionDiff is returned by GetConnectionDiff. It represents the changes between two ConnectionSummary
type TopologyConnectionDiff struct {
	Nodes    Diff                           `json:"nodes"`
	Edges    EdgesTopologyDiff              `json:"edges"`
	Reset    bool                           `json:"reset"`
	Metadata TopologyConnectionDiffMetadata `json:"metadata"`
}

// GetConnectionDiff gives you the diff to get from A to B.
func GetConnectionDiff(a, b TopologyConnectionSummaries) EdgesTopologyDiff {
	edgesTopologyDiff := EdgesTopologyDiff{}

	notSeen := map[string]struct{}{}
	for k := range a {
		notSeen[k] = struct{}{}
	}

	for k, v := range b {
		if _, ok := a[k]; !ok {
			edgesTopologyDiff.Add = append(edgesTopologyDiff.Add, v)
		}
		delete(notSeen, k)
	}

	// leftover keys
	for k := range notSeen {
		edgesTopologyDiff.Remove = append(edgesTopologyDiff.Remove, a[k])
	}
	return edgesTopologyDiff
}

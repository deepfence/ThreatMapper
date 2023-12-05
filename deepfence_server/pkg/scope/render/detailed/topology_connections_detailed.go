package detailed

type NodeFilters struct {
	TopologyID string `json:"topology_id"`
	NodeID     string `json:"node_id"`
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

type ConnectionSummary struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type TopologyConnectionSummaries map[string]ConnectionSummary

type EdgesTopologyDiff struct {
	Add    []ConnectionSummary `json:"add"`
	Remove []ConnectionSummary `json:"remove"`
}

type TopologyConnectionDiffMetadata struct {
	RecommendedView string                    `json:"recommended_view,omitempty"`
	Connections     string                    `json:"connections,omitempty"`
	ChildrenCount   map[string]map[string]int `json:"children_count,omitempty"`
}

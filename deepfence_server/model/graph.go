package model

import "github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/render/detailed"

type GraphResult struct {
	Nodes detailed.NodeSummaries               `json:"nodes" required:"true"`
	Edges detailed.TopologyConnectionSummaries `json:"edges" required:"true"`
}

type TopologyDeltaReq struct {
	AdditionTimestamp int64    `json:"addition_timestamp" required:"true" format:"int64"`
	DeletionTimestamp int64    `json:"deletion_timestamp" required:"true" format:"int64"`
	Addition          bool     `json:"addition" required:"true"`
	Deletion          bool     `json:"deletion" required:"true"`
	EntityTypes       []string `json:"entity_types" required:"true"`
}

type TopologyDeltaResponse struct {
	Additions         []NodeIdentifier `json:"additons"`
	Deletions         []NodeIdentifier `json:"deletions"`
	AdditionTimestamp int64            `json:"addition_timestamp" format:"int64"`
	DeletionTimestamp int64            `json:"deletion_timestamp" format:"int64"`
}

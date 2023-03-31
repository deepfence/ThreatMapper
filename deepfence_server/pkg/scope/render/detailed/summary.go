package detailed

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
)

// NodeSummary is summary information about a Node.
type NodeSummary struct {
	ID                string          `json:"id"`
	Label             string          `json:"label"`
	Metadata          report.Metadata `json:"metadata,omitempty"`
	Adjacency         report.IDList   `json:"adjacency,omitempty"`
	ImmediateParentID string          `json:"immediate_parent_id"`
	Type              string          `json:"type"`
	IDs               []string        `json:"ids,omitempty"`
}

// NodeSummaries is a set of NodeSummaries indexed by ID.
type NodeSummaries map[string]NodeSummary

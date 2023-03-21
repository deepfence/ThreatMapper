package report

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report/ps"
)

// NodeSet is a set of nodes keyed on ID. Clients must use
// the Add method to add nodes
type NodeSet struct {
	PsMap *ps.Tree `json:"ps_map"`
}

// ForEach executes f for each node in the set.
func (n NodeSet) ForEach(f func(Node)) {
	if n.PsMap != nil {
		n.PsMap.ForEach(func(_ string, val interface{}) {
			f(val.(Node))
		})
	}
}

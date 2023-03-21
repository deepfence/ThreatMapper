package report

import (
	"strconv"
	"strings"
	"time"
)

// Node describes a superset of the metadata that probes can collect
// about a given node in a given topology, along with the edges (aka
// adjacency) emanating from the node.
type Node struct {
	ID        string          `json:"id,omitempty"`
	Topology  string          `json:"topology,omitempty"`
	Sets      Sets            `json:"sets,omitempty"`
	Adjacency IDList          `json:"adjacency,omitempty"`
	Latest    StringLatestMap `json:"latest,omitempty"`
	Metrics   Metrics         `json:"metrics,omitempty" deepequal:"nil==empty"`
	Parents   Sets            `json:"parents,omitempty"`
	Children  NodeSet         `json:"children,omitempty"`
}

// WithLatest produces a new Node with k mapped to v in the Latest metadata.
func (n Node) WithLatest(k string, ts time.Time, v string) Node {
	n.Latest = n.Latest.Set(k, ts, v)
	return n
}

// LookupCounter returns the value of a counter
// (counters are stored as strings, to keep the data structure simple)
func (n Node) LookupCounter(k string) (value int, found bool) {
	name := CounterPrefix + k
	var str string
	if str, found = n.Latest.Lookup(name); found {
		value, _ = strconv.Atoi(str)
	}
	return value, found
}

func (n *Node) ToDataMap() map[string]string {
	res := map[string]string{}
	id_type := strings.Split(n.ID, ";")
	if len(id_type) == 2 {
		res["node_id"] = id_type[0]
		if len(id_type[1]) > 2 {
			res["node_type"] = id_type[1][1 : len(id_type[1])-1]
		} else {
			res["node_type"] = id_type[1]
		}
	} else {
		res["node_id"] = n.ID
		res["node_type"] = ""
	}
	n.Latest.ForEach(func(k string, _ time.Time, v string) {
		if k == "" {
			k = "control_probe_id"
		}
		res[k] = v
	})
	switch res["node_type"] {
	case Host:
		res["node_name"] = res["host_name"]
	case Container:
		res["node_name"] = res["docker_container_name"] + " / " + res["host_name"]
	case ContainerImage:
		res["node_name"] = res["docker_image_name"] + ":" + res["docker_image_tag"]
	case Pod:
		res["node_name"] = res["kubernetes_name"] + " / " + res["kubernetes_namespace"] + " / " + res["kubernetes_cluster_name"]
	case Process:
		res["node_name"] = res["name"]
	default:
		if _, ok := res["node_name"]; !ok {
			res["node_name"] = ""
		}
	}
	return res
}

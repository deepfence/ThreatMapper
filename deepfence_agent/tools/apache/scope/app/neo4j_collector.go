package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/report"
)

type neo4jCollector struct {
	driver      neo4j.Driver
	network_map map[string]string
	ingester    chan *report.Report
}

type neo4jIngestionData struct {
	Process_batch  []map[string]string
	Node_batch     []map[string]string

	Process_edges_batch  []map[string]string
	Node_edges_batch     []map[string]string
	Endpoint_edges_batch []map[string]string
}

func prepareNeo4jIngestion(rpt *report.Report, network_map map[string]string) neo4jIngestionData {

	processes_to_keep := map[string]struct{}{}

	host_batch := []map[string]string{}
	host_edges_batch := []map[string]string{}
	for _, n := range rpt.Host.Nodes {
		node_info := n.ToDataMap()
		host_batch = append(host_batch, node_info)
		var result map[string]interface{}
		json.Unmarshal([]byte(node_info["interface_ips"]), &result)
		for k, _ := range result {
			network_map[k] = node_info["host_name"]
		}
	}

	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			first := strings.IndexByte(node_info["node_id"], ';')
			second := strings.IndexByte(node_info["node_id"][first+1:], ';') + first + 1
			middle := strings.IndexByte(hni, ';')
			network_map[node_info["node_id"][first+1:second]] = hni[:middle]
			processes_to_keep[hni[:middle]+node_info["pid"]] = struct{}{}
		}
	}

	fmt.Printf("net_map size: %v\n", len(network_map))

	endpoint_edges_batch := []map[string]string{}
ENDPOINTS:
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if _, ok := node_info["host_node_id"]; !ok {
			first := strings.IndexByte(node_info["node_id"], ';')
			second := strings.IndexByte(node_info["node_id"][first+1:], ';') + first + 1
			if val2, ok2 := network_map[node_info["node_id"][first+1:second]]; ok2 {
				node_info["host_node_id"] = val2
			} else {
				continue ENDPOINTS
			}
		}
		for _, i := range n.Adjacency {
			if n.ID != i {
				vals := strings.Split(i, ";")
				if host, ok := network_map[vals[1]]; ok {
					endpoint_edges_batch = append(endpoint_edges_batch,
						map[string]string{"left": node_info["host_node_id"], "right": host, "pid": node_info["pid"], "ppid": node_info["ppid"]})
				}
			}
		}
	}

	//fmt.Printf("edges: %v\n", endpoint_edges_batch)

	process_batch := []map[string]string{}
	process_edges_batch := []map[string]string{}
	for _, n := range rpt.Process.Nodes {
		node_info := n.ToDataMap()
		node_info["node_id"] += node_info["pid"]
		if _, ok := processes_to_keep[node_info["node_id"]]; !ok {
			continue
		}
		process_batch = append(process_batch, node_info)
		process_edges_batch = append(process_edges_batch,
			map[string]string{"left": node_info["host_name"], "right": node_info["node_id"]})
	}

	container_batch := []map[string]string{}
	container_edges_batch := []map[string]string{}
	for _, n := range rpt.Container.Nodes {
		node_info := n.ToDataMap()
		container_batch = append(container_batch, node_info)
		host, ok := node_info["host_name"]
		if !ok {
			host, ok = node_info["host_node_id"]
			if !ok {
				continue
			}
			middle := strings.IndexByte(host, ';')
			host = host[:middle]
		}
		container_edges_batch = append(container_edges_batch,
			map[string]string{"left": host, "right": node_info["node_id"]})
	}

	pod_batch := []map[string]string{}
	pod_edges_batch := []map[string]string{}
	for _, n := range rpt.Pod.Nodes {
		node_info := n.ToDataMap()
		pod_batch = append(pod_batch, node_info)
		host, ok := node_info["host_name"]
		if !ok {
			host, ok = node_info["host_node_id"]
			if !ok {
				continue
			}
			middle := strings.IndexByte(host, ';')
			host = host[:middle]
		}
		pod_edges_batch = append(pod_edges_batch,
			map[string]string{"left": host, "right": node_info["node_id"]})
	}

	node_batch := append(host_batch, container_batch...)
	node_batch = append(node_batch, pod_batch...)

	node_edges_batch := append(host_edges_batch, container_edges_batch...)
	node_edges_batch = append(node_edges_batch, pod_edges_batch...)

	return neo4jIngestionData{
		Endpoint_edges_batch: endpoint_edges_batch,

		Process_batch: process_batch,
		Node_batch:    node_batch,

		Process_edges_batch: process_edges_batch,
		Node_edges_batch:    node_edges_batch,
	}
}

func (nc *neo4jCollector) ingestIntoNeo4j(rpt report.Report) error {

	batches := prepareNeo4jIngestion(&rpt, nc.network_map)

	session, err := nc.driver.Session(neo4j.AccessModeWrite)
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:TNode{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Node_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MERGE (n:TProcess{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Process_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TNode{node_id: row.right}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Node_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TProcess{node_id: row.right}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Process_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TNode{node_id: row.right}) CREATE (n)-[:CONNECTS {pid: row.pid, ppid: row.ppid}]->(m)", map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
		return err
	}

	return tx.Commit()
}

func (nc *neo4jCollector) Close() {
	nc.driver.Close()
}

type PairConn struct {
	Left  string `json:"left"`
	Right string `json:"right"`
}

func (nc *neo4jCollector) GetConnections() []PairConn {

	session, err := nc.driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return []PairConn{}
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return []PairConn{}
	}
	defer tx.Close()
	r, err := tx.Run("MATCH (n:TNode) -[:CONNECTS]-> (m:TNode) return n.node_id, m.node_id", nil)

	if err != nil {
		return []PairConn{}
	}
	edges, err := r.Collect()

	if err != nil {
		return []PairConn{}
	}

	res := []PairConn{}
	for _, edge := range edges {
		if edge.Values[0].(string) != edge.Values[1].(string) {
			res = append(res, PairConn{Left: edge.Values[0].(string), Right: edge.Values[1].(string)})
		}
	}

	return res
}

func addHostToTopology(tx neo4j.Transaction, host_topology report.Topology, cloud_provider report.Topology, cloud_region report.Topology) error {

	r, err := tx.Run("MATCH (n:TNode{node_type: 'host'}) return n", nil)
	if err != nil {
		return err
	}
	records, err := r.Collect()

	if err != nil {
		return err
	}

	for _, record := range records {
		node := record.Values[0].(neo4j.Node)
		m := map[string]string{}
		for k, v := range node.Props {
			m[k] = fmt.Sprintf("%v", v)
		}
		new_host_node := report.MakeNodeWith(m["node_id"]+";<host>", m)
		new_host_node.Topology = report.Host

		new_cp_node := report.MakeNodeWith(m["cloud_provider"]+";<cloud_provider>", map[string]string{})
		new_cp_node.Topology = report.CloudProvider
		new_cp_node.Latest = new_cp_node.Latest.Set("name", time.Now(), m["cloud_provider"])
		new_cp_node.Latest = new_cp_node.Latest.Set("label", time.Now(), m["cloud_provider"])

		new_region_node := report.MakeNodeWith(m["cloud_region"]+";<cloud_region>", map[string]string{})
		new_region_node.Topology = report.CloudRegion
		new_region_node.Latest = new_region_node.Latest.Set("name", time.Now(), m["cloud_region"])
		new_region_node.Latest = new_region_node.Latest.Set("label", time.Now(), m["cloud_region"])

		new_region_node.Children.UnsafeAdd(new_host_node)
		new_cp_node.Children.UnsafeAdd(new_region_node)
		new_region_node.Parents = new_region_node.Parents.AddString(report.CloudProvider, m["cloud_provider"]+";<cloud_provider>")
		new_host_node.Parents = new_host_node.Parents.AddString(report.CloudRegion, m["cloud_region"]+";<cloud_region>")

		host_topology.AddNode(new_host_node)
		cloud_provider.AddNode(new_cp_node)
		cloud_region.AddNode(new_region_node)
	}

	return nil
}

func addNodesToTopology(tx neo4j.Transaction, topology report.Topology, stype string) error {
	r, err := tx.Run("MATCH (n:TNode{node_type: '"+stype+"'}) return n", nil)
	if err != nil {
		return err
	}
	records, err := r.Collect()

	if err != nil {
		return err
	}

	for _, record := range records {
		node := record.Values[0].(neo4j.Node)
		m := map[string]string{}
		for k, v := range node.Props {
			m[k] = fmt.Sprintf("%v", v)
		}
		new_node := report.MakeNodeWith(m["node_id"]+";<"+stype+">", m)
		new_node.Topology = stype
		topology.AddNode(new_node)
	}

	return nil
}

func addProcessesToTopology(tx neo4j.Transaction, topology report.Topology) error {
	r, err := tx.Run("MATCH (n:TProcess) return n", nil)
	if err != nil {
		return err
	}
	records, err := r.Collect()

	if err != nil {
		return err
	}

	for _, record := range records {
		node := record.Values[0].(neo4j.Node)
		m := map[string]string{}
		for k, v := range node.Props {
			m[k] = fmt.Sprintf("%v", v)
		}
		new_node := report.MakeNodeWith(m["node_id"], m)
		new_node.Topology = report.Process
		new_node.Parents = new_node.Parents.AddString(report.Host, m["host_node_id"])
		topology.AddNode(new_node)
	}

	return nil
}

func (nc *neo4jCollector) Report(_ context.Context, _ time.Time) (report.Report, error) {
	res := report.MakeReport()

	session, err := nc.driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	addHostToTopology(tx, res.Host, res.CloudProvider, res.CloudRegion)
	addNodesToTopology(tx, res.Container, report.Container)
	addNodesToTopology(tx, res.Pod, report.Pod)
	addProcessesToTopology(tx, res.Process)

	res.Host = res.Host.WithMetricTemplates(host.MetricTemplates)
	res.Host = res.Host.WithMetadataTemplates(host.MetadataTemplates)
	res.CloudProvider = res.CloudProvider.WithMetadataTemplates(host.CloudProviderMetadataTemplates)
	res.CloudRegion = res.CloudRegion.WithMetadataTemplates(host.CloudRegionMetadataTemplates)

	return res, nil
}

func (nc *neo4jCollector) HasReports(_ context.Context, _ time.Time) (bool, error) {
	return true, nil
}

func (nc *neo4jCollector) HasHistoricReports() bool {
	return true
}

func (nc *neo4jCollector) AdminSummary(_ context.Context, _ time.Time) (string, error) {
	res := nc.GetConnections()
	b, err := json.Marshal(res)
	return string(b), err
}

func (nc *neo4jCollector) WaitOn(_ context.Context, _ chan struct{}) {
}

func (nc *neo4jCollector) UnWait(_ context.Context, _ chan struct{}) {
}

var acc sync.Mutex
var seen_once map[string]struct{}
func (nc *neo4jCollector) Add(_ context.Context, rpt report.Report, _ []byte) error {

	if len(nc.ingester) > 1000 {
		for k, _ := range rpt.Host.Nodes {
			acc.Lock()
			_, ok := seen_once[k]
			acc.Unlock()
			if ok {
				log.Printf("dropped")
				return nil
			}
		}
	}

	select {
	case nc.ingester <- &rpt:
	acc.Lock()
	for k, _ := range rpt.Host.Nodes {
		seen_once[k] = struct {}{}
	}
	acc.Unlock()
	default:
		log.Printf("ingester channel full")
		return fmt.Errorf("ingester channel full")
	}
	return nil
}

func NewNeo4jCollector(_ time.Duration) (Collector, error) {
	driver, err := neo4j.NewDriver("bolt://neo4j-db:7687", neo4j.BasicAuth("neo4j", "password", ""))
	seen_once = map[string]struct{}{}

	if err != nil {
		return nil, err
	}

	nc := &neo4jCollector{
		driver:      driver,
		network_map: map[string]string{},
		ingester: make(chan *report.Report, 10000),
	}

	go func () {
		batch := report.MakeReport()
		i := 0
		for {
			select {
			case rpt:=<-nc.ingester:
				batch.UnsafeMerge(*rpt)
			    i += 1
				if i == 100 {
					err := nc.ingestIntoNeo4j(batch)
					if err != nil {
						log.Printf("err: %v", err)
					}
					batch = report.MakeReport()
					i = 0
				}
			}
		}
	}()

	return nc, nil
}

package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/report"
)

const (
	workers_num         = 100
	db_input_size       = 100
	db_batch_size       = 500
	db_batch_timeout    = time.Second * 5
	resolver_batch_size = 1_000
	resolver_timeout    = time.Second * 10
	ingester_size       = 25_000
	db_clean_up_timeout = time.Minute * 2
	max_entries_network = 100_000
)

type EndpointResolvers struct {
	network_map  map[string]string
	ipport_ippid map[string]map[string]string
}

func NewEndpointResolvers() EndpointResolvers {
	return EndpointResolvers{
		network_map:  map[string]string{},
		ipport_ippid: map[string]map[string]string{},
	}
}

type neo4jCollector struct {
	driver           neo4j.Driver
	ingester         chan *report.Report
	resolvers_access sync.RWMutex
	resolvers        EndpointResolvers
	batcher          chan neo4jIngestionData
	resolvers_update chan EndpointResolvers
	resolvers_input  chan *report.Report
	preparers_input  chan *report.Report
}

type neo4jIngestionData struct {
	Process_batch   []map[string]string
	Host_batch      []map[string]string
	Container_batch []map[string]string
	Pod_batch       []map[string]string

	Process_edges_batch   []map[string]interface{}
	Container_edges_batch []map[string]interface{}
	Pod_edges_batch       []map[string]interface{}
	Endpoint_edges_batch  []map[string]interface{}

	//Endpoint_batch []map[string]string
	//Endpoint_edges []map[string]string

	Hosts []map[string]string
}

func (r *EndpointResolvers) merge(other *EndpointResolvers) {
	for k, v := range other.network_map {
		r.network_map[k] = v
	}

	for k, v := range other.ipport_ippid {
		r.ipport_ippid[k] = v
	}
}

func (nd *neo4jIngestionData) merge(other *neo4jIngestionData) {
	nd.Process_batch = append(nd.Process_batch, other.Process_batch...)
	nd.Host_batch = append(nd.Host_batch, other.Host_batch...)
	nd.Container_batch = append(nd.Container_batch, other.Container_batch...)
	nd.Pod_batch = append(nd.Pod_batch, other.Pod_batch...)
	nd.Process_edges_batch = append(nd.Process_edges_batch, other.Process_edges_batch...)
	nd.Container_edges_batch = append(nd.Container_edges_batch, other.Container_edges_batch...)
	nd.Pod_edges_batch = append(nd.Pod_edges_batch, other.Pod_edges_batch...)
	nd.Endpoint_edges_batch = append(nd.Endpoint_edges_batch, other.Endpoint_edges_batch...)
	//nd.Endpoint_batch = append(nd.Endpoint_batch, other.Endpoint_batch...)
	//nd.Endpoint_edges = append(nd.Endpoint_edges, other.Endpoint_edges...)
	nd.Hosts = append(nd.Hosts, other.Hosts...)
}

func computeResolvers(rpt *report.Report) EndpointResolvers {
	resolvers := NewEndpointResolvers()

	for _, n := range rpt.Host.Nodes {
		node_info := n.ToDataMap()
		var result map[string]interface{}
		json.Unmarshal([]byte(node_info["interface_ips"]), &result)
		for k, _ := range result {
			resolvers.network_map[k] = node_info["host_name"]
		}
		resolvers.ipport_ippid[node_info["host_name"]] = map[string]string{}
	}

	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			node_ip, node_port := extractHostPortFromEndpointID(node_info["node_id"])
			resolvers.network_map[node_ip] = extractHostFromHostNodeID(hni)
			if _, ok := resolvers.ipport_ippid[node_ip]; !ok {
				resolvers.ipport_ippid[node_ip] = map[string]string{}
			}
			resolvers.ipport_ippid[node_ip][node_port] = fmt.Sprintf("%v;%v", node_ip, node_info["pid"])
		}
	}

	return resolvers
}

func (nc *neo4jCollector) resolversUpdater() {
	for {
		select {
		case <-time.After(resolver_timeout):
			elements := min(len(nc.resolvers_update), resolver_batch_size)
			start := time.Now()
			nc.resolvers_access.Lock()
			if len(nc.resolvers.network_map) > max_entries_network {
				nc.resolvers.network_map = map[string]string{}
			}

			if len(nc.resolvers.ipport_ippid) > max_entries_network {
				nc.resolvers.ipport_ippid = map[string]map[string]string{}
			}
			for i := 0; i < elements; i++ {
				resolver := <-nc.resolvers_update
				nc.resolvers.merge(&resolver)
			}
			logrus.Debugf("resolver merge time: %v for %v elements", time.Since(start), elements)
			logrus.Debugf("net_map size: %v", len(nc.resolvers.network_map))
			logrus.Debugf("hostport : %v", len(nc.resolvers.ipport_ippid))
			nc.resolvers_access.Unlock()
		}
	}
}

func concatMaps(input map[string][]string) []map[string]interface{} {
	res := make([]map[string]interface{}, 0, len(input))
	for k, e := range input {
		res = append(res, map[string]interface{}{"source": k, "destinations": e})
	}
	return res
}

func prepareNeo4jIngestion(rpt *report.Report, resolvers *EndpointResolvers) neo4jIngestionData {
	hosts := make([]map[string]string, 0, len(rpt.Host.Nodes))
	host_batch := make([]map[string]string, 0, len(rpt.Host.Nodes))
	for _, n := range rpt.Host.Nodes {
		node_info := n.ToDataMap()
		hosts = append(hosts, map[string]string{"node_id": node_info["node_id"]})
		host_batch = append(host_batch, node_info)
	}

	processes_to_keep := map[string]struct{}{}
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			host := extractHostFromHostNodeID(hni)
			host_pid := fmt.Sprintf("%s;%s", host, node_info["pid"])
			processes_to_keep[host_pid] = struct{}{}
		}
	}

	endpoint_edges_batch := make([]map[string]interface{}, 0, len(rpt.Endpoint.Nodes))
	//endpoint_batch := []map[string]string{}
	//endpoint_edges := []map[string]string{}
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if _, ok := node_info["host_node_id"]; !ok {
			host, _ := extractHostPortFromEndpointID(node_info["node_id"])
			if val, ok := resolvers.network_map[host]; ok {
				node_info["host_node_id"] = val
			} else {
				continue
			}
		}
		//endpoint_batch = append(endpoint_batch, node_info)

		host_name := extractHostFromHostNodeID(node_info["host_node_id"])
		if len(node_info["pid"]) > 0 {
			edges := make([]map[string]string, 0, len(n.Adjacency))
			for _, i := range n.Adjacency {
				if n.ID != i {
					ip, port 	:= extractHostPortFromEndpointID(i)
					if host, ok := resolvers.network_map[ip]; ok {
						if host_name == host {
							continue
						}
						right_ippid, ok := resolvers.ipport_ippid[ip][port]
						if ok {
							rightpid := extractPidFromNodeID(right_ippid)
							edges = append(edges,
								map[string]string{"destination": host, "left_pid": node_info["pid"], "right_pid": rightpid})
						}
					}
					//endpoint_edges = append(endpoint_edges, map[string]string{"left": node_info["node_id"], "right": i})
				}
			}
			endpoint_edges_batch = append(endpoint_edges_batch, map[string]interface{}{"source": host_name, "edges": edges})
		}
	}

	process_batch := make([]map[string]string, 0, len(rpt.Process.Nodes))
	process_edges_batch := map[string][]string{}
	for _, n := range rpt.Process.Nodes {
		node_info := n.ToDataMap()
		host := node_info["node_id"]
		node_info["node_id"] += ";"
		node_info["node_id"] += node_info["pid"]
		if _, ok := processes_to_keep[node_info["node_id"]]; !ok {
			continue
		}
		process_batch = append(process_batch, node_info)
		process_edges_batch[host] = append(process_edges_batch[host], node_info["node_id"])
	}

	container_batch := make([]map[string]string, 0, len(rpt.Container.Nodes))
	container_edges_batch := map[string][]string{}
	for _, n := range rpt.Container.Nodes {
		node_info := n.ToDataMap()
		host, ok := node_info["host_name"]
		if !ok {
			hni, ok := node_info["host_node_id"]
			if !ok {
				continue
			}
			host = extractHostFromHostNodeID(hni)
		}
		container_batch = append(container_batch, node_info)
		container_edges_batch[host] = append(container_edges_batch[host], node_info["node_id"])
	}

	pod_batch := make([]map[string]string, 0, len(rpt.Pod.Nodes))
	pod_edges_batch := map[string][]string{}
	for _, n := range rpt.Pod.Nodes {
		node_info := n.ToDataMap()
		host, ok := node_info["host_name"]
		if !ok {
			hni, ok := node_info["host_node_id"]
			if ok {
				host = extractHostFromHostNodeID(hni)
			} else {
				host, ok = resolvers.network_map[node_info["kubernetes_ip"]]
				if !ok {
					continue
				}
			}
		}
		pod_batch = append(pod_batch, node_info)
		pod_edges_batch[host] = append(pod_edges_batch[host], node_info["node_id"])
	}

	return neo4jIngestionData{
		Endpoint_edges_batch: endpoint_edges_batch,

		Process_batch:   process_batch,
		Host_batch:      host_batch,
		Container_batch: container_batch,
		Pod_batch:       pod_batch,

		Process_edges_batch:   concatMaps(process_edges_batch),
		Container_edges_batch: concatMaps(container_edges_batch),
		Pod_edges_batch:       concatMaps(pod_edges_batch),

		//Endpoint_batch: endpoint_batch,
		//Endpoint_edges: endpoint_edges,

		Hosts: hosts,
	}
}

func (nc *neo4jCollector) Close() {
	nc.driver.Close()
}

type PairConn struct {
	Left     string `json:"left"`
	Right    string `json:"right"`
	LeftPid  string `json:"leftpid"`
	RightPid string `json:"rightpid"`
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
	r, err := tx.Run("MATCH (n:TNode) -[r:CONNECTS]-> (m:TNode) return n.node_id, m.node_id, r.left_pid, r.right_pid", nil)

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
			res = append(res, PairConn{Left: edge.Values[0].(string), Right: edge.Values[1].(string), LeftPid: edge.Values[2].(string), RightPid: edge.Values[3].(string)})
		}
	}

	return res
}

func addHostToTopology(tx neo4j.Transaction, host_topology report.Topology, cloud_provider report.Topology, cloud_region report.Topology) error {

	r, err := tx.Run("MATCH (n:TNode{node_type: 'host'}) return n", nil)
	if err != nil {
		return err
	}
	defer tx.Close()
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

		//new_region_node.Children.UnsafeAdd(new_host_node)
		//new_cp_node.Children.UnsafeAdd(new_region_node)
		new_region_node.Parents = new_region_node.Parents.AddString(report.CloudProvider, m["cloud_provider"]+";<cloud_provider>")
		new_host_node.Parents = new_host_node.Parents.AddString(report.CloudRegion, m["cloud_region"]+";<cloud_region>")

		host_topology.AddNode(new_host_node)
		cloud_provider.AddNode(new_cp_node)
		cloud_region.AddNode(new_region_node)
	}

	return nil
}

func addContainersToTopology(tx neo4j.Transaction, topology report.Topology) error {
	r, err := tx.Run("MATCH (n:TContainer) return n", nil)
	if err != nil {
		return err
	}
	defer tx.Close()
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
		new_node := report.MakeNodeWith(m["node_id"]+";<container>", m)
		new_node.Topology = report.Container
		topology.AddNode(new_node)
	}

	return nil
}

func addPodsToTopology(tx neo4j.Transaction, topology report.Topology) error {
	r, err := tx.Run("MATCH (n:TPod) return n", nil)
	if err != nil {
		return err
	}
	defer tx.Close()
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
		new_node := report.MakeNodeWith(m["node_id"]+";<pod>", m)
		new_node.Topology = report.Pod
		topology.AddNode(new_node)
	}

	return nil
}

func addProcessesToTopology(tx neo4j.Transaction, topology report.Topology) error {
	r, err := tx.Run("MATCH (n:TProcess) return n", nil)
	if err != nil {
		return err
	}
	defer tx.Close()
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
		new_node := report.MakeNodeWith(m["host_name"]+";"+m["pid"], m)
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
	addContainersToTopology(tx, res.Container)
	addPodsToTopology(tx, res.Pod)
	addProcessesToTopology(tx, res.Process)

	res.Host = res.Host.WithMetricTemplates(host.MetricTemplates)
	res.Host = res.Host.WithMetadataTemplates(host.MetadataTemplates)
	res.CloudProvider = res.CloudProvider.WithMetadataTemplates(host.CloudProviderMetadataTemplates)
	res.CloudRegion = res.CloudRegion.WithMetadataTemplates(host.CloudRegionMetadataTemplates)
	//res.Process = res.Process.WithMetricTemplates(host.MetricTemplates)
	//res.Process = res.Process.WithMetadataTemplates(host.MetadataTemplates)

	return res, nil
}

func (nc *neo4jCollector) HasReports(_ context.Context, _ time.Time) (bool, error) {
	return true, nil
}

func (nc *neo4jCollector) HasHistoricReports() bool {
	return true
}

// TODO: Add new API
func (nc *neo4jCollector) AdminSummary(_ context.Context, _ time.Time) (string, error) {
	res := nc.GetConnections()
	b, err := json.Marshal(res)
	return string(b), err
}

func (nc *neo4jCollector) WaitOn(_ context.Context, _ chan struct{}) {
}

func (nc *neo4jCollector) UnWait(_ context.Context, _ chan struct{}) {
}

func (nc *neo4jCollector) Add(_ context.Context, rpt report.Report, _ []byte) error {
	select {
	case nc.ingester <- &rpt:
	default:
		return fmt.Errorf("ingester channel full")
	}
	return nil
}

func (nc *neo4jCollector) CleanUpDB() error {
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

	if _, err = tx.Run("match (n:TNode) WHERE n.updated_at < TIMESTAMP()-$time_ms match (n) -[:HOSTS]->(m) detach delete n detach delete m", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:TContainer) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:TPod) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:TProcess) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	return tx.Commit()
}

func (nc *neo4jCollector) PushToDB(batches neo4jIngestionData) error {
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

	start := time.Now()

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:TNode{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Host_batch}); err != nil {
		return err
	}

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:TContainer{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Container_batch}); err != nil {
		return err
	}

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:TPod{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Pod_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MERGE (n:TProcess{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Process_batch}); err != nil {
		return err
	}

	logrus.Debugf("Upserting DB nodes took: %v", time.Since(start))
	start = time.Now()

	//if _, err = tx.Run("UNWIND $batch as row MERGE (n:TEndpoint{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Endpoint_batch}); err != nil {
	//	return err
	//}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.source}) WITH n, row UNWIND row.destinations as dest MATCH (m:TContainer{node_id: dest}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Container_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.source}) WITH n, row UNWIND row.destinations as dest MATCH (m:TPod{node_id: dest}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Pod_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.source}) WITH n, row UNWIND row.destinations as dest MATCH (m:TProcess{node_id: dest}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Process_edges_batch}); err != nil {
		return err
	}

	logrus.Debugf("Upserting DB edges add took: %v", time.Since(start))
	start = time.Now()
	//if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TPod{node_id: row.right}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Pod_edges_batch}); err != nil {
	//	return err
	//}

	//if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TProcess{node_id: row.right}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Process_edges_batch}); err != nil {
	//	return err
	//}

	//if _, err = tx.Run("UNWIND $batch as row MATCH (n:TEndpoint{node_id: row.left}),(m:TEndpoint{node_id: row.right}) MERGE (n)-[:CONNECTS]->(m)", map[string]interface{}{"batch": batches.Endpoint_edges}); err != nil {
	//	return err
	//}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.node_id}) -[r:CONNECTS]-> (:TNode) detach delete r", map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	//if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TNode{node_id: row.right}) MERGE (n)-[:CONNECTS {left_pid: row.left_pid, right_pid: row.right_pid}]->(m)", map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
	//	return err
	//}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.source}) WITH n, row UNWIND row.edges as row2  MATCH (m:TNode{node_id: row2.destination}) MERGE (n)-[:CONNECTS {left_pid: row2.left_pid, right_pid: row2.right_pid}]->(m)", map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
		return err
	}

	logrus.Debugf("Upserting DB connections edges took: %v", time.Since(start))

	return tx.Commit()
}

func (nc *neo4jCollector) runIngester() {
	for rpt := range nc.ingester {
		select {
		case nc.preparers_input <- rpt:
		default:
			logrus.Warnf("preparer channel full")
		}

		select {
		case nc.resolvers_input <- rpt:
		default:
			logrus.Warnf("resolvers channel full")
		}
	}
}

func (nc *neo4jCollector) runDBBatcher(db_pusher chan neo4jIngestionData) {
	batch := make([]neo4jIngestionData, db_batch_size)
	size := 0
	send := false
	reset_timeout := false
	timeout := time.After(db_batch_timeout)
	for {
		select {
		case report := <-nc.batcher:
			batch[size] = report
			size += 1
			if size == len(batch) {
				send = true
				reset_timeout = true
			}
		case <-timeout:
			send = true
			reset_timeout = true
		}
		if send && size > 0 {
			send = false
			final_batch := batch[0]
			for i := 1; i < size; i++ {
				final_batch.merge(&batch[i])
			}
			size = 0
			select {
			case db_pusher <- final_batch:
			default:
				logrus.Warnf("DB channel full")
			}
		}
		if reset_timeout {
			reset_timeout = false
			timeout = time.After(db_batch_timeout)
		}
	}
}

func (nc *neo4jCollector) runDBPusher(db_pusher chan neo4jIngestionData) {
	clean_up := time.After(db_clean_up_timeout)
	for {
		select {
		case batches := <-db_pusher:
			start := time.Now()
			err := nc.PushToDB(batches)
			logrus.Debugf("DB push: %v", time.Since(start))
			if err != nil {
				logrus.Errorf("push to neo4j err: %v", err)
			}
		case <-clean_up:
			start := time.Now()
			err := nc.CleanUpDB()
			logrus.Debugf("DB clean: %v", time.Since(start))
			if err != nil {
				logrus.Errorf("clean neo4j err: %v", err)
			}
			clean_up = time.After(time.Minute * 1)
		}
	}
}

func (nc *neo4jCollector) runResolver() {
	for rpt := range nc.resolvers_input {
		r := computeResolvers(rpt)
		nc.resolvers_update <- r
	}
}

func (nc *neo4jCollector) runPreparer() {
	for rpt := range nc.preparers_input {
		nc.resolvers_access.RLock()
		batches := prepareNeo4jIngestion(rpt, &nc.resolvers)
		nc.resolvers_access.RUnlock()
		nc.batcher <- batches
	}
}

func (nc *neo4jCollector) applyDBConstraints() error {

	session, err := nc.driver.Session(neo4j.AccessModeWrite)
	if err != nil {
		return err
	}

	session.Run("CREATE CONSTRAINT ON (n:TNode) ASSERT n.node_id IS UNIQUE", nil)
	session.Run("CREATE CONSTRAINT ON (n:TContainer) ASSERT n.node_id IS UNIQUE", nil)
	session.Run("CREATE CONSTRAINT ON (n:TPod) ASSERT n.node_id IS UNIQUE", nil)
	session.Run("CREATE CONSTRAINT ON (n:TProcess) ASSERT n.node_id IS UNIQUE", nil)

	return nil
}

func NewNeo4jCollector(_ time.Duration) (Collector, error) {
	driver, err := neo4j.NewDriver("bolt://neo4j-db:7687", neo4j.BasicAuth("neo4j", "password", ""))

	if err != nil {
		return nil, err
	}

	nc := &neo4jCollector{
		driver:           driver,
		resolvers:        NewEndpointResolvers(),
		ingester:         make(chan *report.Report, ingester_size),
		batcher:          make(chan neo4jIngestionData, ingester_size),
		resolvers_update: make(chan EndpointResolvers, ingester_size),
		resolvers_input:  make(chan *report.Report, ingester_size),
		preparers_input:  make(chan *report.Report, ingester_size),
	}

	nc.applyDBConstraints()

	for i := 0; i < workers_num; i++ {
		go nc.runResolver()
		go nc.runPreparer()
	}

	db_pusher := make(chan neo4jIngestionData, db_input_size)
	go nc.runDBBatcher(db_pusher)
	go nc.runDBPusher(db_pusher)

	go nc.resolversUpdater()

	go nc.runIngester()

	return nc, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func mapMerge(a, b *[]map[string]string) {
	for k, v := range *b {
		(*a)[k] = v
	}
}

func extractHostPortFromEndpointID(node_id string) (string, string) {
	first := strings.IndexByte(node_id, ';')
	second := strings.IndexByte(node_id[first+1:], ';') + first + 1
	return node_id[first+1 : second], node_id[second+1:]
}

func extractHostFromHostNodeID(hni string) string {
	middle := strings.IndexByte(hni, ';')
	if middle > 0 {
		return hni[:middle]
	}
	return hni
}

func extractPidFromNodeID(hni string) string {
	middle := strings.IndexByte(hni, ';')
	if middle > 0 {
		return hni[middle+1:]
	}
	return hni
}


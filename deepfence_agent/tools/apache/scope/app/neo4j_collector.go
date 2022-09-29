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

const (
	worker_size         = 100
	db_queue_size       = 100
	batch_size          = 500
	resolver_batch_size = 1000
	ingester_size       = 25000
)

type EndpointResolvers struct {
	network_map      map[string]string
	hostport_hostpid map[string]map[string]string
}

func NewEndpointResolvers() EndpointResolvers {
	return EndpointResolvers{
		network_map:      map[string]string{},
		hostport_hostpid: map[string]map[string]string{},
	}
}

type neo4jCollector struct {
	driver           neo4j.Driver
	ingester         chan *report.Report
	resolver_access  sync.RWMutex
	resolvers        EndpointResolvers
	batcher          chan neo4jIngestionData
	resolvers_update chan EndpointResolvers
	resolvers_queue  chan *report.Report
	preparers_queue  chan *report.Report
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

	Endpoint_batch []map[string]string
	Endpoint_edges []map[string]string

	Hosts []map[string]string
}

func mapMerge(a, b *[]map[string]string) {
	for k, v := range *b {
		(*a)[k] = v
	}
}

func (r *EndpointResolvers) merge(other *EndpointResolvers) {
	for k, v := range other.network_map {
		r.network_map[k] = v
	}

	for k, v := range other.hostport_hostpid {
		r.hostport_hostpid[k] = v
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
	nd.Endpoint_batch = append(nd.Endpoint_batch, other.Endpoint_batch...)
	nd.Endpoint_edges = append(nd.Endpoint_edges, other.Endpoint_edges...)
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
		resolvers.hostport_hostpid[node_info["host_name"]] = map[string]string{}
	}

	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			first := strings.IndexByte(node_info["node_id"], ';')
			second := strings.IndexByte(node_info["node_id"][first+1:], ';') + first + 1
			middle := strings.IndexByte(hni, ';')
			node_host := node_info["node_id"][first+1 : second]
			node_port := node_info["node_id"][second+1:]
			resolvers.network_map[node_host] = hni[:middle]
			if _, ok := resolvers.hostport_hostpid[node_host]; !ok {
				resolvers.hostport_hostpid[node_host] = map[string]string{}
			}
			resolvers.hostport_hostpid[node_host][node_port] = fmt.Sprintf("%v;%v", node_info["node_id"][first+1:second], node_info["pid"])
		}
	}

	return resolvers
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (nc *neo4jCollector) resolversUpdater() {
	for {
		select {
		case <-time.After(time.Second * 10):
			elements := min(len(nc.resolvers_update), resolver_batch_size)
			start := time.Now()
			nc.resolver_access.Lock()
			if len(nc.resolvers.network_map) > 10000 {
				nc.resolvers.network_map = map[string]string{}
			}

			if len(nc.resolvers.hostport_hostpid) > 50000 {
				nc.resolvers.hostport_hostpid = map[string]map[string]string{}
			}
			for i := 0; i < elements; i++ {
				resolver := <-nc.resolvers_update
				nc.resolvers.merge(&resolver)
			}
			fmt.Printf("resolver merge time: %v for %v elements\n", time.Since(start), elements)
			fmt.Printf("net_map size: %v\n", len(nc.resolvers.network_map))
			fmt.Printf("hostport : %v\n", len(nc.resolvers.hostport_hostpid))
			nc.resolver_access.Unlock()
		}
	}
}

func concatMaps(input map[string][]string) []map[string]interface{} {
	res := make([]map[string]interface{}, 0, len(input))
	for k, e := range input {
		sub := map[string]interface{}{}
		sub["source"] = k
		sub["destinations"] = e
		res = append(res, sub)
	}
	return res
}

func prepareNeo4jIngestion(rpt *report.Report, resolvers *EndpointResolvers) neo4jIngestionData {
	hosts := []map[string]string{}
	host_batch := []map[string]string{}
	for _, n := range rpt.Host.Nodes {
		node_info := n.ToDataMap()
		hosts = append(hosts, map[string]string{"node_id": node_info["node_id"]})
		host_batch = append(host_batch, node_info)
	}

	processes_to_keep := map[string]struct{}{}
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			middle := strings.IndexByte(hni, ';')
			processes_to_keep[hni[:middle]+";"+node_info["pid"]] = struct{}{}
		}
	}

	endpoint_edges_batch := []map[string]interface{}{}
	endpoint_batch := []map[string]string{}
	endpoint_edges := []map[string]string{}
ENDPOINTS:
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if _, ok := node_info["host_node_id"]; !ok {
			first := strings.IndexByte(node_info["node_id"], ';')
			second := strings.IndexByte(node_info["node_id"][first+1:], ';') + first + 1
			if val2, ok2 := resolvers.network_map[node_info["node_id"][first+1:second]]; ok2 {
				node_info["host_node_id"] = val2
			} else {
				continue ENDPOINTS
			}
		}
		//endpoint_batch = append(endpoint_batch, node_info)

		middle := strings.IndexByte(node_info["host_node_id"], ';')
		host_name := ""
		if middle > 0 {
			host_name = node_info["host_node_id"][:middle]
		} else {
			host_name = node_info["host_node_id"]
		}
		if len(node_info["pid"]) > 0 {
			edges := []map[string]string{}
			for _, i := range n.Adjacency {
				if n.ID != i {
					first := strings.IndexByte(i, ';')
					second := strings.IndexByte(i[first+1:], ';') + first + 1
					if host, ok := resolvers.network_map[i[first+1:second]]; ok {
						if host_name == host {
							continue
						}
						rightpid, ok := resolvers.hostport_hostpid[i[first+1:second]][i[second+1:]]
						if ok {
							first := strings.IndexByte(rightpid, ';')
							edges = append(edges,
								map[string]string{"destination": host, "left_pid": node_info["pid"], "right_pid": rightpid[first+1:]})
						}
					}
					//endpoint_edges = append(endpoint_edges, map[string]string{"left": node_info["node_id"], "right": i})
				}
			}
			endpoint_edges_batch = append(endpoint_edges_batch, map[string]interface{}{"source": host_name, "edges": edges})
		}
	}

	//fmt.Printf("edges: %v\n", endpoint_edges_batch)
	process_batch := []map[string]string{}
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

	container_batch := []map[string]string{}
	container_edges_batch := map[string][]string{}
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
		container_edges_batch[host] = append(container_edges_batch[host], node_info["node_id"])
	}

	pod_batch := []map[string]string{}
	pod_edges_batch := map[string][]string{}
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

		Endpoint_batch: endpoint_batch,
		Endpoint_edges: endpoint_edges,

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
		log.Printf("ingester channel full\n")
		return fmt.Errorf("ingester channel full")
	}
	return nil
}

func (nc *neo4jCollector) CleanDB() error {
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

	time_ms := 60_000

	if _, err = tx.Run("match (n:TNode) WHERE n.updated_at < TIMESTAMP()-$time_ms match (n) -[:HOSTS]->(m) detach delete n detach delete m", map[string]interface{}{"time_ms": time_ms}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:TContainer) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": time_ms}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:TPod) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": time_ms}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:TProcess) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": time_ms}); err != nil {
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

	//if _, err := tx.Run("UNWIND $batch_host as row MERGE (n:TNode{node_id:row.node_id}) SET n+= row UNWIND $batch_container as row MERGE (c:TContainer{node_id:row.node_id}) SET c += row UNWIND $batch_pod as row MERGE (p:TPod{node_id:row.node_id}) SET c += row UNWIND $batch_process as row MERGE (proc:TProcess{node_id:row.node_id}) SET proc += row",
	//	map[string]interface{}{"batch_host": batches.Host_batch, "batch_container": batches.Container_batch, "batch_pod": batches.Pod_batch, "batch_process": batches.Process_batch}); err != nil {
	//	return err
	//}

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

	fmt.Printf("DB nodes: %v\n", time.Since(start))
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

	fmt.Printf("DB edge: %v\n", time.Since(start))
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
	fmt.Printf("DB conn: %v\n", time.Since(start))

	return tx.Commit()
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
		resolvers_queue:  make(chan *report.Report, worker_size*2),
		preparers_queue:  make(chan *report.Report, worker_size),
	}

	for i := 0; i < worker_size; i++ {
		go func() {
			for rpt := range nc.resolvers_queue {
				r := computeResolvers(rpt)
				nc.resolvers_update <- r
			}
		}()
	}

	for i := 0; i < worker_size; i++ {
		go func() {
			for rpt := range nc.preparers_queue {
				nc.resolver_access.RLock()
				batches := prepareNeo4jIngestion(rpt, &nc.resolvers)
				nc.resolver_access.RUnlock()
				nc.batcher <- batches
			}
		}()
	}

	go func() {
		for rpt := range nc.ingester {
			select {
			case nc.preparers_queue <- rpt:
			default:
				log.Printf("preparer channel full\n")
			}

			select {
			case nc.resolvers_queue <- rpt:
			default:
				log.Printf("resolvers channel full\n")
			}
		}
	}()

	db_pusher := make(chan neo4jIngestionData, db_queue_size)
	go func() {
		batch := make([]neo4jIngestionData, batch_size)
		size := 0
		send := false
		timeout := time.After(time.Second * 5)
		for {
			select {
			case report := <-nc.batcher:
				batch[size] = report
				size += 1
				if size == len(batch) {
					send = true
				}
			case <-timeout:
				if size > 0 {
					timeout = time.After(time.Second * 5)
					send = true
				} else {
					timeout = time.After(time.Second * 5)
				}
			}
			if send {
				timeout = time.After(time.Second * 5)
				send = false
				size = 0
				final_batch := batch[0]
				i := 1
				for {
					if i == len(batch) {
						break
					}
					final_batch.merge(&batch[i])
					i += 1
				}
				select {
				case db_pusher <- final_batch:
				default:
					log.Printf("DB channel full\n")
				}
			}
		}
	}()

	go func() {
		clean_up := time.After(time.Minute * 1)
		for {
			select {
			case batches := <-db_pusher:
				start := time.Now()
				err := nc.PushToDB(batches)
				fmt.Printf("DB push: %v\n", time.Since(start))
				if err != nil {
					fmt.Printf("push to neo4j err: %v\n", err)
				}
			case <-clean_up:
				clean_up = time.After(time.Minute * 1)
				start := time.Now()
				err = nc.CleanDB()
				fmt.Printf("DB clean: %v\n", time.Since(start))
				if err != nil {
					fmt.Printf("clean neo4j err: %v\n", err)
				}
			}
		}
	}()

	go nc.resolversUpdater()

	return nc, nil
}

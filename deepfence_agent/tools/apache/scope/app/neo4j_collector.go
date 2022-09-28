package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/report"
)

type EndpointResolvers struct {
	network_map      map[string]string
	hostport_hostpid map[string]string
}

func NewEndpointResolvers() EndpointResolvers {
	return EndpointResolvers{
		network_map:      map[string]string{},
		hostport_hostpid: map[string]string{},
	}
}

type neo4jCollector struct {
	driver    neo4j.Driver
	ingester  chan *report.Report
	resolvers EndpointResolvers
	batcher   chan neo4jIngestionData
}

type neo4jIngestionData struct {
	Process_batch []map[string]string
	Host_batch    []map[string]string
	Container_batch    []map[string]string
	Pod_batch    []map[string]string

	Process_edges_batch  []map[string]string
	Container_edges_batch     []map[string]string
	Pod_edges_batch     []map[string]string
	Endpoint_edges_batch []map[string]string

	Endpoint_batch []map[string]string
	Endpoint_edges []map[string]string

	Hosts []map[string]string
}

func mapMerge(a, b *[]map[string]string) {
	for k, v := range *b {
		(*a)[k] = v
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

func prepareNeo4jIngestion(rpt *report.Report, resolvers *EndpointResolvers) neo4jIngestionData {

	start := time.Now()

	processes_to_keep := map[string]struct{}{}
	hosts := []map[string]string{}

	host_batch := []map[string]string{}
	for _, n := range rpt.Host.Nodes {
		node_info := n.ToDataMap()
		hosts = append(hosts, map[string]string{"node_id": node_info["node_id"]})
		host_batch = append(host_batch, node_info)
		var result map[string]interface{}
		json.Unmarshal([]byte(node_info["interface_ips"]), &result)
		for k, _ := range result {
			resolvers.network_map[k] = node_info["host_name"]
		}
	}

	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			first := strings.IndexByte(node_info["node_id"], ';')
			second := strings.IndexByte(node_info["node_id"][first+1:], ';') + first + 1
			middle := strings.IndexByte(hni, ';')
			resolvers.network_map[node_info["node_id"][first+1:second]] = hni[:middle]
			resolvers.hostport_hostpid[node_info["node_id"][first+1:]] = fmt.Sprintf("%v;%v", node_info["node_id"][first+1:second], node_info["pid"])
			processes_to_keep[hni[:middle]+";"+node_info["pid"]] = struct{}{}
		}
	}

	fmt.Printf("net_map size: %v\n", len(resolvers.network_map))
	fmt.Printf("hostport : %v\n", len(resolvers.hostport_hostpid))

	fmt.Printf("update maps: %v\n", time.Since(start))

	endpoint_edges_batch := []map[string]string{}
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
			for _, i := range n.Adjacency {
				if n.ID != i {
					first := strings.IndexByte(i, ';')
					second := strings.IndexByte(i[first+1:], ';') + first + 1
					if host, ok := resolvers.network_map[i[first+1:second]]; ok {
						if host_name == host {
							continue
						}
						rightpid, ok := resolvers.hostport_hostpid[i[first+1:]]
						if ok {
							first := strings.IndexByte(rightpid, ';')
							endpoint_edges_batch = append(endpoint_edges_batch,
								map[string]string{"left": host_name, "right": host, "left_pid": node_info["pid"], "right_pid": rightpid[first+1:]})
						}
					}
					//endpoint_edges = append(endpoint_edges, map[string]string{"left": node_info["node_id"], "right": i})
				}
			}
		}
	}

	//fmt.Printf("edges: %v\n", endpoint_edges_batch)
	process_batch := []map[string]string{}
	process_edges_batch := []map[string]string{}
	for _, n := range rpt.Process.Nodes {
		node_info := n.ToDataMap()
		node_info["node_id"] += ";"
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

	return neo4jIngestionData{
		Endpoint_edges_batch: endpoint_edges_batch,

		Process_batch: process_batch,
		Host_batch:    host_batch,
		Container_batch:    container_batch,
		Pod_batch:    pod_batch,

		Process_edges_batch: process_edges_batch,
		Container_edges_batch: container_edges_batch,
		Pod_edges_batch: pod_edges_batch,

		Endpoint_batch: endpoint_batch,
		Endpoint_edges: endpoint_edges,

		Hosts: hosts,
	}
}

func (nc *neo4jCollector) ingestIntoNeo4j(rpt *report.Report) error {

	start := time.Now()
	batches := prepareNeo4jIngestion(rpt, &nc.resolvers)
	fmt.Printf("ingestion preparation : %v\n", time.Since(start))

	nc.batcher <- batches
	return nil
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

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:TNode{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Host_batch}); err != nil {
		return err
	}

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:TContainer{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Container_batch}); err != nil {
		return err
	}

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:TPod{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Pod_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MERGE (n:TProcess{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Process_batch}); err != nil {
		return err
	}

	fmt.Printf("node + process upsert: %v\n", time.Since(start))

	//if _, err = tx.Run("UNWIND $batch as row MERGE (n:TEndpoint{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Endpoint_batch}); err != nil {
	//	return err
	//}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TContainer{node_id: row.right}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Container_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TPod{node_id: row.right}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Pod_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TProcess{node_id: row.right}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Process_edges_batch}); err != nil {
		return err
	}

	fmt.Printf("hosts upsert: %v\n", time.Since(start))

	//if _, err = tx.Run("UNWIND $batch as row MATCH (n:TEndpoint{node_id: row.left}),(m:TEndpoint{node_id: row.right}) MERGE (n)-[:CONNECTS]->(m)", map[string]interface{}{"batch": batches.Endpoint_edges}); err != nil {
	//	return err
	//}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.node_id}) -[r:CONNECTS]-> (:TNode) detach delete r", map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	fmt.Printf("delete connections: %v\n", time.Since(start))

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:TNode{node_id: row.left}),(m:TNode{node_id: row.right}) MERGE (n)-[:CONNECTS {left_pid: row.left_pid, right_pid: row.right_pid}]->(m)", map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
		return err
	}

	fmt.Printf("add connections: %v\n", time.Since(start))

	return tx.Commit()
}

func NewNeo4jCollector(_ time.Duration) (Collector, error) {
	driver, err := neo4j.NewDriver("bolt://neo4j-db:7687", neo4j.BasicAuth("neo4j", "password", ""))

	if err != nil {
		return nil, err
	}

	nc := &neo4jCollector{
		driver:    driver,
		resolvers: NewEndpointResolvers(),
		ingester:  make(chan *report.Report, 1000),
		batcher:   make(chan neo4jIngestionData, 1000),
	}

	go func() {
		//batch := report.MakeReport()
		//i := 0
		for {
			select {
			case rpt := <-nc.ingester:
				//batch.UnsafeMerge(*rpt)
				// TODO: use that info
				//for k, _ := range rpt.Host.Nodes {
				//	fmt.Printf("host: %v\n", k)
				//}
				//i += 1
				//if i == 100 {
				err := nc.ingestIntoNeo4j(rpt)
				if err != nil {
					log.Printf("err: %v", err)
				}
				//		batch = report.MakeReport()
				//		i = 0
				//}
				//case <-time.After(time.Second * 2):
				//	if i > 0 {
				//		err := nc.ingestIntoNeo4j(batch)
				//		if err != nil {
				//			log.Printf("err: %v", err)
				//		}
				//		batch = report.MakeReport()
				//		i = 0
				//	}
			}
		}
	}()

	db_pusher := make(chan neo4jIngestionData, 10)
	go func() {
		batch := make([]neo4jIngestionData, 100)
		size := 0
		for {
			select {
			case report := <-nc.batcher:
				batch[size] = report
				size += 1
				if size == len(batch) {
					final_batch := batch[0]
					i := 1
					for {
						if i == len(batch) {
							break
						}
						final_batch.merge(&batch[i])
						i += 1
					}
					db_pusher <- final_batch
					size = 0
				}
			case <-time.After(time.Second * 1):
				if size > 0 {
					final_batch := batch[0]
					i := 1
					for {
						if i == len(batch) {
							break
						}
						final_batch.merge(&batch[i])
						i += 1
					}
					db_pusher <- final_batch
					size = 0
				}
			}
		}
	}()

	go func() {
		for {
			select {
			case batches := <-db_pusher:
				start := time.Now()
				fmt.Printf("concat batches: %v\n", time.Since(start))
				err := nc.PushToDB(batches)
				fmt.Printf("push db: %v\n", time.Since(start))
				if err != nil {
					fmt.Printf("push to neo4j err: %v\n", err)
				}
			}
		}
	}()

	return nc, nil
}

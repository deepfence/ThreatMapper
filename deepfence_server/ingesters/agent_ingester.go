package ingesters

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	redis2 "github.com/go-redis/redis/v8"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/report"
)

const (
	REDIS_NETWORK_MAP_KEY   = "network_map"
	REDIS_IPPORTPID_MAP_KEY = "ipportpid_map"
	workers_num             = 500
	db_input_size           = 100
	db_batch_size           = 1_000
	db_batch_timeout        = time.Second * 5
	resolver_batch_size     = 1_000
	resolver_timeout        = time.Second * 10
	ingester_size           = 25_000
	db_clean_up_timeout     = time.Minute * 2
	max_network_maps_size   = 1024 * 1024 * 1024 // 1 GB per maps
	enqueer_timeout         = time.Second * 30
	localhost_ip            = "127.0.0.1"
)

type EndpointResolvers struct {
	network_map  map[string]string
	ipport_ippid map[string]string
}

type EndpointResolversCache struct {
	rdb *redis2.Client
}

func NewEndpointResolvers() EndpointResolvers {
	return EndpointResolvers{
		network_map:  map[string]string{},
		ipport_ippid: map[string]string{},
	}
}

func newEndpointResolversCache(ctx context.Context) (EndpointResolversCache, error) {
	rdb, err := directory.RedisClient(ctx)
	return EndpointResolversCache{
		rdb: rdb,
	}, err
}

func (erc *EndpointResolversCache) clean_maps() {
	if v, _ := erc.rdb.MemoryUsage(context.Background(), REDIS_NETWORK_MAP_KEY).Result(); v > max_network_maps_size {
		log.Debug().Msgf("Memory usage for %v reached limit", REDIS_NETWORK_MAP_KEY)
		erc.rdb.HDel(context.Background(), REDIS_NETWORK_MAP_KEY)
	}
	if v, _ := erc.rdb.MemoryUsage(context.Background(), REDIS_IPPORTPID_MAP_KEY).Result(); v > max_network_maps_size {
		log.Debug().Msgf("Memory usage for %v reached limit", REDIS_IPPORTPID_MAP_KEY)
		erc.rdb.HDel(context.Background(), REDIS_IPPORTPID_MAP_KEY)
	}
}

func (erc *EndpointResolversCache) push_maps(er *EndpointResolvers) {
	erc.rdb.HSet(context.Background(), REDIS_NETWORK_MAP_KEY, er.network_map)
	erc.rdb.HSet(context.Background(), REDIS_IPPORTPID_MAP_KEY, er.ipport_ippid)
}

func (erc *EndpointResolversCache) get_host(ip string) (string, bool) {
	res, err := erc.rdb.HGet(context.Background(), REDIS_NETWORK_MAP_KEY, ip).Result()
	return res, err == nil
}

func (erc *EndpointResolversCache) get_ip_pid(ip_port string) (string, bool) {
	res, err := erc.rdb.HGet(context.Background(), REDIS_IPPORTPID_MAP_KEY, ip_port).Result()
	return res, err == nil
}

func (erc *EndpointResolversCache) Close() {
}

type neo4jIngester struct {
	driver           *neo4j.Driver
	enqueuer         chan *report.Report
	ingester         chan map[string]*report.Report
	resolvers_access sync.RWMutex
	resolvers        EndpointResolversCache
	batcher          chan neo4jIngestionData
	resolvers_update chan EndpointResolvers
	resolvers_input  chan *report.Report
	preparers_input  chan *report.Report
}

func (nc *neo4jIngester) runEnqueueReport() {
	report_buffer := map[string]*report.Report{}
	timeout := time.After(enqueer_timeout)
	i := 0
	for {
		select {
		case rpt := <-nc.enqueuer:
			var probe_id string
			for _, n := range rpt.Host.Nodes {
				probe_id, _ = n.Latest.Lookup("control_probe_id")
				if len(rpt.Host.Nodes) > 1 {
					log.Error().Msgf("multiple probe ids: %v", probe_id)
				}
			}
			report_buffer[probe_id] = rpt
			i += 1
		case <-timeout:
			fmt.Printf("Sending %v unique reports over %v received\n", len(report_buffer), i)
			select {
			case nc.ingester <- report_buffer:
				report_buffer = map[string]*report.Report{}
				i = 0
			default:
				log.Warn().Msgf("ingester channel full")
			}
			timeout = time.After(enqueer_timeout)
		}
	}
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
		for k := range result {
			resolvers.network_map[k] = node_info["host_name"]
		}
	}

	var buf bytes.Buffer
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			node_ip, node_port := extractIPPortFromEndpointID(node_info["node_id"])
			if node_ip == localhost_ip {
				continue
			}
			resolvers.network_map[node_ip] = extractHostFromHostNodeID(hni)
			buf.Reset()
			buf.WriteString(node_ip)
			buf.WriteByte(';')
			buf.WriteString(node_info["pid"])
			resolvers.ipport_ippid[node_ip+node_port] = buf.String()
		}
	}

	return resolvers
}

func (nc *neo4jIngester) resolversUpdater() {
	for {
		select {
		case <-time.After(resolver_timeout):
			elements := min(len(nc.resolvers_update), resolver_batch_size)
			if elements == 0 {
				continue
			}
			start := time.Now()
			//nc.resolvers_access.Lock()
			batch_resolver := <-nc.resolvers_update
			for i := 1; i < elements; i++ {
				resolver := <-nc.resolvers_update
				batch_resolver.merge(&resolver)
			}
			nc.resolvers.clean_maps()
			nc.resolvers.push_maps(&batch_resolver)
			log.Debug().Msgf("resolver merge time: %v for %v elements", time.Since(start), elements)
			//log.Debug().Msgf("net_map size: %v", len(nc.resolvers.network_map))
			//log.Debug().Msgf("hostport : %v", len(nc.resolvers.ipport_ippid))
			//nc.resolvers_access.Unlock()
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

func prepareNeo4jIngestion(rpt *report.Report, resolvers *EndpointResolversCache) neo4jIngestionData {
	hosts := make([]map[string]string, 0, len(rpt.Host.Nodes))
	host_batch := make([]map[string]string, 0, len(rpt.Host.Nodes))
	for _, n := range rpt.Host.Nodes {
		node_info := n.ToDataMap()
		hosts = append(hosts, map[string]string{"node_id": node_info["node_id"]})
		host_batch = append(host_batch, node_info)
	}

	processes_to_keep := map[string]struct{}{}
	var buf bytes.Buffer
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if hni, ok := node_info["host_node_id"]; ok {
			host := extractHostFromHostNodeID(hni)
			buf.Reset()
			buf.WriteString(host)
			buf.WriteByte(';')
			buf.WriteString(node_info["pid"])
			host_pid := buf.String()
			processes_to_keep[host_pid] = struct{}{}
		}
	}

	endpoint_edges_batch := make([]map[string]interface{}, 0, len(rpt.Endpoint.Nodes))
	//endpoint_batch := []map[string]string{}
	//endpoint_edges := []map[string]string{}
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if _, ok := node_info["host_node_id"]; !ok {
			node_ip, _ := extractIPPortFromEndpointID(node_info["node_id"])
			if val, ok := resolvers.get_host(node_ip); ok {
				node_info["host_node_id"] = val
			} else {
				// This includes skipping all endpoint having 127.0.0.1
				continue
			}
		}
		//node_info["adja"] = strings.Join(n.Adjacency, ",")
		//endpoint_batch = append(endpoint_batch, node_info)

		host_name := extractHostFromHostNodeID(node_info["host_node_id"])
		if len(node_info["pid"]) > 0 {
			edges := make([]map[string]string, 0, len(n.Adjacency))
			for _, i := range n.Adjacency {
				if n.ID != i {
					ip, port := extractIPPortFromEndpointID(i)
					if host, ok := resolvers.get_host(ip); ok {
						if host_name == host {
							continue
						}
						right_ippid, ok := resolvers.get_ip_pid(ip + port)
						if ok {
							rightpid := extractPidFromNodeID(right_ippid)
							edges = append(edges,
								map[string]string{"destination": host, "left_pid": node_info["pid"], "right_pid": rightpid})
						}
					} else {
						edges = append(edges,
							map[string]string{"destination": "out-the-internet", "left_pid": node_info["pid"], "right_pid": "0"})
					}
					//endpoint_edges = append(endpoint_edges, map[string]string{"left": node_info["node_id"], "right": i})
				}
			}
			endpoint_edges_batch = append(endpoint_edges_batch, map[string]interface{}{"source": host_name, "edges": edges})
		}
	}

	// Handle inbound from internet
	edges := []map[string]string{}
	for _, n := range rpt.Endpoint.Nodes {
		node_info := n.ToDataMap()
		if _, ok := node_info["host_node_id"]; !ok {
			node_ip, _ := extractIPPortFromEndpointID(node_info["node_id"])
			if val, ok := resolvers.get_host(node_ip); ok {
				node_info["host_node_id"] = val
			} else {
				// This includes skipping all endpoint having 127.0.0.1
				continue
			}
		}
		//node_info["adja"] = strings.Join(n.Adjacency, ",")
		//endpoint_batch = append(endpoint_batch, node_info)

		host_name := extractHostFromHostNodeID(node_info["host_node_id"])
		if len(node_info["pid"]) > 0 && len(n.Adjacency) == 0 {
			edges = append(edges,
				map[string]string{"destination": host_name, "left_pid": "0", "right_pid": node_info["pid"]})
		}
	}
	endpoint_edges_batch = append(endpoint_edges_batch, map[string]interface{}{"source": "in-the-internet", "edges": edges})

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
				host, ok = resolvers.get_host(node_info["kubernetes_ip"])
				if !ok {
					continue
				}
			}
		}
		node_info["host_name"] = host
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

func (nc *neo4jIngester) Close() {
	nc.resolvers.Close()
}

func (nc *neo4jIngester) Ingest(ctx context.Context, rpt report.Report) error {
	select {
	case nc.enqueuer <- &rpt:
	default:
		return fmt.Errorf("enqueuer channel full")
	}
	return nil
}

func (nc *neo4jIngester) CleanUpDB() error {
	session, err := nc.neo4jClient().Session(neo4j.AccessModeWrite)
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("match (n:Node) WHERE n.updated_at < TIMESTAMP()-$time_ms match (n) -[:HOSTS]->(m) detach delete n detach delete m", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:Container) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:Pod) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:Process) WHERE n.updated_at < TIMESTAMP()-$time_ms detach delete n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	return tx.Commit()
}

func (nc *neo4jIngester) PushToDB(batches neo4jIngestionData) error {
	session, err := nc.neo4jClient().Session(neo4j.AccessModeWrite)
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

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:Node{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Host_batch}); err != nil {
		return err
	}

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:Container{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Container_batch}); err != nil {
		return err
	}

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:Pod{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Pod_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MERGE (n:Process{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"batch": batches.Process_batch}); err != nil {
		return err
	}

	log.Debug().Msgf("Upserting DB nodes took: %v", time.Since(start))
	start = time.Now()

	//if _, err = tx.Run("UNWIND $batch as row MERGE (n:TEndpoint{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Endpoint_batch}); err != nil {
	//return err
	//}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:Node{node_id: row.source}) WITH n, row UNWIND row.destinations as dest MATCH (m:Container{node_id: dest}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Container_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:Node{node_id: row.source}) WITH n, row UNWIND row.destinations as dest MATCH (m:Pod{node_id: dest}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Pod_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:Node{node_id: row.source}) WITH n, row UNWIND row.destinations as dest MATCH (m:Process{node_id: dest}) MERGE (n)-[:HOSTS]->(m)", map[string]interface{}{"batch": batches.Process_edges_batch}); err != nil {
		return err
	}

	log.Debug().Msgf("Upserting DB edges add took: %v", time.Since(start))
	start = time.Now()

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:Node{node_id: row.node_id}) -[r:CONNECTS]-> (:Node) detach delete r", map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:Node{node_id: 'in-the-internet'}) -[r:CONNECTS]-> (n:Node{node_id: row.node_id}) detach delete r", map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	if _, err = tx.Run("UNWIND $batch as row MATCH (n:Node{node_id: row.source}) WITH n, row UNWIND row.edges as row2  MATCH (m:Node{node_id: row2.destination}) MERGE (n)-[:CONNECTS {left_pid: row2.left_pid, right_pid: row2.right_pid}]->(m)", map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
		return err
	}

	log.Debug().Msgf("Upserting DB connections edges took: %v", time.Since(start))

	return tx.Commit()
}

func (nc *neo4jIngester) runIngester() {
	for reports := range nc.ingester {
		for _, rpt := range reports {
			select {
			case nc.preparers_input <- rpt:
			default:
				log.Warn().Msgf("preparer channel full")
			}

			select {
			case nc.resolvers_input <- rpt:
			default:
				log.Warn().Msgf("resolvers channel full")
			}
		}
	}
}

func (nc *neo4jIngester) runDBBatcher(db_pusher chan neo4jIngestionData) {
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
				log.Warn().Msgf("DB channel full")
			}
		}
		if reset_timeout {
			reset_timeout = false
			timeout = time.After(db_batch_timeout)
		}
	}
}

func (nc *neo4jIngester) runDBPusher(db_pusher chan neo4jIngestionData) {
	clean_up := time.After(db_clean_up_timeout)
	for {
		select {
		case batches := <-db_pusher:
			start := time.Now()
			err := nc.PushToDB(batches)
			logrus.Infof("DB push: %v", time.Since(start))
			if err != nil {
				log.Error().Msgf("push to neo4j err: %v", err)
			}
		case <-clean_up:
			start := time.Now()
			err := nc.CleanUpDB()
			logrus.Infof("DB clean: %v", time.Since(start))
			if err != nil {
				log.Error().Msgf("clean neo4j err: %v", err)
			}
			clean_up = time.After(time.Minute * 1)
		}
	}
}

func (nc *neo4jIngester) runResolver() {
	for rpt := range nc.resolvers_input {
		r := computeResolvers(rpt)
		nc.resolvers_update <- r
	}
}

func (nc *neo4jIngester) runPreparer() {
	for rpt := range nc.preparers_input {
		nc.resolvers_access.RLock()
		batches := prepareNeo4jIngestion(rpt, &nc.resolvers)
		nc.resolvers_access.RUnlock()
		nc.batcher <- batches
	}
}

func (nc *neo4jIngester) applyDBConstraints() error {

	session, err := nc.neo4jClient().Session(neo4j.AccessModeWrite)
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	tx.Run("CREATE CONSTRAINT ON (n:Node) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:Container) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:Pod) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:Process) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:KCluster) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:SecretScan) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:Secret) ASSERT n.rule_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:Cve) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:CveScan) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:SecurityGroup) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("CREATE CONSTRAINT ON (n:CloudResource) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	tx.Run("MERGE (n:Node{node_id:'in-the-internet', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})
	tx.Run("MERGE (n:Node{node_id:'out-the-internet', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})

	return tx.Commit()
}

func (nc *neo4jIngester) neo4jClient() neo4j.Driver {
	return *nc.driver
}

func NewNeo4jCollector(ctx context.Context) (Ingester[report.Report], error) {
	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, err
	}

	rdb, err := newEndpointResolversCache(ctx)

	if err != nil {
		return nil, err
	}

	nc := &neo4jIngester{
		driver:           driver,
		resolvers:        rdb,
		enqueuer:         make(chan *report.Report, ingester_size),
		ingester:         make(chan map[string]*report.Report, ingester_size),
		batcher:          make(chan neo4jIngestionData, ingester_size),
		resolvers_update: make(chan EndpointResolvers, ingester_size),
		resolvers_input:  make(chan *report.Report, ingester_size),
		preparers_input:  make(chan *report.Report, ingester_size),
	}

	err = nc.applyDBConstraints()
	if err != nil {
		log.Error().Msgf("Neo4j prep err: %v", err)
	}

	for i := 0; i < workers_num; i++ {
		go nc.runResolver()
		go nc.runPreparer()
	}

	db_pusher := make(chan neo4jIngestionData, db_input_size)
	go nc.runDBBatcher(db_pusher)
	go nc.runDBPusher(db_pusher)

	go nc.resolversUpdater()

	go nc.runIngester()
	go nc.runEnqueueReport()

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

func extractIPPortFromEndpointID(node_id string) (string, string) {
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

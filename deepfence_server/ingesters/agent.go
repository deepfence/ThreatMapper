package ingesters

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/telemetry"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	redis2 "github.com/redis/go-redis/v9"
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
	driver           neo4j.Driver
	enqueuer         chan *report.Report
	ingester         chan map[string]*report.Report
	resolvers_access sync.RWMutex
	resolvers        EndpointResolversCache
	batcher          chan ReportIngestionData
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
			log.Info().Msgf("Sending %v unique reports over %v received", len(report_buffer), i)
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

type ReportIngestionData struct {
	Process_batch            []map[string]string `json:"process_batch" required:"true"`
	Host_batch               []map[string]string `json:"host_batch" required:"true"`
	Container_batch          []map[string]string `json:"container_batch" required:"true"`
	Pod_batch                []map[string]string `json:"pod_batch" required:"true"`
	Container_image_batch    []map[string]string `json:"container_image_batch" required:"true"`
	Kubernetes_cluster_batch []map[string]string `json:"kubernetes_cluster_batch" required:"true"`

	Process_edges_batch           []map[string]interface{} `json:"process_edges_batch" required:"true"`
	Container_edges_batch         []map[string]interface{} `json:"container_edges_batch" required:"true"`
	Pod_edges_batch               []map[string]interface{} `json:"pod_edges_batch" required:"true"`
	Endpoint_edges_batch          []map[string]interface{} `json:"endpoint_edges_batch" required:"true"`
	Container_image_edge_batch    []map[string]interface{} `json:"container_image_edge_batch" required:"true"`
	Kubernetes_cluster_edge_batch []map[string]interface{} `json:"kubernetes_cluster_edge_batch" required:"true"`

	//Endpoint_batch []map[string]string
	//Endpoint_edges []map[string]string

	Hosts []map[string]string `json:"hosts" required:"true"`
}

func (r *EndpointResolvers) merge(other *EndpointResolvers) {
	for k, v := range other.network_map {
		r.network_map[k] = v
	}

	for k, v := range other.ipport_ippid {
		r.ipport_ippid[k] = v
	}
}

func (nd *ReportIngestionData) merge(other *ReportIngestionData) {
	nd.Process_batch = append(nd.Process_batch, other.Process_batch...)
	nd.Host_batch = append(nd.Host_batch, other.Host_batch...)
	nd.Container_batch = append(nd.Container_batch, other.Container_batch...)
	nd.Container_image_batch = append(nd.Container_image_batch, other.Container_image_batch...)
	nd.Pod_batch = append(nd.Pod_batch, other.Pod_batch...)
	nd.Kubernetes_cluster_batch = append(nd.Kubernetes_cluster_batch, other.Kubernetes_cluster_batch...)
	nd.Process_edges_batch = append(nd.Process_edges_batch, other.Process_edges_batch...)
	nd.Container_edges_batch = append(nd.Container_edges_batch, other.Container_edges_batch...)
	nd.Pod_edges_batch = append(nd.Pod_edges_batch, other.Pod_edges_batch...)
	nd.Endpoint_edges_batch = append(nd.Endpoint_edges_batch, other.Endpoint_edges_batch...)
	nd.Container_image_edge_batch = append(nd.Container_image_edge_batch, other.Container_image_edge_batch...)
	nd.Kubernetes_cluster_edge_batch = append(nd.Kubernetes_cluster_edge_batch, other.Kubernetes_cluster_edge_batch...)
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
			span := telemetry.NewSpan(context.Background(), "ingester", "ResolversUpdater")
			batch_resolver := <-nc.resolvers_update
			for i := 1; i < elements; i++ {
				resolver := <-nc.resolvers_update
				batch_resolver.merge(&resolver)
			}
			nc.resolvers.clean_maps()
			nc.resolvers.push_maps(&batch_resolver)
			span.End()
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

func prepareNeo4jIngestion(rpt *report.Report, resolvers *EndpointResolversCache) ReportIngestionData {
	hosts := make([]map[string]string, 0, len(rpt.Host.Nodes))
	host_batch := make([]map[string]string, 0, len(rpt.Host.Nodes))
	kubernetes_batch := make([]map[string]string, 0, len(rpt.Host.Nodes))
	kubernetes_edge_batch := map[string][]string{}
	for _, n := range rpt.Host.Nodes {
		node_info := n.ToDataMap()
		hosts = append(hosts, map[string]string{"node_id": node_info["node_id"]})
		host_batch = append(host_batch, node_info)

		if node_info["kubernetes_cluster_id"] != "" {
			kubernetes_batch = append(kubernetes_batch, map[string]string{
				"node_id":   node_info["kubernetes_cluster_id"],
				"node_name": node_info["kubernetes_cluster_name"],
			})
			kubernetes_edge_batch[node_info["kubernetes_cluster_id"]] = append(kubernetes_edge_batch[node_info["kubernetes_cluster_id"]], node_info["node_id"])
		}
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

	container_image_batch := make([]map[string]string, 0, len(rpt.Container.Nodes))
	container_image_edges_batch := map[string][]string{}
	for _, n := range rpt.ContainerImage.Nodes {
		node_info := n.ToDataMap()
		host, ok := node_info["host_name"]
		if !ok {
			hni, ok := node_info["host_node_id"]
			if !ok {
				continue
			}
			host = extractHostFromHostNodeID(hni)
		}
		container_image_batch = append(container_image_batch, node_info)
		container_image_edges_batch[host] = append(container_image_edges_batch[host], node_info["node_id"])
	}

	// Note: Pods are provided alone with an extra report
	// Therefore, it cannot rely on any previously computed data
	pod_batch := make([]map[string]string, 0, len(rpt.Pod.Nodes))
	pod_edges_batch := map[string][]string{}
	for _, n := range rpt.Pod.Nodes {
		node_info := n.ToDataMap()
		k8sid, ok := node_info["kubernetes_cluster_id"]
		if !ok {
			continue
		}
		if val, ok := resolvers.get_host(node_info["kubernetes_ip"]); ok {
			node_info["host_node_id"] = val
		}
		pod_batch = append(pod_batch, node_info)
		pod_edges_batch[k8sid] = append(pod_edges_batch[k8sid], node_info["node_id"])
	}

	return ReportIngestionData{
		Endpoint_edges_batch: endpoint_edges_batch,

		Process_batch:            process_batch,
		Host_batch:               host_batch,
		Container_batch:          container_batch,
		Pod_batch:                pod_batch,
		Container_image_batch:    container_image_batch,
		Kubernetes_cluster_batch: kubernetes_batch,

		Process_edges_batch:           concatMaps(process_edges_batch),
		Container_edges_batch:         concatMaps(container_edges_batch),
		Pod_edges_batch:               concatMaps(pod_edges_batch),
		Container_image_edge_batch:    concatMaps(container_image_edges_batch),
		Kubernetes_cluster_edge_batch: concatMaps(kubernetes_edge_batch),

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

func (nc *neo4jIngester) PushToDB(batches ReportIngestionData) error {
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

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:Node{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true`,
		map[string]interface{}{"batch": batches.Host_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:Container{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true`,
		map[string]interface{}{"batch": batches.Container_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:ContainerImage{node_id:row.node_id})
		MERGE (s:ImageStub{node_id: row.docker_image_name})
		MERGE (n) -[:IS]-> (s)
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true`,
		map[string]interface{}{"batch": batches.Container_image_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:Pod{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"batch": batches.Pod_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:KubernetesCluster{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true, n.node_type = 'cluster'`,
		map[string]interface{}{"batch": batches.Kubernetes_cluster_batch}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:Process{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"batch": batches.Process_batch}); err != nil {
		return err
	}

	//if _, err = tx.Run("UNWIND $batch as row MERGE (n:TEndpoint{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Endpoint_batch}); err != nil {
	//return err
	//}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Container{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Container_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:ContainerImage{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Container_image_edge_batch}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:KubernetesCluster{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Node{node_id: dest})
		MERGE (n)-[:INSTANCIATE]->(m)`,
		map[string]interface{}{"batch": batches.Kubernetes_cluster_edge_batch}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:KubernetesCluster{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Pod{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Pod_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Process{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Process_edges_batch}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.node_id}) -[r:CONNECTS]-> (:Node)
		DETACH DELETE r`,
		map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: 'in-the-internet'}) -[r:CONNECTS]-> (n:Node{node_id: row.node_id})
		DETACH DELETE r`, map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.edges as row2
		MATCH (m:Node{node_id: row2.destination})
		MERGE (n)-[:CONNECTS {left_pid: row2.left_pid, right_pid: row2.right_pid}]->(m)`, map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
		return err
	}

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

func (nc *neo4jIngester) runDBBatcher(db_pusher chan ReportIngestionData) {
	batch := make([]ReportIngestionData, db_batch_size)
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

func (nc *neo4jIngester) runDBPusher(db_pusher chan ReportIngestionData) {
	for {
		select {
		case batches := <-db_pusher:
			span := telemetry.NewSpan(context.Background(), "ingester", "PushAgentReportsToDB")
			defer span.End()
			err := nc.PushToDB(batches)
			if err != nil {
				span.EndWithErr(err)
				log.Error().Msgf("push to neo4j err: %v", err)
			}
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
		batcher:          make(chan ReportIngestionData, ingester_size),
		resolvers_update: make(chan EndpointResolvers, ingester_size),
		resolvers_input:  make(chan *report.Report, ingester_size),
		preparers_input:  make(chan *report.Report, ingester_size),
	}

	for i := 0; i < workers_num; i++ {
		go nc.runResolver()
		go nc.runPreparer()
	}

	db_pusher := make(chan ReportIngestionData, db_input_size)
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

package ingesters

import (
	"bytes"
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/telemetry"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
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
			var hostNodeId string
			for _, n := range rpt.Host {
				hostNodeId = n.HostName
				if len(rpt.Host) > 1 {
					log.Error().Msgf("multiple hosts in one report: %v", hostNodeId)
				}
			}
			report_buffer[hostNodeId] = rpt
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
	Process_batch            []map[string]interface{} `json:"process_batch" required:"true"`
	Host_batch               []map[string]interface{} `json:"host_batch" required:"true"`
	Container_batch          []map[string]interface{} `json:"container_batch" required:"true"`
	Pod_batch                []map[string]interface{} `json:"pod_batch" required:"true"`
	Container_image_batch    []map[string]interface{} `json:"container_image_batch" required:"true"`
	Kubernetes_cluster_batch []map[string]interface{} `json:"kubernetes_cluster_batch" required:"true"`

	Process_edges_batch           []map[string]interface{} `json:"process_edges_batch" required:"true"`
	Container_edges_batch         []map[string]interface{} `json:"container_edges_batch" required:"true"`
	Container_process_edges_batch []map[string]interface{} `json:"container_process_edge_batch" required:"true"`
	Pod_edges_batch               []map[string]interface{} `json:"pod_edges_batch" required:"true"`
	Pod_host_edges_batch          []map[string]interface{} `json:"pod_host_edges_batch" required:"true"`
	Endpoint_edges_batch          []map[string]interface{} `json:"endpoint_edges_batch" required:"true"`
	Container_image_edge_batch    []map[string]interface{} `json:"container_image_edge_batch" required:"true"`
	Kubernetes_cluster_edge_batch []map[string]interface{} `json:"kubernetes_cluster_edge_batch" required:"true"`

	//Endpoint_batch []map[string]string
	//Endpoint_edges []map[string]string

	Hosts []map[string]interface{} `json:"hosts" required:"true"`
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
	nd.Container_process_edges_batch = append(nd.Container_process_edges_batch, other.Container_process_edges_batch...)
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

	for _, n := range rpt.Host {
		if n.InterfaceIps == nil {
			continue
		}
		for _, k := range n.InterfaceIps {
			resolvers.network_map[k] = n.HostName
		}
	}

	var buf bytes.Buffer
	for _, n := range rpt.Endpoint {
		if n.HostName == "" {
			continue
		}
		node_ip, node_port := extractIPPortFromEndpointID(n.NodeID)
		if node_ip == localhost_ip {
			continue
		}
		resolvers.network_map[node_ip] = n.HostName
		buf.Reset()
		buf.WriteString(node_ip)
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(n.Pid))
		resolvers.ipport_ippid[node_ip+node_port] = buf.String()
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
	hosts := make([]map[string]interface{}, 0, len(rpt.Host))
	host_batch := make([]map[string]interface{}, 0, len(rpt.Host))
	kubernetes_batch := make([]map[string]interface{}, 0, len(rpt.KubernetesCluster))
	kubernetes_edges_batch := map[string][]string{}

	for _, n := range rpt.Host {
		hosts = append(hosts, map[string]interface{}{"node_id": n.NodeID})
		metadataMap := metadataToMap(n)
		if n.KubernetesClusterId != "" {
			kubernetes_edges_batch[n.KubernetesClusterId] = append(kubernetes_edges_batch[n.KubernetesClusterId], n.NodeID)
		}
		host_batch = append(host_batch, metadataMap)
	}

	for _, n := range rpt.KubernetesCluster {
		kubernetes_batch = append(kubernetes_batch, metadataToMap(n))
	}

	processes_to_keep := map[string]struct{}{}
	var buf bytes.Buffer
	for _, n := range rpt.Endpoint {
		if n.HostName == "" {
			continue
		}
		buf.Reset()
		buf.WriteString(n.HostName)
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(n.Pid))
		host_pid := buf.String()
		processes_to_keep[host_pid] = struct{}{}
	}

	endpoint_edges_batch := make([]map[string]interface{}, 0, len(rpt.Endpoint))
	//endpoint_batch := []map[string]string{}
	//endpoint_edges := []map[string]string{}
	// Handle inbound from internet
	inbound_edges := []map[string]interface{}{}

	for _, n := range rpt.Endpoint {
		hostName := n.HostName
		if hostName == "" {
			node_ip, _ := extractIPPortFromEndpointID(n.NodeID)
			if val, ok := resolvers.get_host(node_ip); ok {
				hostName = val
			} else {
				// This includes skipping all endpoint having 127.0.0.1
				continue
			}
		}
		if n.Pid != -1 {
			adjacency, ok := rpt.EndpointAdjacency[n.NodeID]
			if !ok {
				continue
			}
			if len(adjacency) == 0 {
				// Handle inbound from internet
				inbound_edges = append(inbound_edges,
					map[string]interface{}{"destination": hostName, "left_pid": 0, "right_pid": n.Pid})
			} else {
				edges := make([]map[string]interface{}, 0, len(adjacency))
				for _, i := range adjacency {
					if n.NodeID != i {
						ip, port := extractIPPortFromEndpointID(i)
						if host, ok := resolvers.get_host(ip); ok {
							if hostName == host {
								continue
							}
							right_ippid, ok := resolvers.get_ip_pid(ip + port)
							if ok {
								rightpid := extractPidFromNodeID(right_ippid)
								edges = append(edges,
									map[string]interface{}{"destination": host, "left_pid": n.Pid, "right_pid": rightpid})
							}
						} else {
							edges = append(edges,
								map[string]interface{}{"destination": "out-the-internet", "left_pid": n.Pid, "right_pid": 0})
						}
					}
				}
				endpoint_edges_batch = append(endpoint_edges_batch, map[string]interface{}{"source": hostName, "edges": edges})
			}
		}
	}
	endpoint_edges_batch = append(endpoint_edges_batch, map[string]interface{}{"source": "in-the-internet", "edges": inbound_edges})

	process_batch := make([]map[string]interface{}, 0, len(rpt.Process))
	process_edges_batch := map[string][]string{}
	container_process_edges_batch := map[string][]string{}
	for _, n := range rpt.Process {
		if _, ok := processes_to_keep[n.NodeID]; !ok {
			continue
		}
		process_batch = append(process_batch, metadataToMap(n))
		process_edges_batch[n.HostName] = append(process_edges_batch[n.HostName], n.NodeID)
		if parent, has := rpt.ProcessParents[n.NodeID]; has {
			if len(parent.Container) != 0 {
				container_process_edges_batch[parent.Container] = append(container_process_edges_batch[parent.Container], n.NodeID)
			}
		}
	}

	container_batch := make([]map[string]interface{}, 0, len(rpt.Container))
	container_edges_batch := map[string][]string{}
	for _, n := range rpt.Container {
		if n.HostName == "" {
			continue
		}
		container_batch = append(container_batch, metadataToMap(n))
		container_edges_batch[n.HostName] = append(container_edges_batch[n.HostName], n.NodeID)
	}

	container_image_batch := make([]map[string]interface{}, 0, len(rpt.ContainerImage))
	container_image_edges_batch := map[string][]string{}
	for _, n := range rpt.ContainerImage {
		if n.HostName == "" {
			continue
		}
		container_image_batch = append(container_image_batch, metadataToMap(n))
		container_image_edges_batch[n.HostName] = append(container_image_edges_batch[n.HostName], n.NodeID)
	}

	// Note: Pods are provided alone with an extra report
	// Therefore, it cannot rely on any previously computed data
	pod_batch := make([]map[string]interface{}, 0, len(rpt.Pod))
	pod_edges_batch := map[string][]string{}
	pod_host_edges_batch := map[string][]string{}
	for _, n := range rpt.Pod {
		if n.KubernetesClusterId == "" {
			continue
		}
		if n.HostName == "" {
			if val, ok := resolvers.get_host(n.KubernetesIP); ok {
				n.HostName = val
			}
		}
		pod_batch = append(pod_batch, metadataToMap(n))
		pod_edges_batch[n.KubernetesClusterId] = append(pod_edges_batch[n.KubernetesClusterId], n.NodeID)
		pod_host_edges_batch[n.HostName] = append(pod_host_edges_batch[n.HostName], n.NodeID)
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
		Container_process_edges_batch: concatMaps(container_process_edges_batch),
		Pod_edges_batch:               concatMaps(pod_edges_batch),
		Pod_host_edges_batch:          concatMaps(pod_host_edges_batch),
		Container_image_edge_batch:    concatMaps(container_image_edges_batch),
		Kubernetes_cluster_edge_batch: concatMaps(kubernetes_edges_batch),

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
		MERGE (cp:CloudProvider{node_id:row.cloud_provider})
		MERGE (cr:CloudRegion{node_id:row.cloud_region})
		MERGE (cp) -[:HOSTS]-> (cr)
		MERGE (n:Node{node_id:row.node_id})
		MERGE (cr) -[:HOSTS]-> (n)
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true, cp.active = true, cp.pseudo = false, cr.active = true`,
		map[string]interface{}{"batch": batches.Host_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:Container{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = row.docker_container_state <> "deleted"`,
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
		MERGE (cp:CloudProvider{node_id:row.cloud_provider})
		MERGE (cp) -[:HOSTS]-> (n)
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true, n.node_type = 'cluster', cp.active = true, cp.pseudo = false`,
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
		MATCH (n:Container{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Process{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Container_process_edges_batch}); err != nil {
		return err
	}

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
		MATCH (m:Pod{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Pod_host_edges_batch}); err != nil {
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

func extractPidFromNodeID(hni string) int {
	middle := strings.IndexByte(hni, ';')
	if middle > 0 {
		num, err := strconv.Atoi(hni[middle+1:])
		if err != nil {
			return 0
		}
		return num
	}
	return 0
}

func metadataToMap(n report.Metadata) map[string]interface{} {
	// convert struct to map
	return utils.StructToMap(n)
}

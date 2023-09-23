package ingesters

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/db"
	redis2 "github.com/redis/go-redis/v9"
)

const (
	REDIS_NETWORK_MAP_KEY   = "network_map"
	REDIS_IPPORTPID_MAP_KEY = "ipportpid_map"
	uncompress_workers_num  = 10
	preparer_workers_num    = 10
	db_pusher_workers_num   = 10
	default_db_input_size   = 10
	db_batch_size           = 1_000
	resolver_batch_size     = 1_000
	default_ingester_size   = default_db_input_size * db_batch_size
	db_batch_timeout        = time.Second * 10
	resolver_timeout        = time.Second * 10
	max_network_maps_size   = 1024 * 1024 * 1024 // 1 GB per maps
	enqueer_timeout         = time.Second * 30
	agent_base_timeout      = time.Second * 30
	localhost_ip            = "127.0.0.1"
	default_push_back       = 1  // 30 seconds
	max_push_back           = 60 // 30 minutes
	map_ttl                 = 60 * time.Second
)

var (
	breaker       atomic.Bool
	Push_back     atomic.Int32
	ingester_size int
	db_input_size int
)

func init() {
	breaker.Store(false)
	Push_back.Store(default_push_back)
	push := os.Getenv("DF_INGEST_PUSH_BACK")
	if push != "" {
		push_int, err := strconv.Atoi(push)
		if err == nil {
			Push_back.Store(int32(push_int))
		}
	}

	ingester_size = default_ingester_size
	bsize := os.Getenv("DF_INGEST_REPORT_SIZE")
	if bsize != "" {
		ingester_size, _ = strconv.Atoi(bsize)
	}

	db_input_size = default_db_input_size
	dbsize := os.Getenv("DF_INGEST_DB_SIZE")
	if dbsize != "" {
		db_input_size, _ = strconv.Atoi(dbsize)
	}
}

type EndpointResolvers struct {
	network_map  map[string]string
	ipport_ippid map[string]string
}

func (er *EndpointResolvers) clean() {
	for k := range er.network_map {
		delete(er.network_map, k)
	}
	for k := range er.ipport_ippid {
		delete(er.ipport_ippid, k)
	}
}

type EndpointResolversCache struct {
	rdb       *redis2.Client
	net_cache sync.Map
	pid_cache sync.Map
}

func newEndpointResolversCache(ctx context.Context) (*EndpointResolversCache, error) {
	rdb, err := directory.RedisClient(ctx)
	return &EndpointResolversCache{
		rdb:       rdb,
		net_cache: sync.Map{},
		pid_cache: sync.Map{},
	}, err
}

type CacheEntry struct {
	value        string
	last_updated time.Time
}

func (erc *EndpointResolversCache) clean_maps() {
	if v, _ := erc.rdb.MemoryUsage(context.Background(), REDIS_NETWORK_MAP_KEY).Result(); v > max_network_maps_size {
		log.Debug().Msgf("Memory usage for %v reached limit", REDIS_NETWORK_MAP_KEY)
		erc.rdb.HDel(context.Background(), REDIS_NETWORK_MAP_KEY)
		erc.net_cache = sync.Map{}
	}
	if v, _ := erc.rdb.MemoryUsage(context.Background(), REDIS_IPPORTPID_MAP_KEY).Result(); v > max_network_maps_size {
		log.Debug().Msgf("Memory usage for %v reached limit", REDIS_IPPORTPID_MAP_KEY)
		erc.rdb.HDel(context.Background(), REDIS_IPPORTPID_MAP_KEY)
		erc.pid_cache = sync.Map{}
	}
}

func (erc *EndpointResolversCache) push_maps(er *EndpointResolvers) {
	erc.rdb.HSet(context.Background(), REDIS_NETWORK_MAP_KEY, er.network_map)
	erc.rdb.HSet(context.Background(), REDIS_IPPORTPID_MAP_KEY, er.ipport_ippid)
}

func (erc *EndpointResolversCache) get_host(ip string, ttl time.Time) (string, bool) {
	if v, ok := erc.net_cache.Load(ip); ok {
		value := v.(CacheEntry).value
		entry_ttl := v.(CacheEntry).last_updated
		if ttl.Before(entry_ttl) {
			return value, value != ""
		}
	}
	res, err := erc.rdb.HGet(context.Background(), REDIS_NETWORK_MAP_KEY, ip).Result()
	if err != nil {
		res = ""
	}
	erc.net_cache.Store(ip, CacheEntry{value: res, last_updated: ttl.Add(map_ttl)})
	return res, err == nil
}

func (erc *EndpointResolversCache) get_ip_pid(ip_port string, ttl time.Time) (string, bool) {
	if v, ok := erc.pid_cache.Load(ip_port); ok {
		value := v.(CacheEntry).value
		entry_ttl := v.(CacheEntry).last_updated
		if ttl.Before(entry_ttl) {
			return value, value != ""
		}
	}
	res, err := erc.rdb.HGet(context.Background(), REDIS_IPPORTPID_MAP_KEY, ip_port).Result()
	if err != nil {
		res = ""
	}
	erc.pid_cache.Store(ip_port, CacheEntry{value: res, last_updated: ttl.Add(map_ttl)})
	return res, err == nil
}

func (erc *EndpointResolversCache) Close() {
}

type neo4jIngester struct {
	ingester         chan report.CompressedReport
	resolvers        *EndpointResolversCache
	batcher          chan ReportIngestionData
	resolvers_update chan EndpointResolvers
	preparers_input  chan report.Report
	done             chan struct{}
	db_pusher        chan ReportIngestionData
	num_ingested     atomic.Int32
	num_received     atomic.Int32
	num_processed    atomic.Int32
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

	Hosts     []map[string]interface{} `json:"hosts" required:"true"`
	NumMerged int                      `json:"num_merged" required:"true"`
	Retries   int
}

func mergeResolvers(others []EndpointResolvers) EndpointResolvers {
	size_network_map := 0
	size_ipport_ippid := 0
	for i := range others {
		size_network_map += len(others[i].network_map)
		size_ipport_ippid += len(others[i].ipport_ippid)
	}

	res := EndpointResolvers{
		network_map:  make(map[string]string, size_network_map),
		ipport_ippid: make(map[string]string, size_ipport_ippid),
	}

	for i := range others {
		for k, v := range others[i].network_map {
			res.network_map[k] = v
		}
		for k, v := range others[i].ipport_ippid {
			res.ipport_ippid[k] = v
		}
	}
	return res
}

func mergeIngestionData(other []ReportIngestionData) ReportIngestionData {

	size_process_batch := 0
	size_host_batch := 0
	size_container_batch := 0
	size_container_image_batch := 0
	size_pod_batch := 0
	size_kubernetes_cluster_batch := 0
	size_process_edges_batch := 0
	size_container_process_edges_batch := 0
	size_container_edges_batch := 0
	size_pod_edges_batch := 0
	size_endpoint_edges_batch := 0
	size_container_image_edge_batch := 0
	size_kubernetes_cluster_edge_batch := 0
	size_hosts := 0

	for i := range other {
		size_process_batch += len(other[i].Process_batch)
		size_host_batch += len(other[i].Host_batch)
		size_container_batch += len(other[i].Container_batch)
		size_container_image_batch += len(other[i].Container_image_batch)
		size_pod_batch += len(other[i].Pod_batch)
		size_kubernetes_cluster_batch += len(other[i].Kubernetes_cluster_batch)
		size_process_edges_batch += len(other[i].Process_edges_batch)
		size_container_process_edges_batch += len(other[i].Container_process_edges_batch)
		size_container_edges_batch += len(other[i].Container_edges_batch)
		size_pod_edges_batch += len(other[i].Pod_edges_batch)
		size_endpoint_edges_batch += len(other[i].Endpoint_edges_batch)
		size_container_image_edge_batch += len(other[i].Container_image_edge_batch)
		size_kubernetes_cluster_edge_batch += len(other[i].Kubernetes_cluster_edge_batch)
		size_hosts += len(other[i].Host_batch)
	}

	process_batch := make([]map[string]interface{}, 0, size_process_batch)
	host_batch := make([]map[string]interface{}, 0, size_host_batch)
	container_batch := make([]map[string]interface{}, 0, size_container_batch)
	container_image_batch := make([]map[string]interface{}, 0, size_container_image_batch)
	pod_batch := make([]map[string]interface{}, 0, size_pod_batch)
	kubernetes_cluster_batch := make([]map[string]interface{}, 0, size_kubernetes_cluster_batch)
	process_edges_batch := make([]map[string]interface{}, 0, size_process_edges_batch)
	container_process_edges_batch := make([]map[string]interface{}, 0, size_container_process_edges_batch)
	container_edges_batch := make([]map[string]interface{}, 0, size_container_edges_batch)
	pod_edges_batch := make([]map[string]interface{}, 0, size_pod_edges_batch)
	endpoint_edges_batch := make([]map[string]interface{}, 0, size_endpoint_edges_batch)
	container_image_edge_batch := make([]map[string]interface{}, 0, size_container_image_edge_batch)
	kubernetes_cluster_edge_batch := make([]map[string]interface{}, 0, size_kubernetes_cluster_edge_batch)
	hosts := make([]map[string]interface{}, 0, size_hosts)

	for i := range other {
		process_batch = append(process_batch, other[i].Process_batch...)
		host_batch = append(host_batch, other[i].Host_batch...)
		container_batch = append(container_batch, other[i].Container_batch...)
		container_image_batch = append(container_image_batch, other[i].Container_image_batch...)
		pod_batch = append(pod_batch, other[i].Pod_batch...)
		kubernetes_cluster_batch = append(kubernetes_cluster_batch, other[i].Kubernetes_cluster_batch...)
		process_edges_batch = append(process_edges_batch, other[i].Process_edges_batch...)
		container_process_edges_batch = append(container_process_edges_batch, other[i].Container_process_edges_batch...)
		container_edges_batch = append(container_edges_batch, other[i].Container_edges_batch...)
		pod_edges_batch = append(pod_edges_batch, other[i].Pod_edges_batch...)
		endpoint_edges_batch = append(endpoint_edges_batch, other[i].Endpoint_edges_batch...)
		container_image_edge_batch = append(container_image_edge_batch, other[i].Container_image_edge_batch...)
		kubernetes_cluster_edge_batch = append(kubernetes_cluster_edge_batch, other[i].Kubernetes_cluster_edge_batch...)
		//nd.Endpoint_batch = append(nd.Endpoint_batch, other[i].Endpoint_batch...)
		//nd.Endpoint_edges = append(nd.Endpoint_edges, other[i].Endpoint_edges...)
		hosts = append(hosts, other[i].Hosts...)
	}

	return ReportIngestionData{
		Process_batch:                 process_batch,
		Host_batch:                    host_batch,
		Container_batch:               container_batch,
		Container_image_batch:         container_image_batch,
		Pod_batch:                     pod_batch,
		Kubernetes_cluster_batch:      kubernetes_cluster_batch,
		Process_edges_batch:           process_edges_batch,
		Container_process_edges_batch: container_process_edges_batch,
		Container_edges_batch:         container_edges_batch,
		Pod_edges_batch:               pod_edges_batch,
		Endpoint_edges_batch:          endpoint_edges_batch,
		Container_image_edge_batch:    container_image_edge_batch,
		Kubernetes_cluster_edge_batch: kubernetes_cluster_edge_batch,
		Hosts:                         hosts,
		NumMerged:                     len(other),
	}

}

func computeResolvers(rpt *report.Report, buf *bytes.Buffer) EndpointResolvers {
	resolvers := EndpointResolvers{
		network_map:  map[string]string{},
		ipport_ippid: map[string]string{},
	}

	for _, n := range rpt.Host {
		if n.Metadata.InterfaceIps == nil {
			continue
		}
		for _, k := range n.Metadata.InterfaceIps {
			resolvers.network_map[k] = n.Metadata.HostName
		}
	}

	for _, n := range rpt.Endpoint {
		if n.Metadata.HostName == "" {
			continue
		}
		node_ip, node_port := extractIPPortFromEndpointID(n.Metadata.NodeID)
		if node_ip == localhost_ip {
			continue
		}
		resolvers.network_map[node_ip] = n.Metadata.HostName
		buf.Reset()
		buf.WriteString(node_ip)
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(n.Metadata.Pid))
		resolvers.ipport_ippid[node_ip+node_port] = buf.String()
	}

	return resolvers
}

func (nc *neo4jIngester) resolversUpdater() {
	batch := [db_batch_size]EndpointResolvers{}
	elements := 0
	send := false
	ticker := time.NewTicker(resolver_timeout)
	defer ticker.Stop()
loop:
	for {
		select {
		case resolver, open := <-nc.resolvers_update:
			if !open {
				break loop
			}
			batch[elements] = resolver
			elements += 1
			send = elements == resolver_batch_size
		case <-ticker.C:
			send = elements > 0
		}

		if send {
			send = false
			span := telemetry.NewSpan(context.Background(), "ingester", "ResolversUpdater")
			final_batch := mergeResolvers(batch[:elements])
			nc.resolvers.clean_maps()
			nc.resolvers.push_maps(&final_batch)
			batch = [db_batch_size]EndpointResolvers{}
			span.End()
			elements = 0
		}
	}
	log.Info().Msgf("resolversUpdater ended")
}

func concatMaps(input map[string][]string) []map[string]interface{} {
	res := make([]map[string]interface{}, 0, len(input))
	for k, e := range input {
		res = append(res, map[string]interface{}{"source": k, "destinations": e})
	}
	return res
}

type Connection struct {
	source      string
	destination string
	left_pid    int
	right_pid   int
}

func connections2maps(connections []Connection, buf *bytes.Buffer) []map[string]interface{} {
	delim := ";;;"
	unique_maps := map[string]map[string][]int{}
	for _, connection := range connections {
		buf.Reset()
		buf.WriteString(connection.source)
		buf.WriteString(delim)
		buf.WriteString(connection.destination)
		connection_id := buf.String()
		v, has := unique_maps[connection_id]
		if !has {
			unique_maps[connection_id] = map[string][]int{
				"left_pids":  {connection.left_pid},
				"right_pids": {connection.right_pid},
			}
		} else {
			unique_maps[connection_id]["left_pids"] = append(v["left_pids"], connection.left_pid)
			unique_maps[connection_id]["right_pids"] = append(v["right_pids"], connection.right_pid)
		}
	}
	res := make([]map[string]interface{}, 0, len(unique_maps))
	for k, v := range unique_maps {
		source_dest := strings.Split(k, delim)
		internal := make(map[string]interface{}, 3)
		internal["source"] = source_dest[0]
		internal["destination"] = source_dest[1]
		left_pids := v["left_pids"]
		right_pids := v["right_pids"]
		pids := make([]map[string]int, 0, len(left_pids))
		for i := range left_pids {
			pids = append(pids, map[string]int{
				"left":  left_pids[i],
				"right": right_pids[i],
			})
		}
		internal["pids"] = pids
		res = append(res, internal)
	}
	return res
}

func NewReportIngestionData() ReportIngestionData {
	return ReportIngestionData{
		Process_batch:                 []map[string]interface{}{},
		Host_batch:                    []map[string]interface{}{},
		Container_batch:               []map[string]interface{}{},
		Pod_batch:                     []map[string]interface{}{},
		Container_image_batch:         []map[string]interface{}{},
		Kubernetes_cluster_batch:      []map[string]interface{}{},
		Process_edges_batch:           []map[string]interface{}{},
		Container_edges_batch:         []map[string]interface{}{},
		Container_process_edges_batch: []map[string]interface{}{},
		Pod_edges_batch:               []map[string]interface{}{},
		Pod_host_edges_batch:          []map[string]interface{}{},
		Endpoint_edges_batch:          []map[string]interface{}{},
		Container_image_edge_batch:    []map[string]interface{}{},
		Kubernetes_cluster_edge_batch: []map[string]interface{}{},
		Hosts:                         []map[string]interface{}{},
		NumMerged:                     1,
	}
}

func prepareNeo4jIngestion(rpt *report.Report, resolvers *EndpointResolversCache, buf *bytes.Buffer) ReportIngestionData {

	res := ReportIngestionData{
		Hosts:                         make([]map[string]interface{}, 0, len(rpt.Host)),
		Process_batch:                 make([]map[string]interface{}, 0, len(rpt.Process)),
		Host_batch:                    make([]map[string]interface{}, 0, len(rpt.Host)),
		Container_batch:               make([]map[string]interface{}, 0, len(rpt.Container)),
		Pod_batch:                     make([]map[string]interface{}, 0, len(rpt.Pod)),
		Container_image_batch:         make([]map[string]interface{}, 0, len(rpt.ContainerImage)),
		Kubernetes_cluster_batch:      make([]map[string]interface{}, 0, len(rpt.KubernetesCluster)),
		Process_edges_batch:           nil,
		Container_edges_batch:         nil,
		Container_process_edges_batch: nil,
		Pod_edges_batch:               nil,
		Pod_host_edges_batch:          nil,
		Endpoint_edges_batch:          nil,
		Container_image_edge_batch:    nil,
		Kubernetes_cluster_edge_batch: nil,
		NumMerged:                     1,
	}

	kubernetes_edges_batch := map[string][]string{}

	for _, n := range rpt.Host {
		res.Hosts = append(res.Hosts, map[string]interface{}{"node_id": n.Metadata.NodeID})
		metadataMap := metadataToMap(n.Metadata)
		if n.Metadata.KubernetesClusterId != "" {
			kubernetes_edges_batch[n.Metadata.KubernetesClusterId] = append(kubernetes_edges_batch[n.Metadata.KubernetesClusterId], n.Metadata.NodeID)
		}
		res.Host_batch = append(res.Host_batch, metadataMap)
	}

	for _, n := range rpt.KubernetesCluster {
		res.Kubernetes_cluster_batch = append(res.Kubernetes_cluster_batch, metadataToMap(n.Metadata))
	}

	processes_to_keep := map[string]struct{}{}
	for _, n := range rpt.Endpoint {
		if n.Metadata.HostName == "" {
			continue
		}
		buf.Reset()
		buf.WriteString(n.Metadata.HostName)
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(n.Metadata.Pid))
		host_pid := buf.String()
		processes_to_keep[host_pid] = struct{}{}
	}

	//endpoint_batch := []map[string]string{}
	//endpoint_edges := []map[string]string{}

	ttl := time.Now().Add(-map_ttl)
	connections := []Connection{}
	local_memoization := map[string]struct{}{}
	for _, n := range rpt.Endpoint {
		node_ip, _ := extractIPPortFromEndpointID(n.Metadata.NodeID)
		if node_ip == localhost_ip {
			continue
		}
		if n.Metadata.HostName == "" {
			if val, ok := resolvers.get_host(node_ip, ttl); ok {
				n.Metadata.HostName = val
			} else {
				continue
			}
		}
		if n.Metadata.Pid != -1 {
			if n.Adjacency == nil || len(*n.Adjacency) == 0 {
				// Handle inbound from internet
				connections = append(connections, Connection{
					source:      "in-the-internet",
					destination: n.Metadata.HostName,
					left_pid:    0,
					right_pid:   n.Metadata.Pid,
				})
			} else {
				for _, i := range *n.Adjacency {
					if n.Metadata.NodeID != i {
						ip, port := extractIPPortFromEndpointID(i)
						// local memoization is used to skip redis access (91% reduction)
						if _, has := local_memoization[ip]; has {
							continue
						}
						if host, ok := resolvers.get_host(ip, ttl); ok {
							if n.Metadata.HostName == host {
								local_memoization[ip] = struct{}{}
								continue
							}
							right_ippid, ok := resolvers.get_ip_pid(ip+port, ttl)
							if ok {
								rightpid := extractPidFromNodeID(right_ippid)
								connections = append(connections, Connection{
									source:      n.Metadata.HostName,
									destination: host,
									left_pid:    n.Metadata.Pid,
									right_pid:   rightpid,
								})
							}
						} else {
							connections = append(connections, Connection{
								source:      n.Metadata.HostName,
								destination: "out-the-internet",
								left_pid:    n.Metadata.Pid,
								right_pid:   0,
							})
						}
					}
				}
			}
		}
	}
	res.Endpoint_edges_batch = connections2maps(connections, buf)

	process_edges_batch := map[string][]string{}
	container_process_edges_batch := map[string][]string{}
	for _, n := range rpt.Process {
		if _, ok := processes_to_keep[n.Metadata.NodeID]; !ok {
			continue
		}
		res.Process_batch = append(res.Process_batch, metadataToMap(n.Metadata))
		process_edges_batch[n.Metadata.HostName] = append(process_edges_batch[n.Metadata.HostName], n.Metadata.NodeID)
		if len(n.Parents.Container) != 0 {
			container_process_edges_batch[n.Parents.Container] = append(container_process_edges_batch[n.Parents.Container], n.Metadata.NodeID)
		}
	}

	container_edges_batch := map[string][]string{}
	for _, n := range rpt.Container {
		if n.Metadata.HostName == "" {
			continue
		}
		res.Container_batch = append(res.Container_batch, metadataToMap(n.Metadata))
		container_edges_batch[n.Metadata.HostName] = append(container_edges_batch[n.Metadata.HostName], n.Metadata.NodeID)
	}

	container_image_edges_batch := map[string][]string{}
	for _, n := range rpt.ContainerImage {
		if n.Metadata.HostName == "" {
			continue
		}
		if n.Metadata.ImageName == "<none>" || n.Metadata.ImageTag == "<none>" {
			continue
		}
		res.Container_image_batch = append(res.Container_image_batch, metadataToMap(n.Metadata))
		container_image_edges_batch[n.Metadata.HostName] = append(container_image_edges_batch[n.Metadata.HostName], n.Metadata.NodeID)
	}

	// Note: Pods are provided alone with an extra report
	// Therefore, it cannot rely on any previously computed data
	pod_edges_batch := map[string][]string{}
	pod_host_edges_batch := map[string][]string{}
	for _, n := range rpt.Pod {
		if n.Metadata.KubernetesClusterId == "" {
			continue
		}
		if n.Metadata.HostName == "" {
			if val, ok := resolvers.get_host(n.Metadata.KubernetesIP, ttl); ok {
				n.Metadata.HostName = val
			}
		}
		res.Pod_batch = append(res.Pod_batch, metadataToMap(n.Metadata))
		pod_edges_batch[n.Metadata.KubernetesClusterId] = append(pod_edges_batch[n.Metadata.KubernetesClusterId], n.Metadata.NodeID)
		pod_host_edges_batch[n.Metadata.HostName] = append(pod_host_edges_batch[n.Metadata.HostName], n.Metadata.NodeID)
	}

	res.Process_edges_batch = concatMaps(process_edges_batch)
	res.Container_edges_batch = concatMaps(container_edges_batch)
	res.Container_process_edges_batch = concatMaps(container_process_edges_batch)
	res.Pod_edges_batch = concatMaps(pod_edges_batch)
	res.Pod_host_edges_batch = concatMaps(pod_host_edges_batch)
	res.Container_image_edge_batch = concatMaps(container_image_edges_batch)
	res.Kubernetes_cluster_edge_batch = concatMaps(kubernetes_edges_batch)

	return res
}

func (nc *neo4jIngester) Close() {
	nc.resolvers.Close()
	close(nc.ingester)
	close(nc.batcher)
	close(nc.resolvers_update)
	close(nc.preparers_input)
	close(nc.done)
}

func (nc *neo4jIngester) Ingest(ctx context.Context, crpt report.CompressedReport) error {
	select {
	case nc.ingester <- crpt:
		nc.num_processed.Add(1)
	default:
		breaker.Store(true)
		crpt.Cleanup()
		return fmt.Errorf("enqueuer channel full")
	}
	return nil
}

func (nc *neo4jIngester) IsReady() bool {
	nc.num_received.Add(1)
	return !breaker.Load()
}

func (nc *neo4jIngester) PushToDBSeq(batches ReportIngestionData, session neo4j.Session) error {

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:ContainerImage{node_id:row.node_id})
		MERGE (s:ImageStub{node_id: row.docker_image_name, docker_image_name: row.docker_image_name})
		MERGE (n) -[:IS]-> (s)
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true, s.updated_at = TIMESTAMP(), n.docker_image_id=row.node_id,
		s.tags = REDUCE(distinctElements = [], element IN COALESCE(s.tags, []) + row.docker_image_tag | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END)`,
		map[string]interface{}{"batch": batches.Container_image_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MERGE (m:ContainerImage{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Container_image_edge_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		MATCH (m:Node{node_id: row.destination})
		MATCH (n)-[r:CONNECTS]->(m)
		DELETE r`,
		map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		MATCH (m:Node{node_id: row.destination})
		MERGE (n)-[r:CONNECTS]->(m)
		WITH n, r, m, row.pids as rpids
		UNWIND rpids as pids
		SET r.left_pids = coalesce(r.left_pids, []) + pids.left,
		    r.right_pids = coalesce(r.right_pids, []) + pids.right`, map[string]interface{}{"batch": batches.Endpoint_edges_batch}); err != nil {
		return err
	}

	return tx.Commit()
}

func (nc *neo4jIngester) PushToDB(batches ReportIngestionData, session neo4j.Session) error {

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
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
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = row.docker_container_state <> "deleted"`,
		map[string]interface{}{"batch": batches.Container_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:Process{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"batch": batches.Process_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Container{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Process{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Container_process_edges_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Container{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Container_edges_batch}); err != nil {
		return err
	}

	//if _, err = tx.Run("UNWIND $batch as row MERGE (n:TEndpoint{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Endpoint_batch}); err != nil {
	//return err
	//}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Process{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Process_edges_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.node_id})
		OPTIONAL MATCH (n:Node{node_id: 'in-the-internet'}) -[ri:CONNECTS]-> (n)
		OPTIONAL MATCH (n) -[r:CONNECTS]-> (:Node)
		DELETE r, ri`,
		map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:KubernetesCluster{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true, n.node_type = 'cluster'`,
		map[string]interface{}{"batch": batches.Kubernetes_cluster_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MERGE (n:Pod{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP(), n.active = true`,
		map[string]interface{}{"batch": batches.Pod_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:KubernetesCluster{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Pod{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Pod_edges_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MERGE (m:Pod{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.Pod_host_edges_batch}); err != nil {
		return err
	}

	if _, err := tx.Run(`
		UNWIND $batch as row
		MATCH (n:KubernetesCluster{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Node{node_id: dest})
		MERGE (n)-[:INSTANCIATE]->(m)`,
		map[string]interface{}{"batch": batches.Kubernetes_cluster_edge_batch}); err != nil {
		return err
	}

	return tx.Commit()
}

func (nc *neo4jIngester) runIngester() {
	for crpt := range nc.ingester {
		rpt := report.MakeReport()
		if err := crpt.FillReport(&rpt); err != nil {
			log.Error().Msgf("Failed to unmarshal report")
			crpt.Cleanup()
			continue
		}
		crpt.Cleanup()
		nc.preparers_input <- rpt
	}
	log.Info().Msgf("runIngester ended")
}

func (nc *neo4jIngester) runDBBatcher(db_pusher chan ReportIngestionData) {
	batch := [db_batch_size]ReportIngestionData{}
	size := 0
	send := false
	ticker := time.NewTicker(db_batch_timeout)
	defer ticker.Stop()
loop:
	for {
		select {
		case report, open := <-nc.batcher:
			if !open {
				break loop
			}
			batch[size] = report
			size += 1
			send = size == db_batch_size
		case <-ticker.C:
			send = size > 0
		}
		if send {
			if size > 0 {
				send = false
				final_batch := mergeIngestionData(batch[:size])
				db_pusher <- final_batch
				size = 0
				batch = [db_batch_size]ReportIngestionData{}
				ticker.Reset(db_batch_timeout)
			}
		}
	}
	log.Info().Msgf("runDBBatcher ended")
}

func isTransientError(err error) bool {
	// Check if the error is a deadlock error
	if neoErr, ok := err.(*db.Neo4jError); ok {
		return strings.HasPrefix(neoErr.Code, "Neo.TransientError")
	}
	return false
}

func isClosedError(err error) bool {
	return strings.Contains(err.Error(), "Pool closed")
}

func (nc *neo4jIngester) runDBPusher(
	ctx context.Context,
	db_pusher, db_pusher_seq, db_pusher_retry chan ReportIngestionData,
	pusher func(ReportIngestionData, neo4j.Session) error) {

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf("Failed to get client: %v", err)
		return
	}
	session, err := driver.Session(neo4j.AccessModeWrite)
	if err != nil {
		log.Error().Msgf("Failed to open session: %v", err)
		return
	}

	for batches := range db_pusher {
		span := telemetry.NewSpan(context.Background(), "ingester", "PushAgentReportsToDB")
		for {
			err := pusher(batches, session)
			if err != nil {
				batches.Retries += 1
				if isClosedError(err) {
					log.Warn().Msg("Renew session")
					new_driver, err := directory.Neo4jClient(ctx)
					if err == nil {
						new_session, err := new_driver.Session(neo4j.AccessModeWrite)
						if err == nil {
							driver = new_driver
							session.Close()
							session = new_session
						}
					}
				}
				if batches.Retries == 2 || !isTransientError(err) {
					log.Error().Msgf("Neo4j err: %v", err)
					span.EndWithErr(err)
					break
				}
				select {
				case db_pusher_retry <- batches:
				default:
					log.Error().Msgf("Skip because: %v", err)
					span.EndWithErr(err)
					break
				}
				continue
			}
			span.End()
			if db_pusher_seq == nil {
				nc.num_ingested.Add(int32(batches.NumMerged))
			} else {
				db_pusher_seq <- batches
			}
			break
		}
	}
	session.Close()
	log.Info().Msgf("runDBPusher ended")
}

func (nc *neo4jIngester) runPreparer() {
	var buf bytes.Buffer
	for rpt := range nc.preparers_input {
		r := computeResolvers(&rpt, &buf)
		data := prepareNeo4jIngestion(&rpt, nc.resolvers, &buf)
		select {
		case nc.batcher <- data:
			nc.resolvers_update <- r
		case nc.resolvers_update <- r:
			nc.batcher <- data
		}
	}
}

func NewNeo4jCollector(ctx context.Context) (Ingester[report.CompressedReport], error) {
	rdb, err := newEndpointResolversCache(ctx)

	if err != nil {
		return nil, err
	}

	ns, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}
	collector_ctx := directory.NewContextWithNameSpace(ns)

	done := make(chan struct{})
	db_pusher := make(chan ReportIngestionData, db_input_size)
	db_pusher_seq := make(chan ReportIngestionData, db_input_size)
	db_pusher_retry := make(chan ReportIngestionData, db_input_size/2)
	db_pusher_seq_retry := make(chan ReportIngestionData, db_input_size/2)
	nc := &neo4jIngester{
		resolvers:        rdb,
		ingester:         make(chan report.CompressedReport, ingester_size),
		batcher:          make(chan ReportIngestionData, db_batch_size),
		resolvers_update: make(chan EndpointResolvers, db_batch_size),
		preparers_input:  make(chan report.Report, db_batch_size),
		done:             done,
		db_pusher:        db_pusher,
		num_ingested:     atomic.Int32{},
		num_received:     atomic.Int32{},
		num_processed:    atomic.Int32{},
	}

	for i := 0; i < uncompress_workers_num; i++ {
		go nc.runIngester()
	}

	for i := 0; i < db_pusher_workers_num; i++ {
		go nc.runDBPusher(collector_ctx, db_pusher, db_pusher_seq, db_pusher_retry, nc.PushToDB)
	}

	go nc.runDBPusher(collector_ctx, db_pusher_seq, nil, db_pusher_seq_retry, nc.PushToDBSeq)

	go nc.resolversUpdater()

	go nc.runDBBatcher(db_pusher)

	go func() {
		for e := range db_pusher_retry {
			db_pusher <- e
		}
		log.Info().Msgf("nonseq retry ended")
	}()

	go func() {
		for e := range db_pusher_seq_retry {
			db_pusher_seq <- e
		}
		log.Info().Msgf("seq retry ended")
	}()

	for i := 0; i < preparer_workers_num; i++ {
		go nc.runPreparer()
	}

	go func() {
		// Received num at the time of push back change
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
	loop:
		for {
			select {
			case <-ticker.C:
			case <-done:
				break loop
			}

			log.Info().Msgf("Q: %v, %v, %v, %v, %v, %v",
				len(nc.ingester),
				len(nc.preparers_input),
				len(nc.resolvers_update),
				len(nc.batcher),
				len(nc.db_pusher),
				len(db_pusher_seq))

			if len(nc.ingester) == 0 {
				breaker.Store(false)
			}
		}
	}()

	// Push back updater
	go func() {
		prev_received_num := int32(0)
		prev_push_back := FetchPushBack(collector_ctx)
		ticker := time.NewTicker(agent_base_timeout * time.Duration(Push_back.Load()))
		defer ticker.Stop()
	loop:
		for {
			select {
			case <-ticker.C:
			case <-done:
				break loop
			}

			current_num_received := nc.num_received.Swap(0)
			current_num_accepted := nc.num_processed.Swap(0)
			current_num_ingested := nc.num_ingested.Swap(0)

			new_value := Push_back.Load()
			if current_num_ingested < (current_num_received/8)*7 {
				if current_num_received >= 100 {
					ratio := max(current_num_accepted, 1) / max(current_num_ingested, 1)
					// Limit ratio to x2
					if ratio >= 2 {
						new_value = Push_back.Load() * 2
					} else {
						new_value = Push_back.Load() + 1
					}
				}
			} else if current_num_received < (prev_received_num/8)*7 {
				ratio := max(prev_received_num, 1) / max(current_num_received, 1)
				// Limit ratio to /2
				if ratio >= 2 {
					new_value = Push_back.Load() / ratio
				} else {
					new_value = Push_back.Load() - 1
				}
				prev_received_num = current_num_received
			}

			if new_value <= 0 {
				Push_back.Store(1)
			} else if new_value > max_push_back {
				Push_back.Store(max_push_back)
			} else {
				Push_back.Store(new_value)
			}

			// Keep the highest number of reports
			prev_received_num = max(prev_received_num, current_num_received)

			err := UpdatePushBack(collector_ctx, &Push_back, prev_push_back)
			if err != nil {
				log.Error().Msgf("push back err: %v", err)
			}
			prev_push_back = Push_back.Load()

			ticker.Reset(agent_base_timeout * time.Duration(Push_back.Load()))

			log.Info().Msgf("Received: %v, processed: %v, pushed: %v, Push back: %v", current_num_received, current_num_accepted, current_num_ingested, Push_back.Load())
		}
	}()

	return nc, nil
}

func FetchPushBack(ctx context.Context) int32 {

	prev_push_back := int32(default_push_back)

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf("Cannot get push back value: %v", err)
		return prev_push_back
	}
	// Received num at the time of push back change
	newValue, err := GetPushBack(driver)
	if err != nil {
		log.Error().Msgf("Fail to get push back value: %v", err)
	} else {
		Push_back.Store(newValue)
	}
	prev_push_back = Push_back.Load()

	return prev_push_back
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int32) int32 {
	if a < b {
		return b
	}
	return a
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

// TODO: improve syncro across multiple servers
func UpdatePushBack(ctx context.Context, newValue *atomic.Int32, prev int32) error {

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf("Fail to get neo4j client for push back: %v", err)
		return err
	}

	session, err := driver.Session(neo4j.AccessModeWrite)
	if err != nil {
		log.Error().Msgf("Fail to get session for push back: %v", err)
		return err
	}
	defer session.Close()
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(5 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	var rec *db.Record
	if newValue.Load() != prev {
		res, err := tx.Run(`
			MATCH (n:Node{node_id:"deepfence-console-cron"})
			CALL apoc.atomic.update(n, 'push_back','`+strconv.Itoa(int(newValue.Load()))+`')
			YIELD oldValue, newValue
			return newValue`, map[string]interface{}{})
		if err != nil {
			return err
		}
		rec, err = res.Single()
		if err != nil {
			return err
		}
	} else {
		res, err := tx.Run(`
			MATCH (n:Node{node_id:"deepfence-console-cron"})
			RETURN n.push_back`, map[string]interface{}{})
		if err != nil {
			return err
		}
		rec, err = res.Single()
		if err != nil {
			return err
		}
		newValue.Store(int32(rec.Values[0].(int64)))
	}

	return tx.Commit()
}

func GetPushBack(driver neo4j.Driver) (int32, error) {
	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return 0, err
	}
	defer session.Close()
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(5 * time.Second))
	if err != nil {
		return 0, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (n:Node{node_id:"deepfence-console-cron"})
		RETURN n.push_back
		`,
		map[string]interface{}{})
	if err != nil {
		return 0, err
	}
	rec, err := res.Single()
	if err != nil {
		return 0, err
	}
	return int32(rec.Values[0].(int64)), nil
}

package ingesters

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/db"
	redis2 "github.com/redis/go-redis/v9"
)

const (
	RedisNetworkMapKey   = "network_map"
	RedisIPPortPIDMapKey = "ipportpid_map"
	uncompressWorkersNum = 10
	preparerWorkersNum   = 10
	dbPusherWorkersNum   = 10
	defaultDBInputSize   = 10
	dbBatchSize          = 1_000
	resolverBatchSize    = 1_000
	defaultIngesterSize  = defaultDBInputSize * dbBatchSize
	dbBatchTimeout       = time.Second * 10
	resolverTimeout      = time.Second * 10
	maxNetworkMapsSize   = 1 * 1024 * 1024 * 1024 // 1 GB per maps
	enqueerTimeout       = time.Second * 30
	agentBaseTimeout     = time.Second * 30
	localhostIP          = "127.0.0.1"

	// TODO(tjonak): express using time.Second?
	defaultPushBack = 1  // 30 seconds
	maxPushBack     = 60 // 30 minutes

	mapTTL = 60 * time.Second
)

var (
	breaker      atomic.Bool
	PushBack     atomic.Int32
	ingesterSize int
	dbInputSize  int
)

func init() {
	breaker.Store(false)
	PushBack.Store(defaultPushBack)
	push := os.Getenv("DF_INGEST_PUSH_BACK")
	if push != "" {
		pushInt, err := strconv.Atoi(push)
		if err == nil {
			PushBack.Store(int32(pushInt))
		}
	}

	ingesterSize = defaultIngesterSize
	bsize := os.Getenv("DF_INGEST_REPORT_SIZE")
	if bsize != "" {
		ingesterSize, _ = strconv.Atoi(bsize)
	}

	dbInputSize = defaultDBInputSize
	dbsize := os.Getenv("DF_INGEST_DB_SIZE")
	if dbsize != "" {
		dbInputSize, _ = strconv.Atoi(dbsize)
	}
}

type EndpointResolvers struct {
	networkMap    map[string]string
	ipPortToIPPID map[string]string
}

type EndpointResolversCache struct {
	rdb      *redis2.Client
	netCache sync.Map
	pidCache sync.Map
}

func newEndpointResolversCache(ctx context.Context) (*EndpointResolversCache, error) {
	rdb, err := directory.RedisClient(ctx)
	return &EndpointResolversCache{
		rdb:      rdb,
		netCache: sync.Map{},
		pidCache: sync.Map{},
	}, err
}

type CacheEntry struct {
	value       string
	lastUpdated time.Time
}

func (erc *EndpointResolversCache) cleanMaps() {
	v, err := erc.rdb.MemoryUsage(context.Background(), RedisNetworkMapKey).Result()
	if err != nil {
		log.Error().Msg(err.Error())
	} else if v >= maxNetworkMapsSize {
		log.Warn().Msgf("Memory usage for %v reached limit", RedisNetworkMapKey)
		err = erc.rdb.Del(context.Background(), RedisNetworkMapKey).Err()
		if err != nil {
			log.Error().Msg(err.Error())
		}
		erc.netCache = sync.Map{}
	}

	v, err = erc.rdb.MemoryUsage(context.Background(), RedisIPPortPIDMapKey).Result()
	if err != nil {
		log.Error().Msg(err.Error())
	} else if v >= maxNetworkMapsSize {
		log.Warn().Msgf("Memory usage for %v reached limit", RedisIPPortPIDMapKey)
		err = erc.rdb.Del(context.Background(), RedisIPPortPIDMapKey).Err()
		if err != nil {
			log.Error().Msg(err.Error())
		}
		erc.pidCache = sync.Map{}
	}
}

func (erc *EndpointResolversCache) pushMaps(er *EndpointResolvers) {
	if len(er.networkMap) > 0 {
		if err := erc.rdb.HSet(context.Background(), RedisNetworkMapKey, er.networkMap).Err(); err != nil {
			log.Error().Msg(err.Error())
		}
	}
	if len(er.ipPortToIPPID) > 0 {
		if err := erc.rdb.HSet(context.Background(), RedisIPPortPIDMapKey, er.ipPortToIPPID).Err(); err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (erc *EndpointResolversCache) getHost(ip string, ttl time.Time) (string, bool) {
	if v, ok := erc.netCache.Load(ip); ok {
		value := v.(CacheEntry).value
		entryTTL := v.(CacheEntry).lastUpdated
		if ttl.Before(entryTTL) {
			return value, value != ""
		}
	}
	res, err := erc.rdb.HGet(context.Background(), RedisNetworkMapKey, ip).Result()
	if err != nil {
		res = ""
	}
	erc.netCache.Store(ip, CacheEntry{value: res, lastUpdated: ttl.Add(mapTTL)})
	return res, err == nil
}

func (erc *EndpointResolversCache) getIPPID(ipPort string, ttl time.Time) (string, bool) {
	if v, ok := erc.pidCache.Load(ipPort); ok {
		value := v.(CacheEntry).value
		entryTTL := v.(CacheEntry).lastUpdated
		if ttl.Before(entryTTL) {
			return value, value != ""
		}
	}
	res, err := erc.rdb.HGet(context.Background(), RedisIPPortPIDMapKey, ipPort).Result()
	if err != nil {
		res = ""
	}
	erc.pidCache.Store(ipPort, CacheEntry{value: res, lastUpdated: ttl.Add(mapTTL)})
	return res, err == nil
}

func (erc *EndpointResolversCache) Close() {
}

type neo4jIngester struct {
	ingester        chan report.CompressedReport
	resolvers       *EndpointResolversCache
	batcher         chan ReportIngestionData
	resolversUpdate chan EndpointResolvers
	preparersInput  chan report.Report
	done            chan struct{}
	dbPusher        chan ReportIngestionData
	numIngested     atomic.Int32
	numReceived     atomic.Int32
	numProcessed    atomic.Int32
}

type ReportIngestionData struct {
	ProcessBatch           []map[string]interface{} `json:"process_batch" required:"true"`
	HostBatch              []map[string]interface{} `json:"host_batch" required:"true"`
	ContainerBatch         []map[string]interface{} `json:"container_batch" required:"true"`
	PodBatch               []map[string]interface{} `json:"pod_batch" required:"true"`
	ContainerImageBatch    []map[string]interface{} `json:"container_image_batch" required:"true"`
	KubernetesClusterBatch []map[string]interface{} `json:"kubernetes_cluster_batch" required:"true"`

	ProcessEdgesBatch          []map[string]interface{} `json:"process_edges_batch" required:"true"`
	ContainerEdgesBatch        []map[string]interface{} `json:"container_edges_batch" required:"true"`
	ContainerProcessEdgesBatch []map[string]interface{} `json:"container_process_edge_batch" required:"true"`
	PodEdgesBatch              []map[string]interface{} `json:"pod_edges_batch" required:"true"`
	PodHostEdgesBatch          []map[string]interface{} `json:"pod_host_edges_batch" required:"true"`
	EndpointEdgesBatch         []map[string]interface{} `json:"endpoint_edges_batch" required:"true"`
	ContainerImageEdgeBatch    []map[string]interface{} `json:"container_image_edge_batch" required:"true"`
	KubernetesClusterEdgeBatch []map[string]interface{} `json:"kubernetes_cluster_edge_batch" required:"true"`

	// Endpoint_batch []map[string]string
	// Endpoint_edges []map[string]string

	Hosts     []map[string]interface{} `json:"hosts" required:"true"`
	NumMerged int                      `json:"num_merged" required:"true"`
	Retries   int
}

func mergeResolvers(others []EndpointResolvers) EndpointResolvers {
	sizeNetworkMap := 0
	sizeIPPortToIPPID := 0
	for i := range others {
		sizeNetworkMap += len(others[i].networkMap)
		sizeIPPortToIPPID += len(others[i].ipPortToIPPID)
	}

	res := EndpointResolvers{
		networkMap:    make(map[string]string, sizeNetworkMap),
		ipPortToIPPID: make(map[string]string, sizeIPPortToIPPID),
	}

	for i := range others {
		for k, v := range others[i].networkMap {
			res.networkMap[k] = v
		}
		for k, v := range others[i].ipPortToIPPID {
			res.ipPortToIPPID[k] = v
		}
	}
	return res
}

func mergeIngestionData(other []ReportIngestionData) ReportIngestionData {

	sizeProcessBatch := 0
	sizeHostBatch := 0
	sizeContainerBatch := 0
	sizeContainerImageBatch := 0
	sizePodBatch := 0
	sizeKubernetesClusterBatch := 0
	sizeProcessEdgesBatch := 0
	sizeContainerProcessEdgesBatch := 0
	sizeContainerEdgesBatch := 0
	sizePodEdgesBatch := 0
	sizeEndpointEdgesBatch := 0
	sizeContainerImageEdgeBatch := 0
	sizeKubernetesClusterEdgeBatch := 0
	sizeHosts := 0

	for i := range other {
		sizeProcessBatch += len(other[i].ProcessBatch)
		sizeHostBatch += len(other[i].HostBatch)
		sizeContainerBatch += len(other[i].ContainerBatch)
		sizeContainerImageBatch += len(other[i].ContainerImageBatch)
		sizePodBatch += len(other[i].PodBatch)
		sizeKubernetesClusterBatch += len(other[i].KubernetesClusterBatch)
		sizeProcessEdgesBatch += len(other[i].ProcessEdgesBatch)
		sizeContainerProcessEdgesBatch += len(other[i].ContainerProcessEdgesBatch)
		sizeContainerEdgesBatch += len(other[i].ContainerEdgesBatch)
		sizePodEdgesBatch += len(other[i].PodEdgesBatch)
		sizeEndpointEdgesBatch += len(other[i].EndpointEdgesBatch)
		sizeContainerImageEdgeBatch += len(other[i].ContainerImageEdgeBatch)
		sizeKubernetesClusterEdgeBatch += len(other[i].KubernetesClusterEdgeBatch)
		sizeHosts += len(other[i].HostBatch)
	}

	processBatch := make([]map[string]interface{}, 0, sizeProcessBatch)
	hostBatch := make([]map[string]interface{}, 0, sizeHostBatch)
	containerBatch := make([]map[string]interface{}, 0, sizeContainerBatch)
	containerImageBatch := make([]map[string]interface{}, 0, sizeContainerImageBatch)
	podBatch := make([]map[string]interface{}, 0, sizePodBatch)
	kubernetesClusterBatch := make([]map[string]interface{}, 0, sizeKubernetesClusterBatch)
	processEdgesBatch := make([]map[string]interface{}, 0, sizeProcessEdgesBatch)
	containerProcessEdgesBatch := make([]map[string]interface{}, 0, sizeContainerProcessEdgesBatch)
	containerEdgesBatch := make([]map[string]interface{}, 0, sizeContainerEdgesBatch)
	podEdgesBatch := make([]map[string]interface{}, 0, sizePodEdgesBatch)
	endpointEdgesBatch := make([]map[string]interface{}, 0, sizeEndpointEdgesBatch)
	containerImageEdgeBatch := make([]map[string]interface{}, 0, sizeContainerImageEdgeBatch)
	kubernetesClusterEdgeBatch := make([]map[string]interface{}, 0, sizeKubernetesClusterEdgeBatch)
	hosts := make([]map[string]interface{}, 0, sizeHosts)

	for i := range other {
		processBatch = append(processBatch, other[i].ProcessBatch...)
		hostBatch = append(hostBatch, other[i].HostBatch...)
		containerBatch = append(containerBatch, other[i].ContainerBatch...)
		containerImageBatch = append(containerImageBatch, other[i].ContainerImageBatch...)
		podBatch = append(podBatch, other[i].PodBatch...)
		kubernetesClusterBatch = append(kubernetesClusterBatch, other[i].KubernetesClusterBatch...)
		processEdgesBatch = append(processEdgesBatch, other[i].ProcessEdgesBatch...)
		containerProcessEdgesBatch = append(containerProcessEdgesBatch, other[i].ContainerProcessEdgesBatch...)
		containerEdgesBatch = append(containerEdgesBatch, other[i].ContainerEdgesBatch...)
		podEdgesBatch = append(podEdgesBatch, other[i].PodEdgesBatch...)
		endpointEdgesBatch = append(endpointEdgesBatch, other[i].EndpointEdgesBatch...)
		containerImageEdgeBatch = append(containerImageEdgeBatch, other[i].ContainerImageEdgeBatch...)
		kubernetesClusterEdgeBatch = append(kubernetesClusterEdgeBatch, other[i].KubernetesClusterEdgeBatch...)
		// nd.Endpoint_batch = append(nd.Endpoint_batch, other[i].Endpoint_batch...)
		// nd.Endpoint_edges = append(nd.Endpoint_edges, other[i].Endpoint_edges...)
		hosts = append(hosts, other[i].Hosts...)
	}

	return ReportIngestionData{
		ProcessBatch:               processBatch,
		HostBatch:                  hostBatch,
		ContainerBatch:             containerBatch,
		ContainerImageBatch:        containerImageBatch,
		PodBatch:                   podBatch,
		KubernetesClusterBatch:     kubernetesClusterBatch,
		ProcessEdgesBatch:          processEdgesBatch,
		ContainerProcessEdgesBatch: containerProcessEdgesBatch,
		ContainerEdgesBatch:        containerEdgesBatch,
		PodEdgesBatch:              podEdgesBatch,
		EndpointEdgesBatch:         endpointEdgesBatch,
		ContainerImageEdgeBatch:    containerImageEdgeBatch,
		KubernetesClusterEdgeBatch: kubernetesClusterEdgeBatch,
		Hosts:                      hosts,
		NumMerged:                  len(other),
	}

}

func computeResolvers(rpt *report.Report, buf *bytes.Buffer) EndpointResolvers {
	resolvers := EndpointResolvers{
		networkMap:    map[string]string{},
		ipPortToIPPID: map[string]string{},
	}

	for _, n := range rpt.Host {
		if n.Metadata.InterfaceIPs == nil {
			continue
		}
		for _, k := range n.Metadata.InterfaceIPs {
			resolvers.networkMap[k] = n.Metadata.HostName
		}
	}

	for _, n := range rpt.Endpoint {
		if n.Metadata.HostName == "" {
			continue
		}
		nodeIP, nodePort := extractIPPortFromEndpointID(n.Metadata.NodeID)
		if nodeIP == localhostIP {
			continue
		}
		resolvers.networkMap[nodeIP] = n.Metadata.HostName
		buf.Reset()
		buf.WriteString(nodeIP)
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(n.Metadata.Pid))
		resolvers.ipPortToIPPID[nodeIP+nodePort] = buf.String()
	}

	return resolvers
}

func (nc *neo4jIngester) resolversUpdater() {
	batch := [dbBatchSize]EndpointResolvers{}
	elements := 0
	send := false
	ticker := time.NewTicker(resolverTimeout)
	defer ticker.Stop()
loop:
	for {
		select {
		case resolver, open := <-nc.resolversUpdate:
			if !open {
				break loop
			}
			batch[elements] = resolver
			elements += 1
			send = elements == resolverBatchSize
		case <-ticker.C:
			send = elements > 0
		}

		if send {
			send = false
			_, span := telemetry.NewSpan(context.Background(), "ingester", "ResolversUpdater")
			finalBatch := mergeResolvers(batch[:elements])
			nc.resolvers.cleanMaps()
			nc.resolvers.pushMaps(&finalBatch)
			batch = [dbBatchSize]EndpointResolvers{}
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
	leftPID     int
	rightPID    int
	localPort   int
	leftIP      *string
	rightIP     *string
}

func connections2maps(connections []Connection, buf *bytes.Buffer) []map[string]interface{} {
	delim := ";;;"
	uniqueMaps := map[string]map[string][]interface{}{}
	for _, connection := range connections {
		buf.Reset()
		buf.WriteString(connection.source)
		buf.WriteString(delim)
		buf.WriteString(connection.destination)
		connectionID := buf.String()
		_, has := uniqueMaps[connectionID]
		if !has {
			uniqueMaps[connectionID] = map[string][]interface{}{
				"left_pids":   {connection.leftPID},
				"right_pids":  {connection.rightPID},
				"local_ports": {connection.localPort},
				"left_ips":    {connection.leftIP},
				"right_ips":   {connection.rightIP},
			}
		} else {
			uniqueMaps[connectionID]["left_pids"] = append(uniqueMaps[connectionID]["left_pids"], connection.leftPID)
			uniqueMaps[connectionID]["right_pids"] = append(uniqueMaps[connectionID]["right_pids"], connection.rightPID)
			uniqueMaps[connectionID]["local_ports"] = append(uniqueMaps[connectionID]["local_ports"], connection.localPort)
			uniqueMaps[connectionID]["left_ips"] = append(uniqueMaps[connectionID]["left_ips"], connection.leftIP)
			uniqueMaps[connectionID]["right_ips"] = append(uniqueMaps[connectionID]["right_ips"], connection.rightIP)
		}
	}
	res := make([]map[string]interface{}, 0, len(uniqueMaps))
	for k, v := range uniqueMaps {
		sourceDest := strings.Split(k, delim)
		internal := make(map[string]interface{}, 3)
		internal["source"] = sourceDest[0]
		internal["destination"] = sourceDest[1]
		leftPIDs := v["left_pids"]
		rightPIDs := v["right_pids"]
		localPorts := v["local_ports"]
		leftIPs := v["left_ips"]
		rightIPs := v["right_ips"]
		pids := make([]map[string]interface{}, 0, len(leftPIDs))
		for i := range leftPIDs {
			pids = append(pids, map[string]interface{}{
				"left":       leftPIDs[i],
				"right":      rightPIDs[i],
				"local_port": localPorts[i],
				"left_ip":    leftIPs[i],
				"right_ip":   rightIPs[i],
			})
		}
		internal["pids"] = pids
		res = append(res, internal)
	}
	return res
}

func NewReportIngestionData() ReportIngestionData {
	return ReportIngestionData{
		ProcessBatch:               []map[string]interface{}{},
		HostBatch:                  []map[string]interface{}{},
		ContainerBatch:             []map[string]interface{}{},
		PodBatch:                   []map[string]interface{}{},
		ContainerImageBatch:        []map[string]interface{}{},
		KubernetesClusterBatch:     []map[string]interface{}{},
		ProcessEdgesBatch:          []map[string]interface{}{},
		ContainerEdgesBatch:        []map[string]interface{}{},
		ContainerProcessEdgesBatch: []map[string]interface{}{},
		PodEdgesBatch:              []map[string]interface{}{},
		PodHostEdgesBatch:          []map[string]interface{}{},
		EndpointEdgesBatch:         []map[string]interface{}{},
		ContainerImageEdgeBatch:    []map[string]interface{}{},
		KubernetesClusterEdgeBatch: []map[string]interface{}{},
		Hosts:                      []map[string]interface{}{},
		NumMerged:                  1,
	}
}

func prepareNeo4jIngestion(rpt *report.Report, resolvers *EndpointResolversCache, buf *bytes.Buffer, token string) ReportIngestionData {

	res := ReportIngestionData{
		Hosts:                      make([]map[string]interface{}, 0, len(rpt.Host)),
		ProcessBatch:               make([]map[string]interface{}, 0, len(rpt.Process)),
		HostBatch:                  make([]map[string]interface{}, 0, len(rpt.Host)),
		ContainerBatch:             make([]map[string]interface{}, 0, len(rpt.Container)),
		PodBatch:                   make([]map[string]interface{}, 0, len(rpt.Pod)),
		ContainerImageBatch:        make([]map[string]interface{}, 0, len(rpt.ContainerImage)),
		KubernetesClusterBatch:     make([]map[string]interface{}, 0, len(rpt.KubernetesCluster)),
		ProcessEdgesBatch:          nil,
		ContainerEdgesBatch:        nil,
		ContainerProcessEdgesBatch: nil,
		PodEdgesBatch:              nil,
		PodHostEdgesBatch:          nil,
		EndpointEdgesBatch:         nil,
		ContainerImageEdgeBatch:    nil,
		KubernetesClusterEdgeBatch: nil,
		NumMerged:                  1,
	}

	kubernetesEdgesBatch := map[string][]string{}

	for _, n := range rpt.Host {
		res.Hosts = append(res.Hosts, map[string]interface{}{"node_id": n.Metadata.NodeID})
		metadataMap := metadataToMap(n.Metadata)
		if n.Metadata.KubernetesClusterID != "" {
			kubernetesEdgesBatch[n.Metadata.KubernetesClusterID] = append(kubernetesEdgesBatch[n.Metadata.KubernetesClusterID], n.Metadata.NodeID)
		}
		res.HostBatch = append(res.HostBatch, metadataMap)
	}

	for _, n := range rpt.KubernetesCluster {
		res.KubernetesClusterBatch = append(res.KubernetesClusterBatch, metadataToMap(n.Metadata))
	}

	processesToKeep := map[string]struct{}{}
	for _, n := range rpt.Endpoint {
		if n.Metadata.HostName == "" {
			continue
		}
		buf.Reset()
		buf.WriteString(n.Metadata.HostName)
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(n.Metadata.Pid))
		hostPID := buf.String()
		processesToKeep[hostPID] = struct{}{}
	}

	pidsToKeep := map[int]struct{}{}
	for _, n := range rpt.Process {
		splits := strings.Split(n.Metadata.NodeID, ";")
		if len(splits) != 2 {
			continue
		}
		pid, _ := strconv.Atoi(splits[1])
		pidsToKeep[pid] = struct{}{}
	}

	// endpoint_batch := []map[string]string{}
	// endpoint_edges := []map[string]string{}

	ttl := time.Now().Add(-mapTTL)
	connections := []Connection{}
	localMemoization := map[string]struct{}{}
	for _, n := range rpt.Endpoint {
		if n.Adjacency == nil || len(*n.Adjacency) == 0 {
			continue
		}

		nodeIP, nodePort := extractIPPortFromEndpointID(n.Metadata.NodeID)
		if nodeIP == localhostIP {
			continue
		}
		if n.Metadata.HostName == "" {
			if val, ok := resolvers.getHost(nodeIP, ttl); ok {
				n.Metadata.HostName = val
			}
		}

		pid := n.Metadata.Pid
		if _, ok := pidsToKeep[pid]; !ok {
			pid = -1
		}

		localPortint, _ := strconv.Atoi(nodePort)

		for _, i := range *n.Adjacency {
			if n.Metadata.NodeID != i {
				ip, port := extractIPPortFromEndpointID(i)
				portint, _ := strconv.Atoi(port)
				// local memoization is used to skip redis access (91% reduction)
				if _, has := localMemoization[ip]; has {
					continue
				}
				if host, ok := resolvers.getHost(ip, ttl); ok {
					if n.Metadata.HostName == host {
						localMemoization[ip] = struct{}{}
						continue
					}
					rightIPPID, ok := resolvers.getIPPID(ip+port, ttl)
					if ok {
						rightpid := extractPidFromNodeID(rightIPPID)
						if n.Metadata.HostName == "" {
							connections = append(connections, Connection{
								source:      "in-the-internet",
								destination: host,
								leftPID:     pid,
								rightPID:    rightpid,
								localPort:   portint,
								leftIP:      &nodeIP,
							})
						} else {
							connections = append(connections, Connection{
								source:      n.Metadata.HostName,
								destination: host,
								leftPID:     pid,
								rightPID:    rightpid,
								localPort:   localPortint,
							})
						}
					}
				} else {
					connections = append(connections, Connection{
						source:      n.Metadata.HostName,
						destination: "out-the-internet",
						leftPID:     pid,
						rightPID:    0,
						localPort:   localPortint,
						rightIP:     &ip,
					})
				}
			}
		}
	}
	connections = resolveCloudService(connections, token)
	res.EndpointEdgesBatch = connections2maps(connections, buf)

	processEdgesBatch := map[string][]string{}
	containerProcessEdgesBatch := map[string][]string{}
	for _, n := range rpt.Process {
		if _, ok := processesToKeep[n.Metadata.NodeID]; !ok {
			continue
		}
		res.ProcessBatch = append(res.ProcessBatch, metadataToMap(n.Metadata))
		processEdgesBatch[n.Metadata.HostName] = append(processEdgesBatch[n.Metadata.HostName], n.Metadata.NodeID)
		if len(n.Parents.Container) != 0 {
			containerProcessEdgesBatch[n.Parents.Container] = append(containerProcessEdgesBatch[n.Parents.Container], n.Metadata.NodeID)
		}
	}

	containerEdgesBatch := map[string][]string{}
	for _, n := range rpt.Container {
		if n.Metadata.HostName == "" {
			continue
		}
		res.ContainerBatch = append(res.ContainerBatch, metadataToMap(n.Metadata))
		containerEdgesBatch[n.Metadata.HostName] = append(containerEdgesBatch[n.Metadata.HostName], n.Metadata.NodeID)
	}

	containerImageEdgesBatch := map[string][]string{}
	for _, n := range rpt.ContainerImage {
		if n.Metadata.HostName == "" {
			continue
		}
		if n.Metadata.ImageName == "<none>" || n.Metadata.ImageTag == "<none>" {
			continue
		}
		res.ContainerImageBatch = append(res.ContainerImageBatch, metadataToMap(n.Metadata))
		containerImageEdgesBatch[n.Metadata.HostName] = append(containerImageEdgesBatch[n.Metadata.HostName], n.Metadata.NodeID)
	}

	// Note: Pods are provided alone with an extra report
	// Therefore, it cannot rely on any previously computed data
	podEdgesBatch := map[string][]string{}
	podHostEdgesBatch := map[string][]string{}
	for _, n := range rpt.Pod {
		if n.Metadata.KubernetesClusterID == "" {
			continue
		}
		if n.Metadata.HostName == "" {
			if val, ok := resolvers.getHost(n.Metadata.KubernetesIP, ttl); ok {
				n.Metadata.HostName = val
			}
		}
		res.PodBatch = append(res.PodBatch, metadataToMap(n.Metadata))
		podEdgesBatch[n.Metadata.KubernetesClusterID] = append(podEdgesBatch[n.Metadata.KubernetesClusterID], n.Metadata.NodeID)
		podHostEdgesBatch[n.Metadata.HostName] = append(podHostEdgesBatch[n.Metadata.HostName], n.Metadata.NodeID)
	}

	res.ProcessEdgesBatch = concatMaps(processEdgesBatch)
	res.ContainerEdgesBatch = concatMaps(containerEdgesBatch)
	res.ContainerProcessEdgesBatch = concatMaps(containerProcessEdgesBatch)
	res.PodEdgesBatch = concatMaps(podEdgesBatch)
	res.PodHostEdgesBatch = concatMaps(podHostEdgesBatch)
	res.ContainerImageEdgeBatch = concatMaps(containerImageEdgesBatch)
	res.KubernetesClusterEdgeBatch = concatMaps(kubernetesEdgesBatch)

	return res
}

func (nc *neo4jIngester) Close() {
	nc.resolvers.Close()
	close(nc.ingester)
	close(nc.batcher)
	close(nc.resolversUpdate)
	close(nc.preparersInput)
	close(nc.done)
}

func (nc *neo4jIngester) Ingest(ctx context.Context, crpt report.CompressedReport) error {
	select {
	case nc.ingester <- crpt:
		nc.numProcessed.Add(1)
	default:
		breaker.Store(true)
		crpt.Cleanup()
		return fmt.Errorf("enqueuer channel full")
	}
	return nil
}

func (nc *neo4jIngester) IsReady() bool {
	nc.numReceived.Add(1)
	return !breaker.Load()
}

func (nc *neo4jIngester) PushToDBSeq(ctx context.Context, batches ReportIngestionData, session neo4j.SessionWithContext) error {

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "push-to-db-seq")
	defer span.End()

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:ContainerImage{node_id:row.node_id})
		MERGE (s:ImageStub{node_id: row.docker_image_name, docker_image_name: row.docker_image_name})
		MERGE (n) -[:IS]-> (s)
		SET n+= row,
			n.updated_at = TIMESTAMP(),
			n.active = true,
			s.updated_at = TIMESTAMP(),
			n.docker_image_id=row.node_id,
			s.tags = REDUCE(distinctElements = [], element IN COALESCE(s.tags, []) + row.docker_image_tag | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END),
			n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"batch": batches.ContainerImageBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MERGE (m:ContainerImage{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.ContainerImageEdgeBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		MATCH (m:Node{node_id: row.destination})
		MATCH (n)-[r:CONNECTS]->(m)
		DELETE r`,
		map[string]interface{}{"batch": batches.EndpointEdgesBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		MATCH (m:Node{node_id: row.destination})
		MERGE (n)-[r:CONNECTS]->(m)
		WITH n, r, m, row.pids as rpids
		UNWIND rpids as pids
		SET r.left_pids = coalesce(r.left_pids, []) + pids.left,
		    r.right_pids = coalesce(r.right_pids, []) + pids.right,
			r.local_ports = coalesce(r.local_ports, []) + pids.local_port,
			r.left_ips = coalesce(r.left_ips, []) + pids.left_ip,
			r.right_ips = coalesce(r.right_ips, []) + pids.right_ip`,
		map[string]interface{}{"batch": batches.EndpointEdgesBatch}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (nc *neo4jIngester) PushToDB(ctx context.Context, batches ReportIngestionData, session neo4j.SessionWithContext) error {

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "push-to-db")
	defer span.End()

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:Node{node_id:row.node_id})
		ON CREATE SET n.created_at = TIMESTAMP(), n+= row,
		n.updated_at = TIMESTAMP(), n.active = true
		ON MATCH SET n+= row, n.updated_at = TIMESTAMP(),
		n.active = true`,
		map[string]interface{}{"batch": batches.HostBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:Container{node_id:row.node_id})
		ON CREATE SET n.created_at = TIMESTAMP(),n+= row, n.updated_at = TIMESTAMP(),
        n.active = row.docker_container_state <> "deleted"
		ON MATCH SET n+= row, n.updated_at = TIMESTAMP(),
		n.active = row.docker_container_state <> "deleted"`,
		map[string]interface{}{"batch": batches.ContainerBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:Process{node_id:row.node_id})
		SET n+= row, n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"batch": batches.ProcessBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Container{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Process{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.ContainerProcessEdgesBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Container{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.ContainerEdgesBatch}); err != nil {
		return err
	}

	// if _, err = tx.Run(ctx,"UNWIND $batch as row MERGE (n:TEndpoint{node_id:row.node_id}) SET n+= row", map[string]interface{}{"batch": batches.Endpoint_batch}); err != nil {
	// return err
	//}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Process{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.ProcessEdgesBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.node_id})
		OPTIONAL MATCH (n:Node{node_id: 'in-the-internet'}) -[ri:CONNECTS]-> (n)
		OPTIONAL MATCH (n) -[r:CONNECTS]-> (:Node)
		DELETE r, ri`,
		map[string]interface{}{"batch": batches.Hosts}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:KubernetesCluster{node_id:row.node_id})
		ON CREATE SET n.created_at = TIMESTAMP(),
		n+= row, n.updated_at = TIMESTAMP(), n.active = true,
		n.node_type = 'cluster'
		ON MATCH SET n+= row, n.updated_at = TIMESTAMP(),
		n.active = true, n.node_type = 'cluster'`,
		map[string]interface{}{"batch": batches.KubernetesClusterBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:Pod{node_id:row.node_id})
		ON CREATE SET n.created_at = TIMESTAMP(), n+= row,
		n.updated_at = TIMESTAMP(), n.active = true
		ON MATCH SET n+= row, n.updated_at = TIMESTAMP(), n.active = true`,
		map[string]interface{}{"batch": batches.PodBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:KubernetesCluster{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Pod{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.PodEdgesBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:Node{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MERGE (m:Pod{node_id: dest})
		MERGE (n)-[:HOSTS]->(m)`,
		map[string]interface{}{"batch": batches.PodHostEdgesBatch}); err != nil {
		return err
	}

	if _, err := tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:KubernetesCluster{node_id: row.source})
		WITH n, row
		UNWIND row.destinations as dest
		MATCH (m:Node{node_id: dest})
		MERGE (n)-[:INSTANCIATE]->(m)`,
		map[string]interface{}{"batch": batches.KubernetesClusterEdgeBatch}); err != nil {
		return err
	}

	return tx.Commit(ctx)
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
		nc.preparersInput <- rpt
	}
	log.Info().Msgf("runIngester ended")
}

func (nc *neo4jIngester) runDBBatcher(dbPusher chan ReportIngestionData) {
	batch := [dbBatchSize]ReportIngestionData{}
	size := 0
	send := false
	ticker := time.NewTicker(dbBatchTimeout)
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
			send = size == dbBatchSize
		case <-ticker.C:
			send = size > 0
		}
		if send {
			if size > 0 {
				send = false
				finalBatch := mergeIngestionData(batch[:size])
				dbPusher <- finalBatch
				size = 0
				batch = [dbBatchSize]ReportIngestionData{}
				ticker.Reset(dbBatchTimeout)
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
	dbPusher, dbPusherSeq, dbPusherRetry chan ReportIngestionData,
	pusher func(context.Context, ReportIngestionData, neo4j.SessionWithContext) error) {

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf("Failed to get client: %v", err)
		return
	}
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})

	for batches := range dbPusher {
		ctx, span := telemetry.NewSpan(ctx, "ingester", "PushAgentReportsToDB")
		for {
			err := pusher(ctx, batches, session)
			if err != nil {
				batches.Retries += 1
				if batches.Retries < 2 && isClosedError(err) {
					log.Warn().Msg("Renew session")
					var newDriver neo4j.DriverWithContext
					newDriver, err = directory.Neo4jClient(ctx)
					if err == nil {
						_ = session.Close(ctx)
						session = newDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
						continue
					}
				}
				if batches.Retries == 2 || !isTransientError(err) {
					log.Error().Msgf("Neo4j err: %v", err)
					span.EndWithErr(err)
					break
				}
				select {
				case dbPusherRetry <- batches:
				default:
					log.Error().Msgf("Skip because: %v", err)
					span.EndWithErr(err)
					break
				}
				continue
			}
			span.End()
			if dbPusherSeq == nil {
				nc.numIngested.Add(int32(batches.NumMerged))
			} else {
				dbPusherSeq <- batches
			}
			break
		}
	}
	session.Close(ctx)
	log.Info().Msgf("runDBPusher ended")
}

func (nc *neo4jIngester) runPreparer(token string) {
	var buf bytes.Buffer
	for rpt := range nc.preparersInput {
		r := computeResolvers(&rpt, &buf)
		data := prepareNeo4jIngestion(&rpt, nc.resolvers, &buf, token)
		select {
		case nc.batcher <- data:
			nc.resolversUpdate <- r
		case nc.resolversUpdate <- r:
			nc.batcher <- data
		}
	}
}

func NewNeo4jCollector(ctx context.Context, token string) (Ingester[report.CompressedReport], error) {
	rdb, err := newEndpointResolversCache(ctx)

	if err != nil {
		return nil, err
	}

	ns, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}
	collectorCtx := directory.NewContextWithNameSpace(ns)

	done := make(chan struct{})
	dbPusher := make(chan ReportIngestionData, dbInputSize)
	dbPusherSeq := make(chan ReportIngestionData, dbInputSize)
	dbPusherRetry := make(chan ReportIngestionData, dbInputSize/2)
	dbPusherSeqRetry := make(chan ReportIngestionData, dbInputSize/2)
	nc := &neo4jIngester{
		resolvers:       rdb,
		ingester:        make(chan report.CompressedReport, ingesterSize),
		batcher:         make(chan ReportIngestionData, dbBatchSize),
		resolversUpdate: make(chan EndpointResolvers, dbBatchSize),
		preparersInput:  make(chan report.Report, dbBatchSize),
		done:            done,
		dbPusher:        dbPusher,
		numIngested:     atomic.Int32{},
		numReceived:     atomic.Int32{},
		numProcessed:    atomic.Int32{},
	}

	for i := 0; i < uncompressWorkersNum; i++ {
		go nc.runIngester()
	}

	for i := 0; i < dbPusherWorkersNum; i++ {
		go nc.runDBPusher(collectorCtx, dbPusher, dbPusherSeq, dbPusherRetry, nc.PushToDB)
	}

	go nc.runDBPusher(collectorCtx, dbPusherSeq, nil, dbPusherSeqRetry, nc.PushToDBSeq)

	go nc.resolversUpdater()

	go nc.runDBBatcher(dbPusher)

	go func() {
		for e := range dbPusherRetry {
			dbPusher <- e
		}
		log.Info().Msgf("nonseq retry ended")
	}()

	go func() {
		for e := range dbPusherSeqRetry {
			dbPusherSeq <- e
		}
		log.Info().Msgf("seq retry ended")
	}()

	for i := 0; i < preparerWorkersNum; i++ {
		go nc.runPreparer(token)
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
				len(nc.preparersInput),
				len(nc.resolversUpdate),
				len(nc.batcher),
				len(nc.dbPusher),
				len(dbPusherSeq))

			if len(nc.ingester) == 0 {
				breaker.Store(false)
			}
		}
	}()

	// Push back updater
	go func() {
		prevReceivedNum := int32(0)
		prevPushBack := FetchPushBack(collectorCtx)
		ticker := time.NewTicker(agentBaseTimeout * time.Duration(PushBack.Load()))
		defer ticker.Stop()
	loop:
		for {
			select {
			case <-ticker.C:
			case <-done:
				break loop
			}

			currentNumReceived := nc.numReceived.Swap(0)
			currentNumAccepted := nc.numProcessed.Swap(0)
			currentNumIngested := nc.numIngested.Swap(0)

			newValue := PushBack.Load()
			if currentNumIngested < (currentNumReceived/8)*7 {
				if currentNumReceived >= 100 {
					ratio := max(currentNumAccepted, 1) / max(currentNumIngested, 1)
					// Limit ratio to x2
					if ratio >= 2 {
						newValue = PushBack.Load() * 2
					} else {
						newValue = PushBack.Load() + 1
					}
				}
			} else if currentNumReceived < (prevReceivedNum/8)*7 {
				ratio := max(prevReceivedNum, 1) / max(currentNumReceived, 1)
				// Limit ratio to /2
				if ratio >= 2 {
					newValue = PushBack.Load() / ratio
				} else {
					newValue = PushBack.Load() - 1
				}
				prevReceivedNum = currentNumReceived
			}

			switch {
			case newValue <= 0:
				PushBack.Store(1)
			case newValue > maxPushBack:
				PushBack.Store(maxPushBack)
			default:
				PushBack.Store(newValue)
			}

			// Keep the highest number of reports
			prevReceivedNum = max(prevReceivedNum, currentNumReceived)

			err := UpdatePushBack(collectorCtx, &PushBack, prevPushBack)
			if err != nil {
				log.Error().Msgf("push back err: %v", err)
			}
			prevPushBack = PushBack.Load()

			ticker.Reset(agentBaseTimeout * time.Duration(PushBack.Load()))

			log.Info().Msgf("Received: %v, processed: %v, pushed: %v, Push back: %v", currentNumReceived, currentNumAccepted, currentNumIngested, PushBack.Load())
		}
	}()

	return nc, nil
}

func FetchPushBack(ctx context.Context) int32 {

	prevPushBack := int32(defaultPushBack)

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf("Cannot get push back value: %v", err)
		return prevPushBack
	}
	// Received num at the time of push back change
	newValue, err := GetPushBack(ctx, driver)
	if err != nil {
		log.Error().Msgf("Fail to get push back value: %v", err)
	} else {
		PushBack.Store(newValue)
	}
	prevPushBack = PushBack.Load()

	return prevPushBack
}

func max(a, b int32) int32 {
	if a < b {
		return b
	}
	return a
}

func extractIPPortFromEndpointID(nodeID string) (string, string) {
	first := strings.IndexByte(nodeID, ';')
	second := strings.IndexByte(nodeID[first+1:], ';') + first + 1
	return nodeID[first+1 : second], nodeID[second+1:]
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

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(5*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	var rec *db.Record
	if newValue.Load() != prev {
		res, err := tx.Run(ctx, `
			MATCH (n:Node{node_id:"deepfence-console-cron"})
			CALL apoc.atomic.update(n, 'push_back','`+strconv.Itoa(int(newValue.Load()))+`')
			YIELD oldValue, newValue
			return newValue`, map[string]interface{}{})
		if err != nil {
			return err
		}
		rec, err = res.Single(ctx)
		if err != nil {
			return err
		}
	} else {
		res, err := tx.Run(ctx, `
			MATCH (n:Node{node_id:"deepfence-console-cron"})
			RETURN n.push_back`, map[string]interface{}{})
		if err != nil {
			return err
		}
		rec, err = res.Single(ctx)
		if err != nil {
			return err
		}
	}
	newValue.Store(int32(rec.Values[0].(int64)))

	return tx.Commit(ctx)
}

func GetPushBack(ctx context.Context, driver neo4j.DriverWithContext) (int32, error) {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(5*time.Second))
	if err != nil {
		return 0, err
	}
	defer tx.Close(ctx)

	res, err := tx.Run(ctx, `
		MATCH (n:Node{node_id:"deepfence-console-cron"})
		RETURN n.push_back
		`,
		map[string]interface{}{})
	if err != nil {
		return 0, err
	}
	rec, err := res.Single(ctx)
	if err != nil {
		return 0, err
	}
	return int32(rec.Values[0].(int64)), nil
}

const (
	threatIntelResolverURL = "https://threat-intel.deepfence.io/threat-intel"
)

type CloudInfo struct {
	Type     string `json:"type"`
	Region   string `json:"region"`
	Provider string `json:"provider"`
}

func (ci *CloudInfo) NodeID() string {
	return fmt.Sprintf("%s-%s", ci.Provider, ci.Type)
}

type IPResponse struct {
	Infos []CloudInfo `json:"Infos"`
}

type IPRequest struct {
	IPv4s []string `json:"ipv4s"`
	IPv6s []string `json:"ipv6s"`
}

func requestCloudInfo(ctx context.Context, strIps []string, token string) ([]CloudInfo, error) {
	// check if token is present
	var infos []CloudInfo

	bodyReq := IPRequest{
		IPv4s: strIps,
	}
	b, err := json.Marshal(bodyReq)
	if err != nil {
		return infos, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, threatIntelResolverURL+"/cloud-ips", bytes.NewReader(b))
	if err != nil {
		return infos, err
	}

	req.Header.Set("x-license-key", token)

	q := req.URL.Query()
	q.Add("version", constants.Version)
	q.Add("product", utils.Project)
	req.URL.RawQuery = q.Encode()

	log.Info().Msgf("query threatintel at %s", req.URL.String())

	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: true,
	}
	hc := http.Client{
		Timeout:   1 * time.Minute,
		Transport: tr,
	}
	resp, err := hc.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("failed http request")
		return infos, err
	}

	if resp.StatusCode != http.StatusOK {
		return infos, fmt.Errorf("%d invaid response code", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msg("failed read response body")
		return infos, err
	}
	defer resp.Body.Close()

	var res IPResponse
	if err := json.Unmarshal(body, &res); err != nil {
		log.Error().Err(err).Msg("failed to decode response body")
		return infos, err
	}

	return res.Infos, nil
}

func resolveCloudService(connections []Connection, token string) []Connection {
	ips := []string{}
	for i := range connections {
		if connections[i].rightIP != nil {
			ips = append(ips, *connections[i].rightIP)
		}
	}
	if len(ips) == 0 {
		return connections
	}
	infos, err := requestCloudInfo(context.Background(), ips, token)
	if err != nil || len(connections) != len(infos) {
		log.Error().Err(err).Msgf("issue fetching cloud infos %d/%d", len(infos), len(connections))
		return connections
	}
	for i := range infos {
		connections[i].destination = infos[i].NodeID()
	}
	return connections
}

package cache

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
	"github.com/olivere/elastic/v7"
	log "github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/render/detailed"
)

type RedisCache struct {
	topologyOptionsScope TopologyOptions
	topologyOptionsDf    TopologyOptions
	filterRedisKey       string
	nodeType             string
	redisPool            *redis.Pool
	nodeStatus           NodeStatus
	topologyID           string
	redisDbNum           int
}

func NewRedisCache(topologyID string) *RedisCache {
	nodeType := TopologyIdNodeTypeMap[topologyID]
	r := RedisCache{
		topologyID:           topologyID,
		nodeType:             nodeType,
		topologyOptionsScope: TopologyOptions{NodeType: nodeType, Params: TopologyParams{Format: TopologyFormatScope}},
		topologyOptionsDf:    TopologyOptions{NodeType: nodeType, Params: TopologyParams{Format: TopologyFormatDeepfence}},
		filterRedisKey:       TopologyFilterPrefix + strings.ToUpper(nodeType),
		nodeStatus:           NodeStatus{VulnerabilityScanStatus: make(map[string]string), SecretScanStatus: make(map[string]string), MalwareScanStatus: make(map[string]string)},
	}
	r.redisPool, r.redisDbNum = NewRedisPool()
	r.topologyOptionsScope.TopologyOptionsValidate()
	r.topologyOptionsDf.TopologyOptionsValidate()

	go func() {
		if r.nodeType == NodeTypeHost || r.nodeType == NodeTypeContainer || r.nodeType == NodeTypeContainerImage || r.nodeType == NodeTypePod {
			for {
				err := r.getEsData()
				if err != nil {
					log.Println(err)
				}
				time.Sleep(15 * time.Second)
			}
		}
	}()

	return &r
}

func (r *RedisCache) Update(nodeSummaries detailed.NodeSummaries) {
	//
	// Save current scope data
	//
	err := r.scopeTopologyFixes(&nodeSummaries)
	if err != nil {
		log.Printf("Error: %v\n", err)
	}
	topologyScopeJson, _ := CodecEncode(nodeSummaries)
	redisConn := r.redisPool.Get()
	_, err = redisConn.Do("SETEX", r.topologyOptionsScope.Key, RedisExpiryTime, string(topologyScopeJson))
	redisConn.Close()
	if err != nil {
		log.Printf("Error: SETEX %s: %v\n", r.topologyOptionsScope.Key, err)
	}

	var topologyDf map[string]DeepfenceTopology
	var dfIdToScopeIdMap map[string]string
	//
	// Call node specific formatter
	//
	switch r.nodeType {
	case NodeTypeHost:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyHostData(nodeSummaries)
	case NodeTypeContainer:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyContainerData(nodeSummaries)
	case NodeTypeContainerImage:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyContainerImageData(nodeSummaries)
	case NodeTypeContainerByName:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyContainerByNameData(nodeSummaries)
	case NodeTypeProcess:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyProcessData(nodeSummaries)
	case NodeTypeProcessByName:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyProcessByNameData(nodeSummaries)
	case NodeTypePod:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyPodData(nodeSummaries)
	case NodeTypeKubeService:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyKubeServiceData(nodeSummaries)
	case NodeTypeKubeController:
		topologyDf, dfIdToScopeIdMap = r.formatTopologyKubeControllerData(nodeSummaries)
	}
	//
	// Set current df format data
	//
	topologyDfJson, _ := CodecEncode(topologyDf)
	redisConn = r.redisPool.Get()
	defer redisConn.Close()
	_, err = redisConn.Do("SETEX", r.topologyOptionsDf.Key, RedisExpiryTime, string(topologyDfJson))
	if err != nil {
		log.Println(fmt.Sprintf("Error: SETEX %s:", r.topologyOptionsDf.Key), err)
	}

	//
	// Df node id to scope id
	//
	dfIdToScopeIdKey := dfIdToScopeIdRedisKeyPrefix + strings.ToUpper(r.nodeType)
	if len(dfIdToScopeIdMap) > 0 {
		redisArgs := redis.Args{}
		redisArgs = redisArgs.Add(dfIdToScopeIdKey)
		for dfId, scopeId := range dfIdToScopeIdMap {
			redisArgs = redisArgs.Add(dfId)
			redisArgs = redisArgs.Add(scopeId)
		}
		_, err = redisConn.Do("HMSET", redisArgs...)
		if err != nil {
			log.Println("Error: HMSET "+dfIdToScopeIdKey, err)
		}
	} else {
		_, err = redisConn.Do("HMSET", dfIdToScopeIdKey, "", "")
		if err != nil {
			log.Println("Error: HMSET "+dfIdToScopeIdKey, err)
		}
	}
	_, err = redisConn.Do("EXPIRE", dfIdToScopeIdKey, RedisExpiryTime)
	if err != nil {
		log.Println("Error: EXPIRE "+dfIdToScopeIdKey, err)
	}
}

func (r *RedisCache) scopeTopologyFixes(nodeSummaries *detailed.NodeSummaries) error {
	//
	// In k8s, different pods can have same container name in same host. Our code uses container_name as uid (within host) in many places.
	// It is fixed by changing container_name to namespace/pod_name/container_name tuple.
	//
	if r.nodeType == NodeTypeContainer {
		topologyOptions := TopologyOptions{NodeType: NodeTypePod, Params: TopologyParams{Format: TopologyFormatScope, Stopped: "both", Pseudo: "show", Unconnected: "show", Namespace: ""}}
		topologyOptions.TopologyOptionsValidate()
		redisConn := r.redisPool.Get()
		topologyPodsJson, err := FetchTopologyData(redisConn, topologyOptions.Key)
		redisConn.Close()
		if err != nil {
			return err
		}
		var topologyPods detailed.NodeSummaries
		err = CodecDecode(bytes.NewReader(topologyPodsJson), &topologyPods)
		if err != nil {
			return err
		}
		for id, container := range *nodeSummaries {
			podId := ""
			containerName := container.Label
			for _, parent := range container.Parents {
				if parent.TopologyID == TopologyIdPod {
					podId = parent.ID
					break
				}
			}
			if podId != "" {
				if podDetail, ok := topologyPods[podId]; ok {
					container.Label = fmt.Sprintf("%s/%s", podDetail.Label, containerName)
				}
			}
			(*nodeSummaries)[id] = container
		}
	} else if r.nodeType == NodeTypePod {
		for id, pod := range *nodeSummaries {
			podNamespace := ""
			podName := pod.Label
			for _, metadata := range pod.Metadata {
				if metadata.ID == "kubernetes_namespace" {
					podNamespace = metadata.Value
					break
				}
			}
			pod.Label = fmt.Sprintf("%s/%s", podNamespace, podName)
			(*nodeSummaries)[id] = pod
		}
	}
	return nil
}

func (r *RedisCache) getEsData() error {
	var esClient *elastic.Client
	var err error

	esScheme := os.Getenv("ELASTICSEARCH_SCHEME")
	if esScheme == "" {
		esScheme = "http"
	}
	esHost := os.Getenv("ELASTICSEARCH_HOST")
	if esHost == "" {
		esHost = "deepfence-es"
	}
	esPort := os.Getenv("ELASTICSEARCH_PORT")
	if esPort == "" {
		esPort = "9200"
	}
	esUsername := os.Getenv("ELASTICSEARCH_USER")
	esPassword := os.Getenv("ELASTICSEARCH_PASSWORD")

	if esUsername != "" && esPassword != "" {
		esClient, err = elastic.NewClient(
			elastic.SetHealthcheck(false),
			elastic.SetSniff(false),
			elastic.SetURL(esScheme+"://"+esHost+":"+esPort),
			elastic.SetBasicAuth(esUsername, esPassword),
		)
	} else {
		esClient, err = elastic.NewClient(
			elastic.SetHealthcheck(false),
			elastic.SetSniff(false),
			elastic.SetURL(esScheme+"://"+esHost+":"+esPort),
		)
	}
	if err != nil {
		return err
	}
	// Update status first time before ticker starts
	err = r.updateScanStatusData(esClient)
	if err != nil {
		return err
	}
	// Update every 10 seconds
	ticker := time.NewTicker(10 * time.Second)
	for {
		select {
		case <-ticker.C:
			err = r.updateScanStatusData(esClient)
			if err != nil {
				log.Println("Error updating scan details from elasticsearch: ", err)
			}
		}
	}
}

func (r *RedisCache) updateScanStatusData(esClient *elastic.Client) error {
	var err error
	var ok bool
	mSearch := elastic.NewMultiSearchService(esClient)

	nodeIdAggs := elastic.NewTermsAggregation().Field("node_id.keyword").Size(esAggsSize)
	statusAggs := elastic.NewTermsAggregation().Field("action.keyword").Size(50)
	recentTimestampAggs := elastic.NewMaxAggregation().Field("@timestamp")
	statusAggs.SubAggregation("scan_recent_timestamp", recentTimestampAggs)
	nodeIdAggs.SubAggregation("action", statusAggs)
	esQuery := elastic.NewSearchRequest().Index(cveScanLogsEsIndex).Query(elastic.NewMatchAllQuery()).Size(0).Aggregation("node_id", nodeIdAggs)
	mSearch.Add(esQuery)

	nodeIdAggs = elastic.NewTermsAggregation().Field("node_id.keyword").Size(esAggsSize)
	statusAggs = elastic.NewTermsAggregation().Field("scan_status.keyword").Size(50)
	recentTimestampAggs = elastic.NewMaxAggregation().Field("@timestamp")
	statusAggs.SubAggregation("secret_scan_timestamp", recentTimestampAggs)
	nodeIdAggs.SubAggregation("secret_scan_status", statusAggs)
	esQuery = elastic.NewSearchRequest().Index(secretScanLogsEsIndex).Query(elastic.NewMatchAllQuery()).Size(0).Aggregation("node_id", nodeIdAggs)
	mSearch.Add(esQuery)

	nodeIdAggs = elastic.NewTermsAggregation().Field("node_id.keyword").Size(esAggsSize)
	statusAggs = elastic.NewTermsAggregation().Field("scan_status.keyword").Size(50)
	recentTimestampAggs = elastic.NewMaxAggregation().Field("@timestamp")
	statusAggs.SubAggregation("malware_scan_timestamp", recentTimestampAggs)
	nodeIdAggs.SubAggregation("malware_scan_status", statusAggs)
	esQuery = elastic.NewSearchRequest().Index(malwareScanLogsEsIndex).Query(elastic.NewMatchAllQuery()).Size(0).Aggregation("node_id", nodeIdAggs)
	mSearch.Add(esQuery)

	mSearchResult, err := mSearch.Do(context.Background())
	if err != nil {
		return err
	}
	nodeIdVulnerabilityStatusMap := make(map[string]string)
	nodeIdVulnerabilityStatusTimeMap := make(map[string]string)
	cveResp := mSearchResult.Responses[0]
	nodeIdAggsBkt, ok := cveResp.Aggregations.Terms("node_id")
	if !ok {
		return nil
	}
	for _, nodeIdAggs := range nodeIdAggsBkt.Buckets {
		latestScanTime := 0.0
		var latestStatus, latestScanTimeStr string
		scanStatusBkt, ok := nodeIdAggs.Aggregations.Terms("action")
		if !ok {
			continue
		}
		for _, scanStatusAggs := range scanStatusBkt.Buckets {
			recentTimestampBkt, ok := scanStatusAggs.Aggregations.Max("scan_recent_timestamp")
			if !ok || recentTimestampBkt == nil || recentTimestampBkt.Value == nil {
				continue
			}
			if *recentTimestampBkt.Value > latestScanTime {
				latestScanTime = *recentTimestampBkt.Value
				latestStatus = scanStatusAggs.Key.(string)
				valueAsStr, ok := recentTimestampBkt.Aggregations["value_as_string"]
				if ok {
					val, err := valueAsStr.MarshalJSON()
					if err != nil {
						latestScanTimeStr = strings.ReplaceAll(string(val), "\"", "")
					}
				}
			}
		}
		latestStatus, ok = statusMap[latestStatus]
		if !ok {
			latestStatus = scanStatusNeverScanned
		}
		nodeIdVulnerabilityStatusMap[nodeIdAggs.Key.(string)] = latestStatus
		nodeIdVulnerabilityStatusTimeMap[nodeIdAggs.Key.(string)] = latestScanTimeStr
	}
	r.nodeStatus.Lock()
	r.nodeStatus.VulnerabilityScanStatus = nodeIdVulnerabilityStatusMap
	r.nodeStatus.VulnerabilityScanStatusTime = nodeIdVulnerabilityStatusTimeMap
	r.nodeStatus.Unlock()

	nodeIdSecretStatusMap := make(map[string]string)
	nodeIdSecretStatusTimeMap := make(map[string]string)
	secretResp := mSearchResult.Responses[1]
	nodeIdAggsBkt, ok = secretResp.Aggregations.Terms("node_id")
	if !ok {
		return nil
	}
	for _, nodeIdAggs := range nodeIdAggsBkt.Buckets {
		if nodeIdAggs.Key.(string) == "" {
			continue
		}
		latestScanTime := 0.0
		var latestStatus, latestScanTimeStr string
		scanStatusBkt, ok := nodeIdAggs.Aggregations.Terms("secret_scan_status")
		if !ok {
			continue
		}
		for _, scanStatusAggs := range scanStatusBkt.Buckets {
			recentTimestampBkt, ok := scanStatusAggs.Aggregations.Max("secret_scan_timestamp")
			if !ok || recentTimestampBkt == nil || recentTimestampBkt.Value == nil {
				continue
			}
			if *recentTimestampBkt.Value > latestScanTime {
				latestScanTime = *recentTimestampBkt.Value
				latestStatus = scanStatusAggs.Key.(string)
				valueAsStr, ok := recentTimestampBkt.Aggregations["value_as_string"]
				if ok {
					latestScanTimeStr = strings.ReplaceAll(string(valueAsStr), "\"", "")
				}
			}
		}
		latestStatus, ok = statusMap[latestStatus]
		if !ok {
			latestStatus = scanStatusNeverScanned
		}
		nodeIdSecretStatusMap[strings.Split(nodeIdAggs.Key.(string), ";")[0]] = latestStatus
		nodeIdSecretStatusTimeMap[strings.Split(nodeIdAggs.Key.(string), ";")[0]] = latestScanTimeStr
	}
	r.nodeStatus.Lock()
	r.nodeStatus.SecretScanStatus = nodeIdSecretStatusMap
	r.nodeStatus.SecretScanStatusTime = nodeIdSecretStatusTimeMap
	r.nodeStatus.Unlock()

	nodeIdMalwareStatusMap := make(map[string]string)
	nodeIdMalwareStatusTimeMap := make(map[string]string)
	malwareResp := mSearchResult.Responses[2]
	nodeIdAggsBkt, ok = malwareResp.Aggregations.Terms("node_id")
	if !ok {
		return nil
	}
	for _, nodeIdAggs := range nodeIdAggsBkt.Buckets {
		if nodeIdAggs.Key.(string) == "" {
			continue
		}
		latestScanTime := 0.0
		var latestStatus, latestScanTimeStr string
		scanStatusBkt, ok := nodeIdAggs.Aggregations.Terms("malware_scan_status")
		if !ok {
			continue
		}
		for _, scanStatusAggs := range scanStatusBkt.Buckets {
			recentTimestampBkt, ok := scanStatusAggs.Aggregations.Max("malware_scan_timestamp")
			if !ok || recentTimestampBkt == nil || recentTimestampBkt.Value == nil {
				continue
			}
			if *recentTimestampBkt.Value > latestScanTime {
				latestScanTime = *recentTimestampBkt.Value
				latestStatus = scanStatusAggs.Key.(string)
				valueAsStr, ok := recentTimestampBkt.Aggregations["value_as_string"]
				if ok {
					latestScanTimeStr = strings.ReplaceAll(string(valueAsStr), "\"", "")
				}
			}
		}
		latestStatus, ok = statusMap[latestStatus]
		if !ok {
			latestStatus = scanStatusNeverScanned
		}
		nodeIdMalwareStatusMap[strings.Split(nodeIdAggs.Key.(string), ";")[0]] = latestStatus
		nodeIdMalwareStatusTimeMap[strings.Split(nodeIdAggs.Key.(string), ";")[0]] = latestScanTimeStr
	}
	r.nodeStatus.Lock()
	r.nodeStatus.MalwareScanStatus = nodeIdMalwareStatusMap
	r.nodeStatus.MalwareScanStatusTime = nodeIdMalwareStatusTimeMap
	r.nodeStatus.Unlock()
	return nil
}

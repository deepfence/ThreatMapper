package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"time"

	"github.com/gomodule/redigo/redis"
	"github.com/gorilla/websocket"
	"github.com/olivere/elastic/v7"
)

type WebsocketClient struct {
	topologyOptionsScope TopologyOptions
	topologyOptionsDf    TopologyOptions
	filterRedisKey       string
	nodeType             string
	wsURL                string
	//
	// Maintain current topology (and dump it to redis), so that when a new websocket connection is created from api,
	// first reply will include all nodes in current state, and subsequent responses will give only diffs
	//
	topologyScope    map[string]ScopeTopology
	topologyDf       map[string]DeepfenceTopology
	redisPool        *redis.Pool
	redisDbNum       int
	dfIdToScopeIdMap map[string]string
	nodeStatus       NodeStatus
	topologyStats    TopologyStats
}

type TopologyStats struct {
	NodeCount int
	EdgeCount int
	sync.RWMutex
}

type NodeStatus struct {
	VulnerabilityScanStatus     map[string]string
	VulnerabilityScanStatusTime map[string]string
	SecretScanStatus     map[string]string
	SecretScanStatusTime map[string]string
	sync.RWMutex
}

func (wsCli *WebsocketClient) Init(nodeType string) {
	wsCli.redisPool, wsCli.redisDbNum = newRedisPool()
	wsCli.nodeType = nodeType
	wsCli.topologyOptionsScope = TopologyOptions{NodeType: nodeType, Params: TopologyParams{Format: TopologyFormatScope}}
	wsCli.topologyOptionsScope.TopologyOptionsValidate()
	wsCli.topologyOptionsDf = TopologyOptions{NodeType: nodeType, Params: TopologyParams{Format: TopologyFormatDeepfence}}
	wsCli.topologyOptionsDf.TopologyOptionsValidate()
	wsCli.filterRedisKey = TopologyFilterPrefix + strings.ToUpper(nodeType)
	wsURL := ScopeWebSocketUrl[wsCli.nodeType]
	wsCli.wsURL = wsURL.String()
	wsCli.topologyScope = make(map[string]ScopeTopology)
	wsCli.topologyDf = make(map[string]DeepfenceTopology)
	wsCli.dfIdToScopeIdMap = make(map[string]string)
	wsCli.nodeStatus = NodeStatus{VulnerabilityScanStatus: make(map[string]string), SecretScanStatus: make(map[string]string)}
	wsCli.topologyStats = TopologyStats{NodeCount: 0, EdgeCount: 0}
}

func (wsCli *WebsocketClient) parseMessage(message []byte) {
	var scopeTopologyDiff ScopeTopologyDiff
	err := json.Unmarshal(message, &scopeTopologyDiff)
	if err != nil {
		log.Println("err:", err)
		return
	}
	if scopeTopologyDiff.Reset == true {
		wsCli.topologyScope = make(map[string]ScopeTopology)
	}
	scopeTopologyDiff.Options = wsCli.topologyOptionsScope
	// Add / update / delete node details using topology diff
	addIds := make([]string, len(scopeTopologyDiff.Add))
	updateIds := make([]string, len(scopeTopologyDiff.Update))
	removeIds := make([]string, len(scopeTopologyDiff.Remove))
	for i, scopeID := range scopeTopologyDiff.Remove {
		_, ok := wsCli.topologyScope[scopeID]
		if ok {
			delete(wsCli.topologyScope, scopeID)
		}
		removeIds[i] = wsCli.getDfIdFromScopeId(scopeID)
	}

	scopeTopologyDiff.Add = wsCli.scopeTopologyFixes(scopeTopologyDiff.Add)
	scopeTopologyDiff.Update = wsCli.scopeTopologyFixes(scopeTopologyDiff.Update)
	for i, nodeDetail := range scopeTopologyDiff.Add {
		wsCli.topologyScope[nodeDetail.ID] = nodeDetail
		addIds[i] = wsCli.getDfIdFromScopeId(nodeDetail.ID)
	}
	for i, nodeDetail := range scopeTopologyDiff.Update {
		wsCli.topologyScope[nodeDetail.ID] = nodeDetail
		updateIds[i] = wsCli.getDfIdFromScopeId(nodeDetail.ID)
	}
	//
	// Set current scope data
	//
	redisConn := wsCli.redisPool.Get()
	defer redisConn.Close()
	topologyScopeJson, _ := JsonEncode(wsCli.topologyScope)
	_, err = redisConn.Do("SETEX", wsCli.topologyOptionsScope.Channel, RedisExpiryTime, string(topologyScopeJson))
	if err != nil {
		log.Printf("Error: SETEX %s: %v\n", wsCli.topologyOptionsScope.Channel, err)
	}
	//
	// Scope format to Deepfence format
	//
	wsCli.topologyDf = make(map[string]DeepfenceTopology)
	wsCli.dfIdToScopeIdMap = make(map[string]string)
	//
	// Call node specific formatter
	//
	switch wsCli.nodeType {
	case NodeTypeHost:
		wsCli.formatTopologyHostData()
	case NodeTypeContainer:
		wsCli.formatTopologyContainerData()
	case NodeTypeContainerImage:
		wsCli.formatTopologyContainerImageData()
	case NodeTypeContainerByName:
		wsCli.formatTopologyContainerByNameData()
	case NodeTypeProcess:
		wsCli.formatTopologyProcessData()
	case NodeTypeProcessByName:
		wsCli.formatTopologyProcessByNameData()
	case NodeTypePod:
		wsCli.formatTopologyPodData()
	case NodeTypeKubeService:
		wsCli.formatTopologyKubeServiceData()
	case NodeTypeKubeController:
		wsCli.formatTopologyKubeControllerData()
	case NodeTypeSwarmService:
		wsCli.formatTopologySwarmServiceData()
	}
	//
	// Set current df format data
	//
	topologyDfJson, _ := JsonEncode(wsCli.topologyDf)
	_, err = redisConn.Do("SETEX", wsCli.topologyOptionsDf.Channel, RedisExpiryTime, string(topologyDfJson))
	if err != nil {
		log.Println(fmt.Sprintf("Error: SETEX %s:", wsCli.topologyOptionsDf.Channel), err)
	}

	//
	// Df node id to scope id
	//
	dfIdToScopeIdKey := dfIdToScopeIdRedisKeyPrefix + strings.ToUpper(wsCli.nodeType)
	if len(wsCli.dfIdToScopeIdMap) > 0 {
		redisArgs := redis.Args{}
		redisArgs = redisArgs.Add(dfIdToScopeIdKey)
		for dfId, scopeId := range wsCli.dfIdToScopeIdMap {
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
	return
}

func (wsCli *WebsocketClient) publishFilteredTopology(deleteDfIds []string, deleteScopeIds []string, optionsDf TopologyOptions, optionsScope TopologyOptions, dfTopologyDiff DeepfenceTopologyDiff, scopeTopologyDiff ScopeTopologyDiff) {
	//
	// Deepfence format
	//
	redisConn := wsCli.redisPool.Get()
	defer redisConn.Close()
	topologyDf := DeepCopyDfTopology(wsCli.topologyDf)
	for _, delId := range deleteDfIds {
		delete(topologyDf, delId)
	}
	// Set filtered data in redis
	topologyDfJsonTmp, _ := JsonEncode(topologyDf)
	_, err := redisConn.Do("SETEX", optionsDf.Channel, RedisExpiryTime, string(topologyDfJsonTmp))
	if err != nil {
		log.Printf("Error: SETEX %s: %v\n", optionsDf.Channel, err)
	}
	// topology diff
	dfTopologyDiff.deleteIdsFromDfTopologyDiff(deleteDfIds)
	dfTopologyDiff.Options = optionsDf
	dfTopologyDiffTmpJson, _ := JsonEncode(dfTopologyDiff)
	// Publish diff in redis pubsub
	_, err = redisConn.Do("PUBLISH", fmt.Sprintf("%s_%d", optionsDf.Channel, wsCli.redisDbNum), string(dfTopologyDiffTmpJson))
	if err != nil {
		log.Printf("Error: PUBLISH %s: %v\n", fmt.Sprintf("%s_%d", optionsDf.Channel, wsCli.redisDbNum), err)
	}
	//
	// Scope format
	//
	topologyScope := DeepCopyScopeTopology(wsCli.topologyScope)
	for _, delId := range deleteScopeIds {
		delete(topologyScope, delId)
	}
	// Set filtered data in redis
	topologyScopeJsonTmp, _ := JsonEncode(topologyScope)
	_, err = redisConn.Do("SETEX", optionsScope.Channel, RedisExpiryTime, string(topologyScopeJsonTmp))
	if err != nil {
		log.Printf("Error: SETEX %s: %v\n", optionsScope.Channel, err)
	}
	// topology diff
	scopeTopologyDiff.deleteIdsFromScopeTopologyDiff(deleteScopeIds)
	scopeTopologyDiff.Options = optionsScope
	scopeTopologyDiffJson, _ := JsonEncode(scopeTopologyDiff)
	// Publish diff in redis pubsub
	_, err = redisConn.Do("PUBLISH", fmt.Sprintf("%s_%d", optionsScope.Channel, wsCli.redisDbNum), string(scopeTopologyDiffJson))
	if err != nil {
		log.Printf("Error: PUBLISH %s: %v\n", fmt.Sprintf("%s_%d", optionsScope.Channel, wsCli.redisDbNum), err)
	}
}

func (wsCli *WebsocketClient) updateScanStatusData(esClient *elastic.Client) error {
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
	wsCli.nodeStatus.Lock()
	wsCli.nodeStatus.VulnerabilityScanStatus = nodeIdVulnerabilityStatusMap
	wsCli.nodeStatus.VulnerabilityScanStatusTime = nodeIdVulnerabilityStatusTimeMap
	wsCli.nodeStatus.Unlock()

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
	wsCli.nodeStatus.Lock()
	wsCli.nodeStatus.SecretScanStatus = nodeIdSecretStatusMap
	wsCli.nodeStatus.SecretScanStatusTime = nodeIdSecretStatusTimeMap
	wsCli.nodeStatus.Unlock()
	return nil
}

func (wsCli *WebsocketClient) updateNodeCount() error {
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{}}}
	req, err := http.NewRequest(http.MethodGet, "http://deepfence-topology:8004/topology-api/topology", nil)
	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	if resp.StatusCode == http.StatusOK {
		bodyBytes, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return err
		}
		var topologyStats []TopologyStatistics
		err = json.Unmarshal(bodyBytes, &topologyStats)
		if err != nil {
			return err
		}
		for _, topologyStat := range topologyStats {
			topologyId := strings.ReplaceAll(topologyStat.URL, "/topology-api/topology/", "")
			nodeType, ok := TopologyIdNodeTypeMap[topologyId]
			if ok {
				if nodeType == wsCli.nodeType {
					wsCli.topologyStats.Lock()
					wsCli.topologyStats.NodeCount = topologyStat.Stats.NodeCount
					wsCli.topologyStats.EdgeCount = topologyStat.Stats.EdgeCount
					wsCli.topologyStats.Unlock()
					break
				}
			}
			for _, subTopologyStat := range topologyStat.SubTopologies {
				topologyId = strings.ReplaceAll(subTopologyStat.URL, "/topology-api/topology/", "")
				nodeType, ok = TopologyIdNodeTypeMap[topologyId]
				if ok {
					if nodeType == wsCli.nodeType {
						wsCli.topologyStats.Lock()
						wsCli.topologyStats.NodeCount = subTopologyStat.Stats.NodeCount
						wsCli.topologyStats.EdgeCount = subTopologyStat.Stats.EdgeCount
						wsCli.topologyStats.Unlock()
						break
					}
				}
			}
		}
	}
	return nil
}

func (wsCli *WebsocketClient) getEsData() error {
	esHost := os.Getenv("ELASTICSEARCH_HOST")
	if esHost == "" {
		esHost = "deepfence-es"
	}
	esPort := os.Getenv("ELASTICSEARCH_PORT")
	if esPort == "" {
		esPort = "9200"
	}
	esClient, err := elastic.NewClient(
		elastic.SetHealthcheck(false),
		elastic.SetSniff(false),
		elastic.SetURL("http://"+esHost+":"+esPort),
	)
	if err != nil {
		return err
	}
	// Update status first time before ticker starts
	err = wsCli.updateScanStatusData(esClient)
	if err != nil {
		return err
	}
	// Update every 10 seconds
	ticker := time.NewTicker(10 * time.Second)
	for {
		select {
		case <-ticker.C:
			err = wsCli.updateScanStatusData(esClient)
			if err != nil {
				log.Println("Error updating scan details from elasticsearch: ", err)
			}
		}
	}
}

func (wsCli *WebsocketClient) ConnectToScopeWebSocket() {
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)

	go func() {
		if wsCli.nodeType == NodeTypeHost || wsCli.nodeType == NodeTypeContainer || wsCli.nodeType == NodeTypeContainerImage || wsCli.nodeType == NodeTypePod {
			for {
				err := wsCli.getEsData()
				if err != nil {
					log.Println(err)
				}
				time.Sleep(15 * time.Second)
			}
		}
	}()

	go func() {
		err := wsCli.updateNodeCount()
		if err != nil {
			log.Println(err)
		}
		ticker := time.NewTicker(5 * time.Minute)
		for {
			select {
			case <-ticker.C:
				err := wsCli.updateNodeCount()
				if err != nil {
					log.Println(err)
				}
			}
		}
	}()

	log.Printf("connecting to %s", wsCli.wsURL)

	header := http.Header{}
	wsConn, _, err := websocket.DefaultDialer.Dial(wsCli.wsURL, header)
	if err != nil {
		log.Println("Error: dial:", err)
		GracefulExit()
	}
	defer wsConn.Close()

	done := make(chan struct{})

	go func() {
		defer close(done)
		for {
			err = wsConn.SetReadDeadline(time.Now().UTC().Add(45 * time.Second))
			if err != nil {
				log.Println("Error: SetReadDeadline", err)
				GracefulExit()
			}
			_, message, err := wsConn.ReadMessage()
			if err != nil {
				log.Println("Error: wsConn.ReadMessage:", err)
				GracefulExit()
			}
			wsCli.parseMessage(message)
		}
	}()

	for {
		select {
		case <-done:
			return
		case <-interrupt:
			log.Println("interrupt")

			// Cleanly close the connection by sending a close message and then
			// waiting (with timeout) for the server to close the connection.
			err := wsConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			if err != nil {
				log.Println("write close:", err)
				return
			}
			select {
			case <-done:
			case <-time.After(time.Second):
			}
			return
		}
	}
}

package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gomodule/redigo/redis"
	"github.com/olivere/elastic/v7"
	"github.com/sirupsen/logrus"
	redisCache "github.com/weaveworks/scope/cache"
)

const (
	esAggsSize             = 100000
	scanStatusNeverScanned = "never_scanned"
	nodeSeverityRedisKey   = "NODE_SEVERITY"
)

var (
	cveScanLogsEsIndex     = "cve-scan"
	complianceLogsEsIndex  = "compliance-scan-logs"
	secretScanLogsEsIndex  = "secret-scan-logs"
	malwareScanLogsEsIndex = "malware-scan-logs"
	statusMap              map[string]string
	nStatus                *Status
)

type Status struct {
	nodeStatus NodeStatus
	esClient   *elastic.Client
	redisPool  *redis.Pool
}

type NodeSeverityData struct {
	Containers map[string]string `json:"containers,omitempty"`
	Pods       map[string]string `json:"pods,omitempty"`
	Severity   string            `json:"severity,omitempty"`
}

type NodeStatus struct {
	VulnerabilityScanStatus     map[string]string
	VulnerabilityScanStatusTime map[string]string
	ComplianceScanStatus        map[string]string
	ComplianceScanStatusTime    map[string]string
	MalwareScanStatus           map[string]string
	MalwareScanStatusTime       map[string]string
	SecretScanStatus            map[string]string
	SecretScanStatusTime        map[string]string
	NodeSeverity                map[string]string
	sync.RWMutex
}

func (st *Status) getNodeStatus() (map[string]string, map[string]string, map[string]string, map[string]string, map[string]string, map[string]string, map[string]string, map[string]string, map[string]string) {
	st.nodeStatus.RLock()
	nodeIdVulnerabilityStatusMap := st.nodeStatus.VulnerabilityScanStatus
	nodeIdVulnerabilityStatusTimeMap := st.nodeStatus.VulnerabilityScanStatusTime
	nodeIdComplianceStatusMap := st.nodeStatus.ComplianceScanStatus
	nodeIdComplianceStatusTimeMap := st.nodeStatus.ComplianceScanStatusTime
	nodeSeverityMap := st.nodeStatus.NodeSeverity
	nodeIdSecretStatusMap := st.nodeStatus.SecretScanStatus
	nodeIdSecretStatusTimeMap := st.nodeStatus.SecretScanStatusTime
	nodeIdMalwareStatusMap := st.nodeStatus.MalwareScanStatus
	nodeIdMalwareStatusTimeMap := st.nodeStatus.MalwareScanStatusTime
	st.nodeStatus.RUnlock()
	return nodeIdVulnerabilityStatusMap, nodeIdVulnerabilityStatusTimeMap, nodeIdComplianceStatusMap, nodeIdComplianceStatusTimeMap, nodeSeverityMap, nodeIdSecretStatusMap, nodeIdSecretStatusTimeMap, nodeIdMalwareStatusMap, nodeIdMalwareStatusTimeMap
}

func (st *Status) getNodeSeverity() (map[string]string, error) {
	nodeSeverity := make(map[string]string)
	redisConn := st.redisPool.Get()

	var nodeSeverityData map[string]NodeSeverityData
	nodeSeverityBytes, err := redisConn.Do("GET", nodeSeverityRedisKey)
	redisConn.Close()
	if err != nil || nodeSeverityBytes == nil {
		return nodeSeverity, err
	}
	switch nodeSeverityBytes.(type) {
	case []byte:
	default:
		return nodeSeverity, err
	}
	err = json.Unmarshal(nodeSeverityBytes.([]byte), &nodeSeverityData)
	if err != nil {
		return nodeSeverity, err
	}
	for hostName, severityData := range nodeSeverityData {
		nodeSeverity[hostName] = severityData.Severity
	}
	return nodeSeverity, nil
}

func (st *Status) updateScanStatusData() error {
	var err error
	// Node severity
	//nodeSeverity, err := st.getNodeSeverity()
	//if err != nil {
	//	logrus.Error(err.Error())
	//}
	//st.nodeStatus.Lock()
	//st.nodeStatus.NodeSeverity = nodeSeverity
	//st.nodeStatus.Unlock()

	var ok bool
	mSearch := elastic.NewMultiSearchService(st.esClient)

	nodeIdAggs := elastic.NewTermsAggregation().Field("node_id.keyword").Size(esAggsSize)
	statusAggs := elastic.NewTermsAggregation().Field("action.keyword").Size(50)
	recentTimestampAggs := elastic.NewMaxAggregation().Field("@timestamp")
	statusAggs.SubAggregation("scan_recent_timestamp", recentTimestampAggs)
	nodeIdAggs.SubAggregation("action", statusAggs)
	esQuery := elastic.NewSearchRequest().Index(cveScanLogsEsIndex).Query(elastic.NewMatchAllQuery()).Size(0).Aggregation("node_id", nodeIdAggs)
	mSearch.Add(esQuery)

	boolQuery := elastic.NewBoolQuery()
	nodeIdAggs = elastic.NewTermsAggregation().Field("node_id.keyword").Size(esAggsSize)
	checkTypeAggs := elastic.NewTermsAggregation().Field("compliance_check_type.keyword").Size(50)
	statusAggs = elastic.NewTermsAggregation().Field("scan_status.keyword").Size(50)
	recentTimestampAggs = elastic.NewMaxAggregation().Field("@timestamp")
	statusAggs.SubAggregation("scan_recent_timestamp", recentTimestampAggs)
	checkTypeAggs.SubAggregation("scan_status", statusAggs)
	nodeIdAggs.SubAggregation("compliance_check_type", checkTypeAggs)
	esQuery = elastic.NewSearchRequest().Index(complianceLogsEsIndex).Query(boolQuery).Size(0).Aggregation("node_id", nodeIdAggs)
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
		if nodeIdAggs.Key.(string) == "" {
			continue
		}
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
					latestScanTimeStr = strings.ReplaceAll(string(valueAsStr), "\"", "")
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
	st.nodeStatus.Lock()
	st.nodeStatus.VulnerabilityScanStatus = nodeIdVulnerabilityStatusMap
	st.nodeStatus.VulnerabilityScanStatusTime = nodeIdVulnerabilityStatusTimeMap
	st.nodeStatus.Unlock()

	nodeIdSecretStatusMap := make(map[string]string)
	nodeIdSecretStatusTimeMap := make(map[string]string)
	secretResp := mSearchResult.Responses[2]
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
	st.nodeStatus.Lock()
	st.nodeStatus.SecretScanStatus = nodeIdSecretStatusMap
	st.nodeStatus.SecretScanStatusTime = nodeIdSecretStatusTimeMap
	st.nodeStatus.Unlock()

	nodeIdMalwareStatusMap := make(map[string]string)
	nodeIdMalwareStatusTimeMap := make(map[string]string)
	malwareResp := mSearchResult.Responses[3]
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
	st.nodeStatus.Lock()
	st.nodeStatus.MalwareScanStatus = nodeIdMalwareStatusMap
	st.nodeStatus.MalwareScanStatusTime = nodeIdMalwareStatusTimeMap
	st.nodeStatus.Unlock()

	nodeIdComplianceStatusMap := make(map[string]string)
	nodeIdComplianceStatusTimeMap := make(map[string]string)
	complianceResp := mSearchResult.Responses[1]
	nodeIdAggsBkt, ok = complianceResp.Aggregations.Terms("node_id")
	if !ok {
		return nil
	}
	var summary string
	var completedCount, inProgressCount, errorCount int
	for _, nodeIdAggs := range nodeIdAggsBkt.Buckets {
		if nodeIdAggs.Key.(string) == "" {
			continue
		}
		nodeLatestScanTime := 0.0
		var nodeLatestScanTimeStr string
		complianceCheckTypeAggsBkt, ok := nodeIdAggs.Aggregations.Terms("compliance_check_type")
		if !ok {
			continue
		}
		summary = ""
		completedCount = 0
		inProgressCount = 0
		errorCount = 0
		for _, complianceCheckTypeAggs := range complianceCheckTypeAggsBkt.Buckets {
			latestScanTime := 0.0
			var latestStatus string
			scanStatusBkt, ok := complianceCheckTypeAggs.Aggregations.Terms("scan_status")
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
					if latestScanTime >= nodeLatestScanTime {
						nodeLatestScanTime = latestScanTime
						valueAsStr, ok := recentTimestampBkt.Aggregations["value_as_string"]
						if ok {
							nodeLatestScanTimeStr = strings.ReplaceAll(string(valueAsStr), "\"", "")
						}
					}
				}
			}
			if latestStatus == "QUEUED" || latestStatus == "INPROGRESS" || latestStatus == "SCAN_IN_PROGRESS" {
				inProgressCount += 1
			} else if latestStatus == "ERROR" {
				errorCount += 1
			} else if latestStatus == "COMPLETED" {
				completedCount += 1
			}
		}
		if inProgressCount > 0 {
			summary = formatComplianceStatus(inProgressCount, "in progress")
		} else if completedCount > 0 {
			summary = formatComplianceStatus(completedCount, "completed")
		} else if errorCount > 0 {
			summary = formatComplianceStatus(errorCount, "failed")
		}
		if summary == "" {
			summary = "Never Scanned"
		}
		nodeIdComplianceStatusMap[nodeIdAggs.Key.(string)] = summary
		nodeIdComplianceStatusTimeMap[nodeIdAggs.Key.(string)] = nodeLatestScanTimeStr
	}
	st.nodeStatus.Lock()
	st.nodeStatus.ComplianceScanStatus = nodeIdComplianceStatusMap
	st.nodeStatus.ComplianceScanStatusTime = nodeIdComplianceStatusTimeMap
	st.nodeStatus.Unlock()
	return nil
}

func formatComplianceStatus(count int, status string) string {
	if count > 1 {
		return fmt.Sprintf("%d scans %s", count, status)
	} else {
		return fmt.Sprintf("%d scan %s", count, status)
	}
}

func NewStatus() (*Status, error) {
	var esClient *elastic.Client
	var err error

	statusMap = map[string]string{
		"QUEUED": "queued", "STARTED": "in_progress", "SCAN_IN_PROGRESS": "in_progress", "WARN": "in_progress",
		"COMPLETED": "complete", "ERROR": "error", "STOPPED": "error", "GENERATING_SBOM": "in_progress",
		"GENERATED_SBOM": "in_progress", "IN_PROGRESS": "in_progress", "COMPLETE": "complete"}

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

	var status Status

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
		return &status, err
	}
	status.esClient = esClient
	status.redisPool, _ = redisCache.NewRedisPool()
	if status.redisPool == nil {
		return nil, errors.New("could not create redis pool connection")
	}
	return &status, nil
}

func getScanStatus() error {
	var err error
	nStatus, err = NewStatus()
	if err != nil {
		return err
	}
	err = nStatus.updateScanStatusData()
	if err != nil {
		return err
	}
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			err = nStatus.updateScanStatusData()
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func init() {
	customerUniqueId := os.Getenv("CUSTOMER_UNIQUE_ID")
	if customerUniqueId != "" {
		cveScanLogsEsIndex += fmt.Sprintf("-%s", customerUniqueId)
		complianceLogsEsIndex += fmt.Sprintf("-%s", customerUniqueId)
		secretScanLogsEsIndex += fmt.Sprintf("-%s", customerUniqueId)
		malwareScanLogsEsIndex += fmt.Sprintf("-%s", customerUniqueId)
	}

	if os.Getenv("DF_PROG_NAME") == "topology" {
		go func() {
			for {
				err := getScanStatus()
				if err != nil {
					logrus.Error(err.Error())
				}
				time.Sleep(30 * time.Second)
			}
		}()
	}
}

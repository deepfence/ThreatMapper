package model

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const PostureProviderAWS = "aws"
const PostureProviderAWSOrg = "aws_org"
const PostureProviderGCP = "gcp"
const PostureProviderGCPOrg = "gcp_org"
const PostureProviderAzure = "azure"
const PostureProviderLinux = "linux"
const PostureProviderKubernetes = "kubernetes"

var SupportedPostureProviders = []string{PostureProviderAWS, PostureProviderAWSOrg, PostureProviderGCP, PostureProviderGCPOrg,
	PostureProviderAzure, PostureProviderLinux, PostureProviderKubernetes}

type CloudNodeAccountRegisterReq struct {
	NodeId              string            `json:"node_id" required:"true"`
	CloudAccount        string            `json:"cloud_account" required:"true"`
	CloudProvider       string            `json:"cloud_provider" required:"true"  enum:"aws,gcp,azure"`
	MonitoredAccountIds map[string]string `json:"monitored_account_ids"`
	OrgAccountId        string            `json:"org_acc_id"`
	Version             string            `json:"version"`
}

type CloudNodeAccountRegisterResp struct {
	Data CloudNodeAccountRegisterRespData `json:"data"`
}

type CloudNodeAccountRegisterRespData struct {
	Scans            map[string]CloudComplianceScanDetails `json:"scans"`
	CloudtrailTrails []CloudNodeCloudtrailTrail            `json:"cloudtrail_trails"`
	Refresh          string                                `json:"refresh"`
}

type CloudNodeAccountsListReq struct {
	CloudProvider string      `json:"cloud_provider"`
	Window        FetchWindow `json:"window" required:"true"`
}

type CloudNodeProvidersListReq struct{}

type CloudNodeProvidersListResp struct {
	Providers []PostureProvider `json:"providers" required:"true"`
}

type CloudNodeAccountsListResp struct {
	CloudNodeAccountInfo []CloudNodeAccountInfo `json:"cloud_node_accounts_info" required:"true"`
	Total                int                    `json:"total" required:"true"`
}

type CloudNodeAccountInfo struct {
	NodeId               string  `json:"node_id"`
	NodeName             string  `json:"node_name"`
	CloudProvider        string  `json:"cloud_provider"`
	CompliancePercentage float64 `json:"compliance_percentage"`
	Active               bool    `json:"active"`
	LastScanId           string  `json:"last_scan_id"`
	LastScanStatus       string  `json:"last_scan_status"`
	Version              string  `json:"version"`
}

func (v CloudNodeAccountInfo) NodeType() string {
	switch v.CloudProvider {
	case PostureProviderKubernetes:
		return utils.NodeTypeKubernetesCluster
	case PostureProviderLinux:
		return utils.NodeTypeHost
	}
	return utils.NodeTypeCloudNode
}

func (CloudNodeAccountInfo) ExtendedField() string {
	return ""
}

func (v CloudNodeAccountInfo) ScanType() utils.Neo4jScanType {
	switch v.CloudProvider {
	case PostureProviderAWS, PostureProviderGCP, PostureProviderAzure, PostureProviderAWSOrg:
		return utils.NEO4J_CLOUD_COMPLIANCE_SCAN
	case PostureProviderKubernetes, PostureProviderLinux:
		return utils.NEO4J_COMPLIANCE_SCAN
	default:
		return utils.NEO4J_CLOUD_COMPLIANCE_SCAN
	}
}

func (v CloudNodeAccountInfo) ScanResultType() string {
	switch v.CloudProvider {
	case PostureProviderAWS, PostureProviderGCP, PostureProviderAzure, PostureProviderAWSOrg:
		return "CloudCompliance"
	case PostureProviderKubernetes, PostureProviderLinux:
		return "Compliance"
	default:
		return "CloudCompliance"
	}
}

func (v CloudNodeAccountInfo) GetPassStatus() []string {
	switch v.CloudProvider {
	case PostureProviderAWS, PostureProviderGCP, PostureProviderAzure, PostureProviderAWSOrg, PostureProviderKubernetes:
		return []string{"ok", "info", "skip"}
	case PostureProviderLinux:
		return []string{"warn", "pass"}
	default:
		return []string{"skip", "ok", "info", "pass", "warn"}
	}
}

func (v CloudNodeAccountInfo) GetCategory() string {
	return v.CloudProvider
}

func (CloudNodeAccountInfo) GetJsonCategory() string {
	return "cloud_provider"
}

type CloudComplianceBenchmark struct {
	Id             string   `json:"id"`
	ComplianceType string   `json:"compliance_type"`
	Controls       []string `json:"controls"`
}

type CloudComplianceScanDetails struct {
	ScanId     string                     `json:"scan_id"`
	ScanTypes  []string                   `json:"scan_types"`
	AccountId  string                     `json:"account_id"`
	Benchmarks []CloudComplianceBenchmark `json:"benchmarks"`
}

type CloudNodeCloudtrailTrail struct {
	AccountId string `json:"account_id"`
	TrailName string `json:"trail_name"`
}

type PendingCloudComplianceScan struct {
	ScanId    string   `json:"scan_id"`
	ScanType  string   `json:"scan_type"`
	Controls  []string `json:"controls"`
	AccountId string   `json:"account_id"`
}

type CloudNodeControlReq struct {
	NodeId         string `json:"node_id"`
	CloudProvider  string `json:"cloud_provider" required:"true" enum:"aws,gcp,azure"`
	ComplianceType string `json:"compliance_type" required:"true"`
}

type CloudNodeEnableDisableReq struct {
	NodeId      string   `json:"node_id"`
	ControlsIds []string `json:"control_ids"`
}

type CloudNodeControlResp struct {
	Controls []CloudNodeComplianceControl `json:"controls"`
}

type CloudNodeComplianceControl struct {
	ControlId         string   `json:"control_id"`
	Title             string   `json:"title"`
	Description       string   `json:"description"`
	Service           string   `json:"service"`
	CategoryHierarchy []string `json:"category_hierarchy"`
	Enabled           bool     `json:"enabled"`
}

type PostureProvider struct {
	Name                 string  `json:"name"`
	NodeCount            int64   `json:"node_count"`
	NodeCountInactive    int64   `json:"node_count_inactive"`
	NodeLabel            string  `json:"node_label"`
	ScanCount            int64   `json:"scan_count"`
	CompliancePercentage float64 `json:"compliance_percentage"`
	ResourceCount        int64   `json:"resource_count"`
}

func UpsertCloudComplianceNode(ctx context.Context, nodeDetails map[string]interface{}, parentNodeId string) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	if parentNodeId == "" {
		if _, err := tx.Run(`
			WITH $param as row
			MERGE (n:CloudNode{node_id:row.node_id})
			SET n+= row, n.active = true, n.updated_at = TIMESTAMP(), n.version = row.version`,
			map[string]interface{}{
				"param": nodeDetails,
			}); err != nil {
			return err
		}
	} else {
		if _, err := tx.Run(`
			MERGE (m:CloudNode{node_id: $parent_node_id})
			WITH $param as row, m
			MERGE (n:CloudNode{node_id:row.node_id})
			MERGE (m) -[:IS_CHILD]-> (n)
			SET n+= row, n.active = true, n.updated_at = TIMESTAMP(), n.version = row.version`,
			map[string]interface{}{
				"param":          nodeDetails,
				"parent_node_id": parentNodeId,
			}); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func GetCloudProvidersList(ctx context.Context) ([]PostureProvider, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return nil, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return nil, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return nil, err
	}
	defer tx.Close()

	var postureProvidersCache []PostureProvider
	rdb, err := directory.RedisClient(ctx)
	if err == nil {
		postureProvidersStr, err := rdb.Get(ctx, constants.RedisKeyPostureProviders).Result()
		if err == nil {
			json.Unmarshal([]byte(postureProvidersStr), &postureProvidersCache)
		} else {
			log.Warn().Msgf("GetCloudProvidersList redis : %v", err)
		}
	} else {
		log.Warn().Msgf("GetCloudProvidersList redis : %v", err)
	}

	postureProviders := []PostureProvider{
		{Name: PostureProviderAWS, NodeLabel: "Accounts"},
		{Name: PostureProviderAWSOrg, NodeLabel: "Organizations"},
		{Name: PostureProviderGCP, NodeLabel: "Accounts"},
		{Name: PostureProviderGCPOrg, NodeLabel: "Organizations"},
		{Name: PostureProviderAzure, NodeLabel: "Accounts"},
		{Name: PostureProviderLinux, NodeLabel: "Hosts"},
		{Name: PostureProviderKubernetes, NodeLabel: "Clusters"},
	}
	providersIndex := make(map[string]int)
	for i, provider := range postureProviders {
		providersIndex[provider.Name] = i
	}
	for _, postureProvider := range postureProvidersCache {
		postureProviders[providersIndex[postureProvider.Name]] = postureProvider
	}

	// Hosts
	query := `MATCH (m:Node)
			WHERE m.pseudo=false and m.kubernetes_cluster_id=""
			RETURN m.active, count(m)`
	r, err := tx.Run(query, map[string]interface{}{})
	if err == nil {
		records, err := r.Collect()
		if err == nil {
			for _, record := range records {
				if record.Values[0].(bool) == true {
					postureProviders[providersIndex[PostureProviderLinux]].NodeCount = record.Values[1].(int64)
				} else {
					postureProviders[providersIndex[PostureProviderLinux]].NodeCountInactive = record.Values[1].(int64)
				}
			}
		}
	} else {
		log.Warn().Msgf("GetCloudProvidersList Linux : %v", err)
	}

	// Kubernetes
	query = `MATCH (m:KubernetesCluster)
			WHERE m.pseudo=false
			RETURN m.active, count(m)`
	r, err = tx.Run(query, map[string]interface{}{})
	if err == nil {
		records, err := r.Collect()
		if err == nil {
			for _, record := range records {
				if record.Values[0].(bool) == true {
					postureProviders[providersIndex[PostureProviderKubernetes]].NodeCount = record.Values[1].(int64)
				} else {
					postureProviders[providersIndex[PostureProviderKubernetes]].NodeCountInactive = record.Values[1].(int64)
				}
			}
		}
	} else {
		log.Warn().Msgf("GetCloudProvidersList Kubernetes : %v", err)
	}

	// CloudNodes
	query = `MATCH (m:CloudNode)
			RETURN m.cloud_provider, m.active, count(m)`
	r, err = tx.Run(query, map[string]interface{}{})
	if err == nil {
		records, err := r.Collect()
		if err == nil {
			for _, record := range records {
				provider := record.Values[0].(string)
				if record.Values[1].(bool) == true {
					postureProviders[providersIndex[provider]].NodeCount = record.Values[2].(int64)
				} else {
					postureProviders[providersIndex[provider]].NodeCountInactive = record.Values[2].(int64)
				}
			}
		}
	} else {
		log.Warn().Msgf("GetCloudProvidersList CloudNode : %v", err)
	}
	return postureProviders, nil
}

func GetCloudComplianceNodesList(ctx context.Context, cloudProvider string, fw FetchWindow) (CloudNodeAccountsListResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}
	defer tx.Close()

	isOrgListing := false
	neo4jNodeType := "CloudNode"
	passStatus := []string{"ok", "info", "skip"}
	scanType := utils.NEO4J_CLOUD_COMPLIANCE_SCAN
	if cloudProvider == PostureProviderAWSOrg {
		cloudProvider = PostureProviderAWS
		isOrgListing = true
	} else if cloudProvider == PostureProviderGCPOrg {
		cloudProvider = PostureProviderGCP
		isOrgListing = true
	} else if cloudProvider == PostureProviderKubernetes {
		neo4jNodeType = "KubernetesCluster"
	} else if cloudProvider == PostureProviderLinux {
		neo4jNodeType = "Node"
		passStatus = []string{"warn", "pass"}
	}
	var res neo4j.Result
	if isOrgListing {
		res, err = tx.Run(fmt.Sprintf(`
		MATCH (m:%s{cloud_provider:$cloud_provider+'_org'}) -[:IS_CHILD]-> (n:%s{cloud_provider: $cloud_provider})
		WITH DISTINCT m.node_id AS node_id, m.node_name AS node_name, m.updated_at AS updated_at, m.active AS active
		UNWIND node_id AS x
		OPTIONAL MATCH (m:%s{cloud_provider:$cloud_provider+'_org', node_id: x}) -[:IS_CHILD]-> (n:%s{cloud_provider: $cloud_provider})<-[:SCANNED]-(s:%s)-[:DETECTED]->(c:CloudCompliance)
		WITH x, node_name, updated_at, COUNT(c) AS total_compliance_count, active
		OPTIONAL MATCH (m:%s{cloud_provider:$cloud_provider+'_org', node_id: x}) -[:IS_CHILD]-> (n:%s{cloud_provider: $cloud_provider})<-[:SCANNED]-(s:%s)-[:DETECTED]->(c1:CloudCompliance)
		WHERE c1.status IN $pass_status
		WITH x, node_name, $cloud_provider+'_org' AS cloud_provider, CASE WHEN total_compliance_count = 0 THEN 0.0 ELSE COUNT(c1.status)*100.0/total_compliance_count END AS compliance_percentage, updated_at, active
		CALL {
			WITH x
			OPTIONAL MATCH (m:%s{cloud_provider:$cloud_provider+'_org', node_id: x}) -[:IS_CHILD]-> (n:%s{cloud_provider: $cloud_provider})<-[:SCANNED]-(s1:%s)
			RETURN s1.node_id AS last_scan_id, s1.status AS last_scan_status
			ORDER BY s1.updated_at DESC LIMIT 1
		}
		RETURN  x, node_name, cloud_provider, compliance_percentage, active, updated_at, COALESCE(last_scan_id, ''), COALESCE(last_scan_status, '')
		ORDER BY updated_at`, neo4jNodeType, neo4jNodeType, neo4jNodeType, neo4jNodeType, scanType, neo4jNodeType,
			neo4jNodeType, scanType, neo4jNodeType, scanType, utils.NodeTypeCloudNode)+fw.FetchWindow2CypherQuery(),
			map[string]interface{}{"cloud_provider": cloudProvider, "pass_status": passStatus})
		if err != nil {
			return CloudNodeAccountsListResp{Total: 0}, err
		}
	} else if cloudProvider == PostureProviderKubernetes || cloudProvider == PostureProviderLinux {
		scanType = utils.NEO4J_COMPLIANCE_SCAN
		nonKubeFilter := ""
		if cloudProvider == PostureProviderLinux {
			nonKubeFilter = "{kubernetes_cluster_id:''}"
		}
		res, err = tx.Run(fmt.Sprintf(`
		MATCH (n:%s%s)
		WHERE n.pseudo=false
		WITH n.node_id AS node_id, n.node_name AS node_name, n.updated_at AS updated_at, n.active AS active
		UNWIND node_id AS x
		OPTIONAL MATCH (n:%s{node_id: x})<-[:SCANNED]-(s:%s)-[:DETECTED]->(c:Compliance)
		WITH x, node_name, updated_at, COUNT(c) AS total_compliance_count, active
		OPTIONAL MATCH (n:%s{node_id: x})<-[:SCANNED]-(s:%s)-[:DETECTED]->(c1:Compliance)
		WHERE c1.status IN $pass_status
		WITH x, node_name, CASE WHEN total_compliance_count = 0 THEN 0.0 ELSE COUNT(c1.status)*100.0/total_compliance_count END AS compliance_percentage, updated_at, active
		CALL {
			WITH x
			OPTIONAL MATCH (n:%s{node_id: x})<-[:SCANNED]-(s1:%s)
			RETURN s1.node_id AS last_scan_id, s1.status AS last_scan_status
			ORDER BY s1.updated_at DESC LIMIT 1
		}
		RETURN x, node_name, $cloud_provider, compliance_percentage, active, updated_at, COALESCE(last_scan_id, ''), COALESCE(last_scan_status, '')
		ORDER BY updated_at`, neo4jNodeType, nonKubeFilter, neo4jNodeType, scanType, neo4jNodeType, scanType, neo4jNodeType, scanType)+fw.FetchWindow2CypherQuery(),
			map[string]interface{}{
				"cloud_provider": cloudProvider,
				"pass_status":    passStatus,
			})
		if err != nil {
			return CloudNodeAccountsListResp{Total: 0}, err
		}
	} else {
		res, err = tx.Run(fmt.Sprintf(`
		MATCH (n:%s{cloud_provider: $cloud_provider}) 
		WITH n.node_id AS node_id, n.node_name AS node_name, n.cloud_provider AS cloud_provider, n.updated_at AS updated_at, n.active AS active
		UNWIND node_id AS x
		OPTIONAL MATCH (n:%s{cloud_provider: $cloud_provider, node_id: x})<-[:SCANNED]-(s:%s)-[:DETECTED]->(c:CloudCompliance)
		WITH x, node_name, cloud_provider, updated_at, COUNT(c) AS total_compliance_count, active
		OPTIONAL MATCH (n:%s{cloud_provider: $cloud_provider, node_id: x})<-[:SCANNED]-(s:%s)-[:DETECTED]->(c1:CloudCompliance)
		WHERE c1.status IN $pass_status
		WITH x, node_name, cloud_provider, CASE WHEN total_compliance_count = 0 THEN 0.0 ELSE COUNT(c1.status)*100.0/total_compliance_count END AS compliance_percentage, updated_at, active
		CALL {
			WITH x
			OPTIONAL MATCH (n:%s{cloud_provider: $cloud_provider, node_id: x})<-[:SCANNED]-(s1:%s)
			RETURN s1.node_id AS last_scan_id, s1.status AS last_scan_status
			ORDER BY s1.updated_at DESC LIMIT 1
		}
		RETURN x, node_name, cloud_provider, compliance_percentage, active, updated_at, COALESCE(last_scan_id, ''), COALESCE(last_scan_status, '')
		ORDER BY updated_at`, neo4jNodeType, neo4jNodeType, scanType, neo4jNodeType, scanType, neo4jNodeType, scanType)+fw.FetchWindow2CypherQuery(),
			map[string]interface{}{
				"cloud_provider": cloudProvider,
				"pass_status":    passStatus,
			})
		if err != nil {
			return CloudNodeAccountsListResp{Total: 0}, err
		}
	}

	recs, err := res.Collect()
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}

	cloud_node_accounts_info := []CloudNodeAccountInfo{}
	for _, rec := range recs {
		tmp := CloudNodeAccountInfo{
			NodeId:               rec.Values[0].(string),
			NodeName:             rec.Values[1].(string),
			CloudProvider:        rec.Values[2].(string),
			CompliancePercentage: rec.Values[3].(float64),
			Active:               rec.Values[4].(bool),
			LastScanId:           rec.Values[6].(string),
			LastScanStatus:       rec.Values[7].(string),
		}
		cloud_node_accounts_info = append(cloud_node_accounts_info, tmp)
	}

	total := fw.Offset + len(cloud_node_accounts_info)
	var countRes neo4j.Result
	if isOrgListing {
		countRes, err = tx.Run(`
		MATCH (m:CloudNode) -[:IS_CHILD]-> (n:CloudNode{cloud_provider: $cloud_provider})
		RETURN COUNT(m)`,
			map[string]interface{}{"cloud_provider": cloudProvider})
	} else {
		countRes, err = tx.Run(fmt.Sprintf(`
		MATCH (n:%s {cloud_provider: $cloud_provider})
		RETURN COUNT(*)`, neo4jNodeType),
			map[string]interface{}{"cloud_provider": cloudProvider})
	}

	countRec, err := countRes.Single()
	if err != nil {
		return CloudNodeAccountsListResp{CloudNodeAccountInfo: cloud_node_accounts_info, Total: total}, nil
	}

	total = int(countRec.Values[0].(int64))

	return CloudNodeAccountsListResp{CloudNodeAccountInfo: cloud_node_accounts_info, Total: total}, nil
}

func GetActiveCloudControls(ctx context.Context, complianceTypes []string, cloudProvider string) ([]CloudComplianceBenchmark, error) {
	var benchmarks []CloudComplianceBenchmark
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return benchmarks, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return benchmarks, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return benchmarks, err
	}
	defer tx.Close()

	var res neo4j.Result
	res, err = tx.Run(`
		MATCH (n:CloudComplianceBenchmark) -[:INCLUDES]-> (m:CloudComplianceControl)
		WHERE m.active = true 
		AND m.compliance_type IN $compliance_types
		AND n.cloud_provider = $cloud_provider
		RETURN  n.benchmark_id, n.compliance_type, collect(m.control_id)
		ORDER BY n.compliance_type`,
		map[string]interface{}{
			"cloud_provider":   cloudProvider,
			"compliance_types": complianceTypes,
		})
	if err != nil {
		return benchmarks, err
	}

	recs, err := res.Collect()
	if err != nil {
		return benchmarks, err
	}

	for _, rec := range recs {
		var controls []string
		for _, rVal := range rec.Values[2].([]interface{}) {
			controls = append(controls, rVal.(string))
		}
		benchmark := CloudComplianceBenchmark{
			Id:             rec.Values[0].(string),
			ComplianceType: rec.Values[1].(string),
			Controls:       controls,
		}
		benchmarks = append(benchmarks, benchmark)
	}

	return benchmarks, nil
}

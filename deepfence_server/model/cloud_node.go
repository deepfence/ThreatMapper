package model

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"k8s.io/utils/strings/slices"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	PostureProviderAWS        = "aws"
	PostureProviderAWSOrg     = "aws_org"
	PostureProviderGCP        = "gcp"
	PostureProviderGCPOrg     = "gcp_org"
	PostureProviderAzure      = "azure"
	PostureProviderAzureOrg   = "azure_org"
	PostureProviderLinux      = "linux"
	PostureProviderKubernetes = "kubernetes"
)

var (
	PostureProviderOrgMap = map[string]string{
		PostureProviderAWS:   PostureProviderAWSOrg,
		PostureProviderGCP:   PostureProviderGCPOrg,
		PostureProviderAzure: PostureProviderAzureOrg,
	}
)

var SupportedPostureProviders = []string{PostureProviderAWS, PostureProviderGCP,
	PostureProviderAzure, PostureProviderLinux, PostureProviderKubernetes}

type CloudNodeMonitoredAccount struct {
	NodeID      string `json:"node_id" validate:"required" required:"true"`
	AccountName string `json:"account_name"`
	AccountID   string `json:"account_id" validate:"required" required:"true"`
}

type CloudNodeAccountRegisterReq struct {
	NodeID                    string                      `json:"node_id" validate:"required" required:"true"`
	AccountName               string                      `json:"account_name"`
	HostNodeID                string                      `json:"host_node_id" validate:"required" required:"true"`
	AccountID                 string                      `json:"account_id" validate:"required" required:"true"`
	CloudProvider             string                      `json:"cloud_provider" validate:"required,oneof=aws gcp azure" enum:"aws,gcp,azure" required:"true"`
	IsOrganizationDeployment  bool                        `json:"is_organization_deployment"`
	MonitoredAccounts         []CloudNodeMonitoredAccount `json:"monitored_accounts"`
	OrganizationAccountID     string                      `json:"organization_account_id"`
	Version                   string                      `json:"version" validate:"required" required:"true"`
	PersistentVolumeSupported bool                        `json:"persistent_volume_supported"`
	InstallationID            string                      `json:"installation_id" validate:"required" required:"true"`
	InitialRequest            bool                        `json:"initial_request"`
}

type CloudNodeAccountsListReq struct {
	CloudProvider string      `json:"cloud_provider" enum:"aws,gcp,azure,linux,kubernetes,aws_org,gcp_org,azure_org" required:"true"`
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
	NodeID               string           `json:"node_id"`
	NodeName             string           `json:"node_name"`
	AccountName          string           `json:"account_name"`
	CloudProvider        string           `json:"cloud_provider" enum:"aws,gcp,azure,aws_org,gcp_org,azure_org"`
	CompliancePercentage float64          `json:"compliance_percentage"`
	Active               bool             `json:"active"`
	LastScanID           string           `json:"last_scan_id"`
	LastScanStatus       string           `json:"last_scan_status"`
	RefreshMessage       string           `json:"refresh_message"`
	RefreshMetadata      string           `json:"refresh_metadata"`
	RefreshStatus        string           `json:"refresh_status"`
	RefreshStatusMap     map[string]int64 `json:"refresh_status_map"`
	ScanStatusMap        map[string]int64 `json:"scan_status_map"`
	Version              string           `json:"version"`
	HostNodeID           string           `json:"host_node_id"`
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

func (v CloudNodeAccountInfo) id() string {
	return v.NodeID
}

func (v CloudNodeAccountInfo) ScanType() utils.Neo4jScanType {
	switch v.CloudProvider {
	case PostureProviderAWS, PostureProviderGCP, PostureProviderAzure, PostureProviderAWSOrg, PostureProviderGCPOrg, PostureProviderAzureOrg:
		return utils.NEO4JCloudComplianceScan
	case PostureProviderKubernetes, PostureProviderLinux:
		return utils.NEO4JComplianceScan
	default:
		return utils.NEO4JCloudComplianceScan
	}
}

func (v CloudNodeAccountInfo) LatestScanIDField() string {
	return ingesters.LatestScanIDField[v.ScanType()]
}

func (v CloudNodeAccountInfo) ScanResultType() string {
	switch v.CloudProvider {
	case PostureProviderAWS, PostureProviderGCP, PostureProviderAzure, PostureProviderAWSOrg, PostureProviderGCPOrg, PostureProviderAzureOrg:
		return "CloudCompliance"
	case PostureProviderKubernetes, PostureProviderLinux:
		return "Compliance"
	default:
		return "CloudCompliance"
	}
}

func (v CloudNodeAccountInfo) GetPassStatus() []string {
	switch v.CloudProvider {
	case PostureProviderAWS, PostureProviderGCP, PostureProviderAzure, PostureProviderAWSOrg, PostureProviderGCPOrg, PostureProviderAzureOrg, PostureProviderKubernetes:
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

func (CloudNodeAccountInfo) GetJSONCategory() string {
	return "cloud_provider"
}

type CloudComplianceScanDetails struct {
	ScanID        string                             `json:"scan_id"`
	ScanTypes     []string                           `json:"scan_types"`
	AccountID     string                             `json:"account_id"`
	Benchmarks    []ctl.CloudComplianceScanBenchmark `json:"benchmarks"`
	StopRequested bool                               `json:"stop_requested"`
}

type PendingCloudComplianceScan struct {
	ScanID    string   `json:"scan_id"`
	ScanType  string   `json:"scan_type"`
	Controls  []string `json:"controls"`
	AccountID string   `json:"account_id"`
}

type CloudNodeControlReq struct {
	NodeID         string `json:"node_id"`
	CloudProvider  string `json:"cloud_provider" required:"true" enum:"aws,gcp,azure,linux,kubernetes"`
	ComplianceType string `json:"compliance_type" enum:"hipaa,gdpr,pci,nist,cis,soc_2,nsa-cisa,aws_foundational_security" required:"true"`
}

type CloudNodeEnableDisableReq struct {
	NodeID      string   `json:"node_id"`
	ControlsIDs []string `json:"control_ids"`
}

type CloudNodeControlResp struct {
	Controls []CloudNodeComplianceControl `json:"controls"`
}

type CloudNodeComplianceControl struct {
	NodeID                 string   `json:"node_id"`
	Title                  string   `json:"title"`
	Description            string   `json:"description"`
	Service                string   `json:"service"`
	CategoryHierarchy      []string `json:"category_hierarchy"`
	CategoryHierarchyShort string   `json:"category_hierarchy_short"`
	ControlID              string   `json:"control_id"`
	Enabled                bool     `json:"enabled"`
	ComplianceType         string   `json:"compliance_type"`
	ProblemTitle           string   `json:"problem_title"`
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

func UpsertCloudAccount(ctx context.Context, nodeDetails map[string]interface{}, isOrganizationDeployment bool, hostNodeID string, initialRequest bool) error {

	ctx, span := telemetry.NewSpan(ctx, "model", "upsert-cloud-compliance-node")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	var setRefreshStatusQuery string
	var scheduleRefreshStatusQuery string
	// Organization account node does not have refresh status. It is rather an aggregation of all child account statuses.
	if !isOrganizationDeployment {
		setRefreshStatusQuery = `ON CREATE SET n.refresh_status = '` + utils.ScanStatusStarting + `', n.refresh_message = '', n.refresh_metadata = ''`

		if initialRequest {
			session2 := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
			defer session2.Close(ctx)

			tx2, err := session2.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
			if err != nil {
				return err
			}
			defer tx2.Close(ctx)

			res, err := tx2.Run(ctx,
				`MATCH (n:CloudNode{node_id:$node_id}) RETURN coalesce(n.installation_id,''), coalesce(n.refresh_status,'')`,
				map[string]interface{}{"node_id": nodeDetails["node_id"]})
			if err != nil {
				return err
			}
			rec, err := res.Single(ctx)
			// ON CREATE will handle if Node does not exist
			if err == nil {
				if rec.Values[0].(string) != nodeDetails["installation_id"] {
					scheduleRefreshStatusQuery = `, n.refresh_status = '` + utils.ScanStatusStarting + `', n.refresh_message = '', n.refresh_metadata = ''`
				} else if rec.Values[1].(string) == utils.ScanStatusInProgress {
					// Make it STARTING so that cloud scanner control request will pick it and continue
					scheduleRefreshStatusQuery = `, n.refresh_status = '` + utils.ScanStatusStarting + `'`
				}
			}
		}
	}

	if _, err = tx.Run(ctx, `
		MERGE (r:Node{node_id:$host_node_id, node_type: "cloud_agent"})
		WITH $param as row, r
		MERGE (n:CloudNode{node_id:row.node_id})
		`+setRefreshStatusQuery+`
		MERGE (r) -[:HOSTS]-> (n)
		SET n+= row, n.active = true, n.updated_at = TIMESTAMP(), n.version = row.version, r.node_name = $host_node_id, 
	    r.active = true, r.agent_running = true, r.updated_at = TIMESTAMP()`+scheduleRefreshStatusQuery,
		map[string]interface{}{
			"param":        nodeDetails,
			"host_node_id": hostNodeID,
		}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func UpsertChildCloudAccounts(ctx context.Context, nodeDetails []map[string]interface{}, parentNodeID string, installationID string, hostNodeID string, initialRequest bool) error {
	ctx, span := telemetry.NewSpan(ctx, "model", "upsert-cloud-compliance-node")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	accountIDRefreshStatusMap := make(map[string]map[string]string)
	if initialRequest {
		session2 := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
		defer session2.Close(ctx)

		tx2, err := session2.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
		if err != nil {
			return err
		}
		defer tx2.Close(ctx)

		res, err := tx2.Run(ctx,
			`MATCH (m:CloudNode{node_id:$node_id}) -[:IS_CHILD]-> (n:CloudNode)
					RETURN coalesce(n.node_name,''), coalesce(n.installation_id,''), coalesce(n.refresh_status,'')`,
			map[string]interface{}{"node_id": parentNodeID})
		if err != nil {
			return err
		}
		recs, err := res.Collect(ctx)
		if err != nil {
			return err
		}
		for _, rec := range recs {
			accountID := rec.Values[0].(string)
			if rec.Values[1].(string) != installationID {
				accountIDRefreshStatusMap[accountID] = map[string]string{
					"refresh_status": utils.ScanStatusStarting, "refresh_message": "", "refresh_metadata": ""}
			} else if rec.Values[2].(string) == utils.ScanStatusInProgress {
				// Make it STARTING so that cloud scanner control request will pick it and continue
				accountIDRefreshStatusMap[accountID] = map[string]string{"refresh_status": utils.ScanStatusStarting}
			}
		}
	}

	for i, nodeDetail := range nodeDetails {
		if refreshStatus, ok := accountIDRefreshStatusMap[nodeDetail["node_name"].(string)]; ok {
			for k, v := range refreshStatus {
				nodeDetails[i][k] = v
			}
		}
	}

	if _, err = tx.Run(ctx, `
			MERGE (r:Node{node_id:$host_node_id, node_type: "cloud_agent"})
			MERGE (m:CloudNode{node_id: $parent_node_id})
			WITH r, m
			UNWIND $param as row
			MERGE (n:CloudNode{node_id:row.node_id})
			ON CREATE SET n.refresh_status = '`+utils.ScanStatusStarting+`', n.refresh_message = '', n.refresh_metadata = ''
			MERGE (m) -[:IS_CHILD]-> (n)
			MERGE (r) -[:HOSTS]-> (n)
			SET n+= row, n.active = true, n.updated_at = TIMESTAMP(), n.version = row.version, r.active = true,
			r.agent_running=true, r.updated_at = TIMESTAMP()`,
		map[string]interface{}{
			"param":          nodeDetails,
			"parent_node_id": parentNodeID,
			"host_node_id":   hostNodeID,
		}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func getPostureProviderCache(ctx context.Context) []PostureProvider {

	var postureProvidersCache []PostureProvider
	rdb, err := directory.RedisClient(ctx)
	if err != nil {
		log.Error().Msgf("GetCloudProvidersList redis : %v", err)
		return postureProvidersCache
	}
	postureProvidersStr, err := rdb.Get(ctx, constants.RedisKeyPostureProviders).Result()
	if err != nil {
		log.Error().Msgf("GetCloudProvidersList redis : %v", err)
		return postureProvidersCache
	}
	err = json.Unmarshal([]byte(postureProvidersStr), &postureProvidersCache)
	if err != nil {
		log.Error().Msgf("GetCloudProvidersList redis : %v", err)
	}
	return postureProvidersCache
}

func GetCloudProvidersList(ctx context.Context) ([]PostureProvider, error) {

	ctx, span := telemetry.NewSpan(ctx, "model", "get-cloud-providers-list")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return nil, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return nil, err
	}
	defer tx.Close(ctx)

	postureProvidersCache := getPostureProviderCache(ctx)

	postureProviders := []PostureProvider{
		{Name: PostureProviderAWS, NodeLabel: "Accounts"},
		// {Name: PostureProviderAWSOrg, NodeLabel: "Organizations"},
		{Name: PostureProviderGCP, NodeLabel: "Accounts"},
		// {Name: PostureProviderGCPOrg, NodeLabel: "Organizations"},
		{Name: PostureProviderAzure, NodeLabel: "Accounts"},
		// {Name: PostureProviderAzureOrg, NodeLabel: "Organizations"},
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
			WHERE m.pseudo=false and m.agent_running=true
			RETURN m.active, count(m)`
	r, err := tx.Run(ctx, query, map[string]interface{}{})
	if err == nil {
		records, err := r.Collect(ctx)
		if err == nil {
			for _, record := range records {
				if record.Values[0].(bool) {
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
			WHERE m.pseudo=false and m.agent_running=true
			RETURN m.active, count(m)`
	r, err = tx.Run(ctx, query, map[string]interface{}{})
	if err == nil {
		records, err := r.Collect(ctx)
		if err == nil {
			for _, record := range records {
				if record.Values[0].(bool) {
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
	r, err = tx.Run(ctx, query, map[string]interface{}{})
	if err == nil {
		records, err := r.Collect(ctx)
		if err == nil {
			for _, record := range records {
				provider := record.Values[0].(string)
				if slices.Contains([]string{PostureProviderAWSOrg, PostureProviderGCPOrg, PostureProviderAzureOrg}, provider) {
					continue
				}
				if record.Values[1].(bool) {
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

	ctx, span := telemetry.NewSpan(ctx, "model", "get-cloud-compliance-nodes-list")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}
	defer tx.Close(ctx)

	isOrgListing := false
	neo4jNodeType := "CloudNode"
	passStatus := []string{"ok", "info", "skip"}
	switch cloudProvider {
	case PostureProviderAWSOrg:
		cloudProvider = PostureProviderAWS
		isOrgListing = true
	case PostureProviderGCPOrg:
		cloudProvider = PostureProviderGCP
		isOrgListing = true
	case PostureProviderAzureOrg:
		cloudProvider = PostureProviderAzure
		isOrgListing = true
	case PostureProviderKubernetes:
		neo4jNodeType = "KubernetesCluster"
	case PostureProviderLinux:
		neo4jNodeType = "Node"
		passStatus = []string{"warn", "pass"}
	}
	var res neo4j.ResultWithContext
	var query string
	switch {
	case cloudProvider == PostureProviderKubernetes || cloudProvider == PostureProviderLinux:
		nonKubeFilter := ""
		if cloudProvider == PostureProviderLinux {
			nonKubeFilter = "{kubernetes_cluster_id:''}"
		}
		query = `
		MATCH (n:` + string(neo4jNodeType) + nonKubeFilter + `)
		WHERE n.pseudo=false
		RETURN n.node_id, n.node_name, $cloud_provider, n.active, n.updated_at, COALESCE(n.compliance_latest_scan_id, ''), COALESCE(n.compliance_latest_scan_status, '')
		ORDER BY n.updated_at` + fw.FetchWindow2CypherQuery()
	case isOrgListing:
		query = `
		MATCH (m:` + string(neo4jNodeType) + `{cloud_provider:$cloud_provider+'_org'}) -[:IS_CHILD]-> (n:` + string(neo4jNodeType) + `)
		RETURN  n.node_id, n.node_name, $cloud_provider, n.active, n.updated_at, COALESCE(n.cloud_compliance_latest_scan_id, ''), COALESCE(n.cloud_compliance_latest_scan_status, '')
		ORDER BY n.updated_at` + fw.FetchWindow2CypherQuery()
	default:
		query = `
		MATCH (n:` + string(neo4jNodeType) + `{cloud_provider: $cloud_provider})
		RETURN n.node_id, n.node_name, $cloud_provider, n.active, n.updated_at, COALESCE(n.cloud_compliance_latest_scan_id, ''), COALESCE(n.cloud_compliance_latest_scan_status, '')
		ORDER BY n.updated_at` + fw.FetchWindow2CypherQuery()
	}

	log.Debug().Msgf("posture query: %v", query)
	res, err = tx.Run(ctx,
		query,
		map[string]interface{}{
			"cloud_provider": cloudProvider,
			"pass_status":    passStatus},
	)
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}

	cloudNodeAccountsInfo := []CloudNodeAccountInfo{}
	for _, rec := range recs {
		tmp := CloudNodeAccountInfo{
			NodeID:               rec.Values[0].(string),
			NodeName:             rec.Values[1].(string),
			CloudProvider:        rec.Values[2].(string),
			CompliancePercentage: 0,
			Active:               rec.Values[3].(bool),
			LastScanID:           rec.Values[5].(string),
			LastScanStatus:       rec.Values[6].(string),
		}
		cloudNodeAccountsInfo = append(cloudNodeAccountsInfo, tmp)
	}

	total := fw.Offset + len(cloudNodeAccountsInfo)
	var countRes neo4j.ResultWithContext
	if isOrgListing {
		countRes, err = tx.Run(ctx, `
		MATCH (m:CloudNode) -[:IS_CHILD]-> (n:CloudNode{cloud_provider: $cloud_provider})
		RETURN COUNT(m)`,
			map[string]interface{}{"cloud_provider": cloudProvider})
	} else {
		countRes, err = tx.Run(ctx, fmt.Sprintf(`
		MATCH (n:%s {cloud_provider: $cloud_provider})
		RETURN COUNT(*)`, neo4jNodeType),
			map[string]interface{}{"cloud_provider": cloudProvider})
	}
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}

	countRec, err := countRes.Single(ctx)
	if err != nil {
		return CloudNodeAccountsListResp{CloudNodeAccountInfo: cloudNodeAccountsInfo, Total: total}, nil
	}

	total = int(countRec.Values[0].(int64))

	return CloudNodeAccountsListResp{CloudNodeAccountInfo: cloudNodeAccountsInfo, Total: total}, nil
}

type CloudAccountRefreshReq struct {
	NodeIDs []string `json:"node_ids" validate:"required,gt=0" required:"true"`
}

func (c *CloudAccountRefreshReq) SetCloudAccountRefresh(ctx context.Context) error {

	ctx, span := telemetry.NewSpan(ctx, "model", "set-cloud-account-refresh")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	if _, err = tx.Run(ctx, `
		UNWIND $batch as cloudNode
		MATCH (m:CloudNode{node_id: cloudNode})
		SET m.refresh_status = '`+utils.ScanStatusStarting+`', m.refresh_message = '', m.refresh_metadata = ''`,
		map[string]interface{}{
			"batch": c.NodeIDs,
		}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type CloudAccountDeleteReq struct {
	NodeIDs []string `json:"node_ids" validate:"required,gt=0" required:"true"`
}

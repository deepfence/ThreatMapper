package model

import (
	"context"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type CloudNodeAccountRegisterReq struct {
	NodeId              string            `json:"node_id" required:"true"`
	CloudAccount        string            `json:"cloud_account" required:"true"`
	CloudProvider       string            `json:"cloud_provider" required:"true"  enum:"aws,gcp,azure"`
	MonitoredAccountIds map[string]string `json:"monitored_account_ids"`
	OrgAccountId        string            `json:"org_acc_id"`
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
	Providers []string `json:"providers" required:"true"`
}

type CloudNodeAccountsListResp struct {
	CloudNodeAccountInfo []CloudNodeAccountInfo `json:"cloud_node_accounts_info" required:"true"`
	Total                int                    `json:"total" required:"true"`
}

type CloudNodeAccountInfo struct {
	NodeId               string `json:"node_id"`
	NodeName             string `json:"node_name"`
	CloudProvider        string `json:"cloud_provider"`
	CompliancePercentage string `json:"compliance_percentage"`
	Active               string `json:"active"`
}

type CloudComplianceScanDetails struct {
	ScanId    string   `json:"scan_id"`
	ScanType  string   `json:"scan_type"`
	AccountId string   `json:"account_id"`
	Controls  []string `json:"controls"`
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
}

func UpsertCloudComplianceNode(ctx context.Context, nodeDetails map[string]interface{}) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err := tx.Run("WITH $param as row MERGE (n:Node{node_id:row.node_id}) SET n+= row, n.updated_at = TIMESTAMP()", map[string]interface{}{"param": nodeDetails}); err != nil {
		return err
	}

	return tx.Commit()
}

func GetCloudProvidersList(ctx context.Context) ([]string, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return []string{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return []string{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return []string{}, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (n:Node) 
		RETURN DISTINCT(n.cloud_provider)`,
		map[string]interface{}{})
	if err != nil {
		return []string{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return []string{}, err
	}

	providers := []string{}
	for _, rec := range recs {
		providers = append(providers, rec.Values[0].(string))
	}
	return providers, nil
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (n:Node{cloud_provider: $cloud_provider}) 
		RETURN n.node_id, n.node_name, n.cloud_provider 
		ORDER BY n.updated_at`+fw.FetchWindow2CypherQuery(),
		map[string]interface{}{"cloud_provider": cloudProvider})
	if err != nil {
		return CloudNodeAccountsListResp{Total: 0}, err
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
			CompliancePercentage: "0.00",
			Active:               "true",
		}
		cloud_node_accounts_info = append(cloud_node_accounts_info, tmp)
	}

	total := fw.Offset + len(cloud_node_accounts_info)
	countRes, err := tx.Run(`
		MATCH (n:Node {cloud_provider: $cloud_provider}) 
		RETURN COUNT(*)`,
		map[string]interface{}{"cloud_provider": cloudProvider})

	countRec, err := countRes.Single()
	if err != nil {
		return CloudNodeAccountsListResp{CloudNodeAccountInfo: cloud_node_accounts_info, Total: total}, nil
	}

	total = int(countRec.Values[0].(int64))

	return CloudNodeAccountsListResp{CloudNodeAccountInfo: cloud_node_accounts_info, Total: total}, nil
}

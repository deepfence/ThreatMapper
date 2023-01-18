package model

import (
	"context"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
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

//type CloudNodeAccountsListReq struct {
//	NodeId              string            `json:"node_id" required:"true"`
//	CloudAccount        string            `json:"cloud_account" required:"true"`
//	CloudProvider       string            `json:"cloud_provider" required:"true"  enum:"aws,gcp,azure"`
//	MonitoredAccountIds map[string]string `json:"monitored_account_ids"`
//	OrgAccountId        string            `json:"org_acc_id"`
//}
//
//type CloudNodeAccountsListResp struct {
//	Scans            map[string]CloudComplianceScanDetails `json:"scans"`
//	CloudtrailTrails []CloudNodeCloudtrailTrail            `json:"cloudtrail_trails"`
//	Refresh          string                                `json:"refresh"`
//}

type CloudNodeAccountsListReq struct {
	CloudProvider string      `json:"cloud_provider"`
	Window        FetchWindow `json:"window" required:"true"`
}

type CloudNodeAccountsListResp struct {
	CloudNodeAccountInfo []CloudNodeAccountInfo `json:"cloud_node_accounts_info" required:"true"`
}

type CloudNodeAccountInfo struct {
	NodeId               string `json:"node_id"`
	NodeName             string `json:"node_name"`
	CloudProvider        string `json:"cloud_provider"`
	CompliancePercentage string `json:"compliance_percentage"`
	Active               string `json:"active"`
}

type CloudComplianceScanDetails struct {
	ScanId    string `json:"scan_id"`
	ScanType  string `json:"scan_type"`
	AccountId string `json:"account_id"`
}

type CloudNodeCloudtrailTrail struct {
	AccountId string `json:"account_id"`
	TrailName string `json:"trail_name"`
}

//type CloudNodeAccount struct {
//	ID                   int64          `json:"id"`
//	NodeID               string         `json:"node_id" validate:"required,min=2,max=32"`
//	NodeName             string         `json:"node_name" validate:"required,min=2,max=32"`
//	CloudProvider        string         `json:"cloud_provider" validate:"required,min=2,max=32"`
//	CompliancePercentage string         `json:"compliance_percentage"`
//	OrgAccountID         sql.NullString `json:"org_account_id"`
//}

type PendingCloudComplianceScan struct {
	ScanId    string   `json:"scan_id"`
	ScanType  string   `json:"scan_type"`
	Controls  []string `json:"controls"`
	AccountId string   `json:"account_id"`
}

//func (c *CloudNodeAccount) LoadFromDbByNodeId(ctx context.Context, pgClient *postgresqlDb.Queries) error {
//	// Set email field and load other fields from db
//	var err error
//	var cloudComplianceNode postgresqlDb.CloudComplianceNode
//	cloudComplianceNode, err = pgClient.GetCloudComplianceNodeByNodeId(ctx, c.NodeID)
//	if err != nil {
//		return err
//	}
//	c.ID = cloudComplianceNode.ID
//	c.NodeID = cloudComplianceNode.NodeID
//	c.NodeName = cloudComplianceNode.NodeName
//	c.CloudProvider = cloudComplianceNode.CloudProvider
//	c.CompliancePercentage = cloudComplianceNode.CompliancePercentage
//	c.OrgAccountID = cloudComplianceNode.OrgAccountID
//	return nil
//}
//
//func (c *CloudNodeAccount) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.CloudComplianceNode, error) {
//	cloudComplianceNode, err := pgClient.CreateCloudComplianceNode(ctx,
//		postgresqlDb.CreateCloudComplianceNodeParams{NodeID: c.NodeID, NodeName: c.NodeName,
//			CloudProvider: c.CloudProvider, CompliancePercentage: c.CompliancePercentage, OrgAccountID: c.OrgAccountID})
//	if err != nil {
//		return nil, err
//	}
//	return &cloudComplianceNode, nil
//}

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

func GetCloudComplianceNodesList(ctx context.Context, cloudProvider string, fw FetchWindow) (CloudNodeAccountsListResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return CloudNodeAccountsListResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return CloudNodeAccountsListResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return CloudNodeAccountsListResp{}, err
	}
	defer tx.Close()

	res, err := tx.Run(`MATCH (n:Node{cloud_provider: $cloud_provider}) RETURN n.node_id, n.node_name, n.cloud_provider ORDER BY m.updated_at SKIP $skip LIMIT $limit`,
		map[string]interface{}{"cloud_provider": cloudProvider, "skip": fw.Offset, "limit": fw.Size})
	if err != nil {
		return CloudNodeAccountsListResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return CloudNodeAccountsListResp{}, err
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

	return CloudNodeAccountsListResp{CloudNodeAccountInfo: cloud_node_accounts_info}, nil
}

//type ScanStatus string
//
//type ScanInfo struct {
//	ScanId    string `json:"scan_id" required:"true"`
//	Status    string `json:"status" required:"true"`
//	UpdatedAt int64  `json:"updated_at" required:"true" format:"int64"`
//}
//
//const (
//	SCAN_STATUS_SUCCESS    = utils.SCAN_STATUS_SUCCESS
//	SCAN_STATUS_STARTING   = utils.SCAN_STATUS_STARTING
//	SCAN_STATUS_INPROGRESS = utils.SCAN_STATUS_INPROGRESS
//)
//
//type ScanTriggerResp struct {
//	ScanId string `json:"scan_id" required:"true"`
//}
//
//type ScanStatusReq struct {
//	ScanId string `query:"scan_id" form:"scan_id" required:"true"`
//}
//
//type ScanStatusResp struct {
//	Status ScanStatus `json:"status" required:"true"`
//}
//
//type ScanListReq struct {
//	NodeId string      `json:"node_id" required:"true"`
//	Window FetchWindow `json:"window"  required:"true"`
//}
//
//type ScanListResp struct {
//	ScansInfo []ScanInfo `json:"scans_info" required:"true"`
//}
//
//type ScanResultsReq struct {
//	ScanId string      `json:"scan_id" required:"true"`
//	Window FetchWindow `json:"window"  required:"true"`
//}
//
//type ScanResultsResp struct {
//	Results []map[string]interface{} `json:"results" required:"true"`
//}

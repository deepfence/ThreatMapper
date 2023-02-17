package reporters_search

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
	"github.com/rs/zerolog/log"
	"github.com/samber/mo"
)

// If no nodeIds are provided, will return all
// If no field are provided, will return all fields.
// (Fields can only be top level since neo4j does not support nested fields)
type SearchFilter struct {
	InFieldFilter []string                `json:"in_field_filter" required:"true"` // Fields to return
	Filters       reporters.FieldsFilters `json:"filters" required:"true"`
}

type SearchNodeReq struct {
	NodeFilter SearchFilter      `json:"node_filter" required:"true"`
	Window     model.FetchWindow `json:"window" required:"true"`
}

type SearchScanReq struct {
	ScanFilter SearchFilter      `json:"scan_filters" required:"true"`
	NodeFilter SearchFilter      `json:"node_filters" required:"true"`
	Window     model.FetchWindow `json:"window" required:"true"`
}

func searchGenericDirectNodeReport[T model.Cypherable](ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]T, error) {
	res := []T{}
	var dummy T

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	query := `
		MATCH (n:` + dummy.NodeType() + `) ` +
		reporters.ParseFieldFilters2CypherWhereConditions("n", mo.Some(filter.Filters), true) +
		` RETURN ` + reporters.FieldFilterCypher("n", filter.InFieldFilter) + ` ` +
		reporters.OrderFilter2CypherCondition("n", filter.Filters.OrderFilter) +
		` SKIP $skip
		LIMIT $limit`
	log.Info().Msgf("search query: %v", query)
	r, err := tx.Run(query,
		map[string]interface{}{"skip": fw.Offset, "limit": fw.Size})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		var node_map map[string]interface{}
		if len(filter.InFieldFilter) == 0 {
			data, has := rec.Get("n")
			if !has {
				log.Warn().Msgf("Missing neo4j entry")
				continue
			}
			da, ok := data.(dbtype.Node)
			if !ok {
				log.Warn().Msgf("Missing neo4j entry")
				continue
			}
			node_map = da.Props
		} else {
			node_map = map[string]interface{}{}
			for i := range filter.InFieldFilter {
				node_map[filter.InFieldFilter[i]] = rec.Values[i]
			}
		}
		var node T
		utils.FromMap(node_map, &node)
		res = append(res, node)
	}

	return res, nil
}

func searchGenericScanInfoReport(ctx context.Context, scan_type utils.Neo4jScanType, scan_filter SearchFilter, resource_filter SearchFilter, fw model.FetchWindow) ([]model.ScanInfo, error) {
	res := []model.ScanInfo{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	query := `
		MATCH (n:` + string(scan_type) + `) ` +
		reporters.ParseFieldFilters2CypherWhereConditions("n", mo.Some(scan_filter.Filters), true) +
		`MATCH (n) -[:SCANNED]- (m)` +
		reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(resource_filter.Filters), true) +
		` RETURN n.node_id as scan_id, n.status, n.updated_at, m.node_id, m.node_type, m.node_name` +
		reporters.OrderFilter2CypherCondition("n", scan_filter.Filters.OrderFilter) +
		` SKIP $skip
		LIMIT $limit`
	log.Info().Msgf("search query: %v", query)
	r, err := tx.Run(query,
		map[string]interface{}{"skip": fw.Offset, "limit": fw.Size})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, rec := range recs {

		counts, err := reporters_scan.GetSevCounts(ctx, scan_type, rec.Values[0].(string))
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		res = append(res, model.ScanInfo{
			ScanId:         rec.Values[0].(string),
			Status:         rec.Values[1].(string),
			UpdatedAt:      rec.Values[2].(int64),
			NodeId:         rec.Values[3].(string),
			NodeType:       rec.Values[4].(string),
			SeverityCounts: counts,
		})
	}

	return res, nil
}

func SearchHostsReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Host, error) {
	hosts, err := searchGenericDirectNodeReport[model.Host](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchContainersReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Container, error) {
	hosts, err := searchGenericDirectNodeReport[model.Container](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchContainerImagesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.ContainerImage, error) {
	hosts, err := searchGenericDirectNodeReport[model.ContainerImage](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchVulnerabilitiesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Vulnerability, error) {
	hosts, err := searchGenericDirectNodeReport[model.Vulnerability](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchSecretsReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Secret, error) {
	hosts, err := searchGenericDirectNodeReport[model.Secret](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchMalwaresReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Malware, error) {
	hosts, err := searchGenericDirectNodeReport[model.Malware](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCloudCompliancesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.CloudCompliance, error) {
	hosts, err := searchGenericDirectNodeReport[model.CloudCompliance](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCompliancesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Compliance, error) {
	hosts, err := searchGenericDirectNodeReport[model.Compliance](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchVulnerabilityScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_VULNERABILITY_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchSecretScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_SECRET_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchMalwareScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_MALWARE_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchComplianceScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_COMPLIANCE_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCloudComplianceScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

package reporters_search

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
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
	Window        model.FetchWindow       `json:"window" required:"true"`
}

type SearchNodeReq struct {
	NodeFilter         SearchFilter      `json:"node_filter" required:"true"`
	ExtendedNodeFilter SearchFilter      `json:"extended_node_filter"`
	Window             model.FetchWindow `json:"window" required:"true"`
}

type SearchScanReq struct {
	ScanFilter SearchFilter      `json:"scan_filters" required:"true"`
	NodeFilter SearchFilter      `json:"node_filters" required:"true"`
	Window     model.FetchWindow `json:"window" required:"true"`
}

type SearchCountResp struct {
	Count      int              `json:"count" required:"true"`
	Categories map[string]int32 `json:"categories" required:"true"`
}

type NodeCountResp struct {
	CloudProviders    int64 `json:"cloud_provider" required:"true"`
	Host              int64 `json:"host" required:"true"`
	Container         int64 `json:"container" required:"true"`
	ContainerImage    int64 `json:"container_image" required:"true"`
	Pod               int64 `json:"pod" required:"true"`
	KubernetesCluster int64 `json:"kubernetes_cluster" required:"true"`
	Namespace         int64 `json:"namespace" required:"true"`
}

type ResultGroup struct {
	Name     string `json:"name"`
	Count    int64  `json:"count"`
	Severity string `json:"severity"`
}

type ResultGroupResp struct {
	Groups []ResultGroup `json:"groups"`
}

func CountNodes(ctx context.Context) (NodeCountResp, error) {
	res := NodeCountResp{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	query := `
		CALL {
			MATCH (n:Node)
			WHERE n.pseudo = false AND n.active = true AND n.agent_running = true
			return count(n) as n1
		}
		CALL {
			MATCH (n:Container)
			WHERE n.pseudo = false AND n.active = true
			return count(n) as n2
		}
		CALL {
			MATCH (n:ContainerImage)
			WHERE n.pseudo = false AND n.active = true
			return count(n) as n3
		}
		CALL {
			MATCH (n:KubernetesCluster)
			WHERE n.pseudo = false AND n.active = true AND n.agent_running = true
			return count(n) as n4
		}
		CALL {
			MATCH (n:Pod)
			WHERE n.pseudo = false AND n.active = true
			return count(n) as n5, count(distinct n.kubernetes_namespace) as nn5
		}
		CALL {
			MATCH (n:CloudProvider)
			WHERE n.pseudo = false AND n.active = true
			return count(n) as n6
		}
		return n1, n2, n3, n4, n5, nn5, n6`
	r, err := tx.Run(query,
		map[string]interface{}{})
	if err != nil {
		return res, err
	}
	rec, err := r.Single()
	if err != nil {
		return res, err
	}

	res.Host = rec.Values[0].(int64)
	res.Container = rec.Values[1].(int64)
	res.ContainerImage = rec.Values[2].(int64)
	res.KubernetesCluster = rec.Values[3].(int64)
	res.Pod = rec.Values[4].(int64)
	res.Namespace = rec.Values[5].(int64)
	res.CloudProviders = rec.Values[6].(int64)

	return res, nil
}

func searchGenericDirectNodeReport[T reporters.Cypherable](ctx context.Context, filter SearchFilter, extended_filter SearchFilter, fw model.FetchWindow) ([]T, error) {
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

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	query := `
		MATCH (n:` + dummy.NodeType() + `)` +
		reporters.ParseFieldFilters2CypherWhereConditions("n", mo.Some(filter.Filters), true) +
		reporters.OrderFilter2CypherCondition("n", filter.Filters.OrderFilter, nil) +
		` OPTIONAL MATCH (n) -[:IS]-> (e) ` +
		reporters.ParseFieldFilters2CypherWhereConditions("e", mo.Some(extended_filter.Filters), true) +
		reporters.OrderFilter2CypherCondition("e", filter.Filters.OrderFilter, []string{"n"}) +
		`RETURN ` + reporters.FieldFilterCypher("n", filter.InFieldFilter) + `, e` +
		fw.FetchWindow2CypherQuery()
	log.Debug().Msgf("search query: %v", query)
	r, err := tx.Run(query,
		map[string]interface{}{})

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
		is_node, _ := rec.Get("e")
		if is_node != nil {
			for k, v := range is_node.(dbtype.Node).Props {
				if k == "node_id" {
					node_map[dummy.ExtendedField()] = v
				} else if k == "masked" {
					if val, ok := node_map[k]; ok {
						node_map[k] = v.(bool) || val.(bool)
					} else {
						node_map[k] = v
					}
				} else {
					node_map[k] = v
				}
			}
		}
		var node T
		utils.FromMap(node_map, &node)
		res = append(res, node)
	}

	return res, nil
}

func searchCloudNode(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.CloudNodeAccountInfo, error) {
	res := []model.CloudNodeAccountInfo{}
	cloudProvider := filter.Filters.ContainsFilter.FieldsValues["cloud_provider"][0].(string)
	dummy := model.CloudNodeAccountInfo{
		CloudProvider: cloudProvider,
	}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()
	nonKubeFilter := ""
	if cloudProvider == model.PostureProviderLinux {
		nonKubeFilter = "{kubernetes_cluster_id:'', node_type:'host'}"
	}
	if cloudProvider == model.PostureProviderLinux || cloudProvider == model.PostureProviderKubernetes {
		filter.Filters.ContainsFilter.FieldsValues["agent_running"] = append(make([]interface{}, 0), true)
		delete(filter.Filters.ContainsFilter.FieldsValues, "cloud_provider")
	}
	orderFilters := filter.Filters.OrderFilter
	filter.Filters.OrderFilter = reporters.OrderFilter{}
	statusKey := "last_scan_status"
	scanStatusFilterValue, present := filter.Filters.ContainsFilter.FieldsValues[statusKey]
	scanFilter := reporters.FieldsFilters{}
	if present {
		scanFilter.ContainsFilter.FieldsValues = make(map[string][]interface{})
		scanFilter.ContainsFilter.FieldsValues[statusKey] = scanStatusFilterValue
		delete(filter.Filters.ContainsFilter.FieldsValues, statusKey)
	}

	query := `
		MATCH (n:` + dummy.NodeType() + nonKubeFilter + `)` +
		reporters.ParseFieldFilters2CypherWhereConditions("n", mo.Some(filter.Filters), true) +
		` WITH n.node_id AS node_id UNWIND node_id AS x
		OPTIONAL MATCH (n:` + dummy.NodeType() + `{node_id: x})<-[:SCANNED]-(s:` + string(dummy.ScanType()) + `)-[:DETECTED]->(c:` + dummy.ScanResultType() + `)
		WITH x ` + reporters.FieldFilterCypher("", filter.InFieldFilter) + `, COUNT(c) AS total_compliance_count
		OPTIONAL MATCH (n:` + dummy.NodeType() + `{node_id: x})<-[:SCANNED]-(s:` + string(dummy.ScanType()) + `)-[:DETECTED]->(c1:` + dummy.ScanResultType() + `)
		WHERE c1.status IN $pass_status
		WITH x` + reporters.FieldFilterCypher("", filter.InFieldFilter) + `, CASE WHEN total_compliance_count = 0 THEN 0.0 ELSE COUNT(c1.status)*100.0/total_compliance_count END AS compliance_percentage
		CALL {
			WITH x
			OPTIONAL MATCH (n:` + dummy.NodeType() + `{node_id: x})<-[:SCANNED]-(s1:` + string(dummy.ScanType()) + `)
			RETURN s1.node_id AS last_scan_id, s1.status AS last_scan_status
			ORDER BY s1.updated_at DESC LIMIT 1
		}
		CALL {WITH x MATCH (n:` + dummy.NodeType() + `{node_id: x}) RETURN n.node_name as node_name, n.active as active, n.version as version}
		WITH x, node_name, version, compliance_percentage, last_scan_id, COALESCE(last_scan_status, '') as last_scan_status, active ` +
		reporters.ParseFieldFilters2CypherWhereConditions("", mo.Some(scanFilter), true) +
		`RETURN x as node_id, node_name, COALESCE(version, 'unknown') as version, compliance_percentage, COALESCE(last_scan_id, '') as last_scan_id, COALESCE(last_scan_status, '') as last_scan_status, active ` + reporters.FieldFilterCypher("", filter.InFieldFilter) +
		reporters.OrderFilter2CypherCondition("", orderFilters, nil) + fw.FetchWindow2CypherQuery()

	log.Debug().Msgf("search cloud node query: %v", query)
	r, err := tx.Run(query,
		map[string]interface{}{
			"pass_status": dummy.GetPassStatus(),
		})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		var node_map map[string]interface{}
		if len(filter.InFieldFilter) != 0 {
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
			baseValuesCount := 0
			for _, nodeMapKey := range []string{"node_id", "node_name", "version", "compliance_percentage", "last_scan_id", "last_scan_status", "active"} {
				node_map[nodeMapKey] = rec.Values[baseValuesCount]
				baseValuesCount = baseValuesCount + 1
			}
			node_map["cloud_provider"] = cloudProvider
			for i := range filter.InFieldFilter {
				node_map[filter.InFieldFilter[i]] = rec.Values[i+baseValuesCount]
			}
		}
		var node model.CloudNodeAccountInfo
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

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	query := `
		MATCH (:` + string(scan_type) + `) -[:SCANNED]-> (m)` +
		reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(resource_filter.Filters), true) +
		`
	    WITH distinct m
		CALL {
	    WITH m
		MATCH (n:` + string(scan_type) + `) -[:SCANNED]-> (m)` +
		reporters.ParseFieldFilters2CypherWhereConditions("n", mo.Some(scan_filter.Filters), true) +
		`
	    RETURN n
	    ORDER BY n.updated_at DESC` +
		scan_filter.Window.FetchWindow2CypherQuery() +
		`}` +
		` RETURN n.node_id as scan_id, n.status as status, n.status_message as status_message, n.updated_at as updated_at, m.node_id as node_id, COALESCE(m.node_type, m.cloud_provider) as node_type, m.node_name as node_name` +
		reporters.OrderFilter2CypherCondition("", scan_filter.Filters.OrderFilter, nil) +
		fw.FetchWindow2CypherQuery()
	log.Debug().Msgf("search query: %v", query)
	r, err := tx.Run(query,
		map[string]interface{}{})

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
			StatusMessage:  rec.Values[2].(string),
			UpdatedAt:      rec.Values[3].(int64),
			NodeId:         rec.Values[4].(string),
			NodeType:       rec.Values[5].(string),
			NodeName:       rec.Values[6].(string),
			SeverityCounts: counts,
		})
	}

	return res, nil
}

func SearchCloudNodeReport[T reporters.Cypherable](ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.CloudNodeAccountInfo, error) {
	hosts, err := searchCloudNode(ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchReport[T reporters.Cypherable](ctx context.Context, filter SearchFilter, extended_filter SearchFilter, fw model.FetchWindow) ([]T, error) {
	hosts, err := searchGenericDirectNodeReport[T](ctx, filter, extended_filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchScansReport(ctx context.Context, filter SearchScanReq, scan_type utils.Neo4jScanType) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, scan_type, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

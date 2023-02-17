package reporters

import (
	"context"
	"fmt"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
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
type LookupFilter struct {
	InFieldFilter []string          `json:"in_field_filter" required:"true"` // Fields to return
	NodeIds       []string          `json:"node_ids" required:"true"`        // Node to return
	Window        model.FetchWindow `json:"window" required:"true"`
}

// If no nodeIds are provided, will return all
// If no field are provided, will return all fields.
// (Fields can only be top level since neo4j does not support nested fields)
type SearchFilter struct {
	InFieldFilter []string      `json:"in_field_filter" required:"true"` // Fields to return
	Filters       FieldsFilters `json:"filters" required:"true"`
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

func GetHostsReport(ctx context.Context, filter LookupFilter) ([]model.Host, error) {
	hosts, err := getGenericDirectNodeReport[model.Host](ctx, filter)
	if err != nil {
		return nil, err
	}
	for i := range hosts {
		processes, err := getHostProcesses(ctx, hosts[i])
		if err != nil {
			return nil, err
		}
		hosts[i].Processes = processes

		containers, err := getHostContainers(ctx, hosts[i])
		if err != nil {
			return nil, err
		}
		hosts[i].Containers = containers

		container_images, err := getHostContainerImages(ctx, hosts[i])
		if err != nil {
			return nil, err
		}
		hosts[i].ContainerImages = container_images
	}
	return hosts, nil
}

func fieldFilterCypher(node_name string, fields []string) string {
	if len(fields) != 0 {
		for i := range fields {
			fields[i] = fmt.Sprintf("%s.%s", node_name, fields[i])
		}
		return strings.Join(fields, ",")
	}
	return node_name
}

func GetContainersReport(ctx context.Context, filter LookupFilter) ([]model.Container, error) {
	containers, err := getGenericDirectNodeReport[model.Container](ctx, filter)
	if err != nil {
		return nil, err
	}
	for i := range containers {
		processes, err := getContainerProcesses(ctx, containers[i])
		if err != nil {
			return nil, err
		}
		containers[i].Processes = processes
	}
	return containers, nil
}

func GetProcessesReport(ctx context.Context, filter LookupFilter) ([]model.Process, error) {
	processes, err := getGenericDirectNodeReport[model.Process](ctx, filter)
	if err != nil {
		return nil, err
	}
	return processes, nil
}

func GetPodsReport(ctx context.Context, filter LookupFilter) ([]model.Pod, error) {
	pods, err := getGenericDirectNodeReport[model.Pod](ctx, filter)
	if err != nil {
		return nil, err
	}
	return pods, nil
}

func GetContainerImagesReport(ctx context.Context, filter LookupFilter) ([]model.ContainerImage, error) {
	images, err := getGenericDirectNodeReport[model.ContainerImage](ctx, filter)
	if err != nil {
		return nil, err
	}
	return images, nil
}

func GetKubernetesClustersReport(ctx context.Context, filter LookupFilter) ([]model.KubernetesCluster, error) {
	clusters, err := getGenericDirectNodeReport[model.KubernetesCluster](ctx, filter)
	if err != nil {
		return nil, err
	}
	return clusters, nil
}

func GetRegistryAccountReport(ctx context.Context, filter LookupFilter) ([]model.RegistryAccount, error) {
	registry, err := getGenericDirectNodeReport[model.RegistryAccount](ctx, filter)
	if err != nil {
		return nil, err
	}

	for i := range registry {
		container_images, err := getRegistryImages(ctx, registry[i])
		if err != nil {
			return nil, err
		}
		registry[i].ContainerImages = container_images
	}
	return registry, nil
}

func getGenericDirectNodeReport[T model.Cypherable](ctx context.Context, filter LookupFilter) ([]T, error) {
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

	var r neo4j.Result
	if len(filter.NodeIds) == 0 {
		r, err = tx.Run(`
		MATCH (n:`+dummy.NodeType()+`) RETURN `+fieldFilterCypher("n", filter.InFieldFilter)+`
		`, nil)
	} else {
		r, err = tx.Run(`
		MATCH (n:`+dummy.NodeType()+`) WHERE n.node_id IN $ids RETURN `+fieldFilterCypher("n", filter.InFieldFilter)+`
		`, map[string]interface{}{"ids": filter.NodeIds})
	}

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

func getIndirectFromIDs[T any](ctx context.Context, query string, ids []string) ([]T, error) {
	res := []T{}

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

	r, err := tx.Run(query, map[string]interface{}{"ids": ids})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		data, has := rec.Get("m")
		if !has {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		da, ok := data.(dbtype.Node)
		if !ok {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		var node T
		utils.FromMap(da.Props, &node)
		res = append(res, node)
	}

	return res, nil
}

func getHostContainers(ctx context.Context, host model.Host) ([]model.Container, error) {
	return getIndirectFromIDs[model.Container](ctx,
		`MATCH (n:Node) -[:HOSTS]-> (m:Container) WHERE n.node_id IN $ids RETURN m`,
		[]string{host.ID})
}

func getHostContainerImages(ctx context.Context, host model.Host) ([]model.ContainerImage, error) {
	return getIndirectFromIDs[model.ContainerImage](ctx,
		`MATCH (n:Node) -[:HOSTS]-> (m:ContainerImage) WHERE n.node_id IN $ids RETURN m`,
		[]string{host.ID})
}

func getRegistryImages(ctx context.Context, registry model.RegistryAccount) ([]model.ContainerImage, error) {
	return getIndirectFromIDs[model.ContainerImage](ctx,
		`MATCH (n:RegistryAccount) -[:HOSTS]-> (m:ContainerImage) WHERE n.node_id IN $ids RETURN m`,
		[]string{registry.ID})
}

func getHostProcesses(ctx context.Context, host model.Host) ([]model.Process, error) {
	return getIndirectFromIDs[model.Process](ctx,
		`MATCH (n:Node) -[:HOSTS]-> (m:Process) WHERE n.node_id IN $ids RETURN m`,
		[]string{host.ID})
}

func getContainerProcesses(ctx context.Context, container model.Container) ([]model.Process, error) {
	return getIndirectFromIDs[model.Process](ctx,
		`MATCH (n:Node) -[:HOSTS]-> (m:Process) WHERE n.node_id IN $ids RETURN m`,
		[]string{container.ID})
}

func getContainerContainerImages(ctx context.Context, container model.Container) ([]model.Process, error) {
	return getIndirectFromIDs[model.Process](ctx,
		`MATCH (n:Node) -[:HOSTS]-> (m:Process) WHERE n.node_id IN $ids RETURN m`,
		[]string{container.ID})
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
		parseFieldFilters2CypherWhereConditions("n", mo.Some(filter.Filters), true) +
		` RETURN ` + fieldFilterCypher("n", filter.InFieldFilter) + ` ` +
		orderFilter2CypherCondition("n", filter.Filters.OrderFilter) +
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
		parseFieldFilters2CypherWhereConditions("n", mo.Some(scan_filter.Filters), true) +
		`MATCH (n) -[:SCANNED]- (m)` +
		parseFieldFilters2CypherWhereConditions("m", mo.Some(resource_filter.Filters), true) +
		` RETURN n.node_id as scan_id, n.status, n.updated_at, m.node_id, m.node_type, m.node_name` +
		orderFilter2CypherCondition("n", scan_filter.Filters.OrderFilter) +
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

		counts, err := GetSevCounts(ctx, scan_type, rec.Values[0].(string))
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

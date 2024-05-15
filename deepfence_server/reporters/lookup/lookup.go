package reporters_lookup //nolint:stylecheck

import (
	"context"
	"strings"
	"time"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
	"github.com/rs/zerolog/log"
)

const (
	nodeReportResourcesSplit = "##"
)

// If no nodeIds are provided, will return all
// If no field are provided, will return all fields.
// (Fields can only be top level since neo4j does not support nested fields)
type LookupFilter struct {
	InFieldFilter []string          `json:"in_field_filter" required:"true"` // Fields to return
	NodeIds       []string          `json:"node_ids" required:"true"`        // Node to return
	Window        model.FetchWindow `json:"window" required:"true"`
}

func GetHostsReport(ctx context.Context, filter LookupFilter) ([]model.Host, error) {
	hosts, err := getGenericDirectNodeReport[model.Host](ctx, filter)
	if err != nil {
		return nil, err
	}

	getProcesses := true
	getContainerImages := true
	getContainers := true
	getPods := true
	getConnections := true
	if len(filter.InFieldFilter) > 0 {
		getProcesses = utils.InSlice("processes", filter.InFieldFilter)
		getContainerImages = utils.InSlice("container_images", filter.InFieldFilter)
		getContainers = utils.InSlice("containers", filter.InFieldFilter)
		getPods = utils.InSlice("pods", filter.InFieldFilter)
		getConnections = utils.InSlice("connections", filter.InFieldFilter)
	}

	hostIDs := make([]string, len(hosts))
	hostIDIndex := make(map[string]int)
	for i, host := range hosts {
		hostIDs[i] = host.ID
		hostIDIndex[host.ID] = i
	}

	var index int
	if getProcesses {
		processes, matched, err := getHostProcesses(ctx, hostIDs)
		if err == nil {
			for _, process := range processes {
				index = hostIDIndex[matched[process.ID]]
				hosts[index].Processes = append(hosts[index].Processes, process)
			}
		}
	}
	if getContainers {
		containers, matched, err := getHostContainers(ctx, hostIDs)
		if err == nil {
			for _, container := range containers {
				index = hostIDIndex[matched[container.ID]]
				hosts[index].Containers = append(hosts[index].Containers, container)
			}
		}
	}
	if getContainerImages {
		containerImages, matched, err := getHostContainerImages(ctx, hostIDs)
		if err == nil {
			for _, containerImage := range containerImages {
				index = hostIDIndex[matched[containerImage.ID]]
				hosts[index].ContainerImages = append(hosts[index].ContainerImages, containerImage)
			}
		}
	}
	if getPods {
		pods, matched, err := getHostPods(ctx, hostIDs)
		if err == nil {
			for _, pod := range pods {
				index = hostIDIndex[matched[pod.ID]]
				hosts[index].Pods = append(hosts[index].Pods, pod)
			}
		}
	}
	if getConnections {
		inboundConnections, outboundConnections, err := getNodeConnections[model.Host](ctx, hostIDs)
		if err == nil {
			for _, conn := range inboundConnections {
				index = hostIDIndex[conn.FromNodeID]
				hosts[index].InboundConnections = append(hosts[index].InboundConnections, model.Connection{
					NodeName: conn.NodeName,
					NodeID:   conn.NodeID,
					Count:    conn.Count,
					IPs:      conn.IPs,
				})
			}
			for _, conn := range outboundConnections {
				index = hostIDIndex[conn.FromNodeID]
				hosts[index].OutboundConnections = append(hosts[index].OutboundConnections, model.Connection{
					NodeName: conn.NodeName,
					NodeID:   conn.NodeID,
					Count:    conn.Count,
					IPs:      conn.IPs,
				})
			}
		}
	}

	return hosts, nil
}

func GetContainersReport(ctx context.Context, filter LookupFilter) ([]model.Container, error) {
	containers, err := getGenericDirectNodeReport[model.Container](ctx, filter)
	if err != nil {
		return nil, err
	}

	getProcesses := true
	getContainerImages := true
	if len(filter.InFieldFilter) > 0 {
		getProcesses = utils.InSlice("processes", filter.InFieldFilter)
		getContainerImages = utils.InSlice("image", filter.InFieldFilter)
	}

	containerIds := make([]string, len(containers))
	containerIDIndex := make(map[string]int)
	for i, container := range containers {
		containerIds[i] = container.ID
		containerIDIndex[container.ID] = i
	}

	var index int
	if getProcesses {
		processes, matched, err := getContainerProcesses(ctx, containerIds)
		if err == nil {
			for _, process := range processes {
				index = containerIDIndex[matched[process.ID]]
				containers[index].Processes = append(containers[index].Processes, process)
			}
		}
	}
	if getContainerImages {
		images, matched, err := getContainerContainerImages(ctx, containerIds)
		if err == nil {
			for _, image := range images {
				index = containerIDIndex[matched[image.ID]]
				containers[index].ContainerImage = image
			}
		}
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

	getContainers := true
	if len(filter.InFieldFilter) > 0 {
		getContainers = utils.InSlice("image", filter.InFieldFilter)
	}

	imagesIds := make([]string, len(images))
	imageIDIndex := make(map[string]int)
	for i, image := range images {
		imagesIds[i] = image.ID
		imageIDIndex[image.ID] = i
	}

	var index int
	if getContainers {
		containers, matched, err := getContainerImageContainers(ctx, imagesIds)
		if err == nil {
			for _, container := range containers {
				index = imageIDIndex[matched[container.ID]]
				images[index].Containers = append(images[index].Containers, container)
			}
		}
	}

	return images, nil
}

func GetKubernetesClustersReport(ctx context.Context, filter LookupFilter) ([]model.KubernetesCluster, error) {
	clusters, err := getGenericDirectNodeReport[model.KubernetesCluster](ctx, filter)
	if err != nil {
		return nil, err
	}

	getHosts := true
	if len(filter.InFieldFilter) > 0 {
		getHosts = utils.InSlice("hosts", filter.InFieldFilter)
	}

	clusterIDs := make([]string, len(clusters))
	clusterIDIndex := make(map[string]int)
	for i, cluster := range clusters {
		clusterIDs[i] = cluster.ID
		clusterIDIndex[cluster.ID] = i
	}

	var index int
	if getHosts {
		hosts, matched, err := getClusterHosts(ctx, clusterIDs)
		if err == nil {
			for _, host := range hosts {
				index = clusterIDIndex[matched[host.ID]]
				clusters[index].Hosts = append(clusters[index].Hosts, host)
			}
		}
	}

	return clusters, nil
}

func GetCloudResourcesReport(ctx context.Context, filter LookupFilter) ([]model.CloudResource, error) {
	entries, err := getGenericDirectNodeReport[model.CloudResource](ctx, filter)
	for _, entry := range entries {
		label, found := commonConstants.CSPMResourceLabels[commonConstants.CSPMResources[entry.Type]]
		if found {
			entry.TypeLabel = label
		}
	}
	if err != nil {
		return nil, err
	}

	return entries, nil
}

func GetRegistryAccountReport(ctx context.Context, filter LookupFilter) ([]model.RegistryAccount, error) {
	registry, err := getGenericDirectNodeReport[model.RegistryAccount](ctx, filter)
	if err != nil {
		return nil, err
	}

	getImages := true
	if len(filter.InFieldFilter) > 0 {
		getImages = utils.InSlice("container_images", filter.InFieldFilter)
	}

	registryIDs := make([]string, len(registry))
	registryIDIndex := make(map[string]int)
	for i, r := range registry {
		registryIDs[i] = r.ID
		registryIDIndex[r.ID] = i
	}

	var index int
	if getImages {
		images, matched, err := getRegistryImages(ctx, registryIDs)
		if err == nil {
			for _, image := range images {
				index = registryIDIndex[matched[image.ID]]
				registry[index].ContainerImages = append(registry[index].ContainerImages, image)
			}
		}
	}

	return registry, nil
}

func getGenericDirectNodeReport[T reporters.Cypherable](ctx context.Context, filter LookupFilter) ([]T, error) {

	ctx, span := telemetry.NewSpan(ctx, "lookup", "get-generic-direct-node-report")
	defer span.End()

	res := []T{}
	var dummy T

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	var r neo4j.ResultWithContext
	var query string
	if len(filter.NodeIds) == 0 {
		query = `
			MATCH (n:` + dummy.NodeType() + `)
			OPTIONAL MATCH (n) -[:IS]-> (e)
			CALL {
				WITH n
		        OPTIONAL MATCH (l) -[:DETECTED]-> (n)
		        OPTIONAL MATCH (l) -[:SCANNED]-> (k)
				WITH distinct k
				WHERE k.active=true
		        RETURN collect(coalesce(k.node_id, '') + '##' + coalesce(k.node_name, '') + '##' + coalesce(k.node_type, '')) as resources
			}
			RETURN ` + reporters.FieldFilterCypher("n", filter.InFieldFilter) + `, e, resources`
	} else {
		query = `
			MATCH (n:` + dummy.NodeType() + `)
			WHERE n.node_id IN $ids
			OPTIONAL MATCH (n) -[:IS]-> (e)
			CALL {
				WITH n
		        OPTIONAL MATCH (l) -[:DETECTED]-> (n)
		        OPTIONAL MATCH (l) -[:SCANNED]-> (k)
				WITH distinct k
				WHERE k.active=true
		        RETURN collect(coalesce(k.node_id, '') + '##' + coalesce(k.node_name, '') + '##' + coalesce(k.node_type, '')) as resources
			}
			RETURN ` + reporters.FieldFilterCypher("n", filter.InFieldFilter) + `, e, resources`
	}
	log.Debug().Msgf("query: %s", query)
	r, err = tx.Run(ctx, query,
		map[string]interface{}{"ids": filter.NodeIds})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect(ctx)

	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		var nodeMap map[string]interface{}
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
			nodeMap = da.Props
		} else {
			nodeMap = map[string]interface{}{}
			for i := range filter.InFieldFilter {
				nodeMap[filter.InFieldFilter[i]] = rec.Values[i]
			}
		}
		isNode, _ := rec.Get("e")
		if isNode != nil {
			for k, v := range isNode.(dbtype.Node).Props {
				if k != "node_id" {
					nodeMap[k] = v
				} else {
					nodeMap[dummy.ExtendedField()] = v
				}
			}
		}
		resources, isValue := rec.Get("resources")
		if isValue {
			resourceList := resources.([]interface{})
			resourceListString := make([]model.BasicNode, len(resourceList))
			for i, v := range resourceList {
				nodeDetails := strings.Split(v.(string), nodeReportResourcesSplit)
				if len(nodeDetails) != 3 {
					continue
				}
				resourceListString[i] = model.BasicNode{
					NodeID:   nodeDetails[0],
					Name:     nodeDetails[1],
					NodeType: nodeDetails[2],
				}
			}
			nodeMap["resources"] = resourceListString
		}
		var node T
		utils.FromMap(nodeMap, &node)
		res = append(res, node)
	}

	return res, nil
}

func getNodeConnections[T reporters.Cypherable](ctx context.Context, ids []string) ([]model.ConnectionQueryResp, []model.ConnectionQueryResp, error) {
	inbound := []model.ConnectionQueryResp{}
	outbound := []model.ConnectionQueryResp{}
	var dummy T
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return inbound, outbound, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return inbound, outbound, err
	}
	defer tx.Close(ctx)

	query := `
			MATCH (n:` + dummy.NodeType() + `)-[c:CONNECTS]-(m)
			WHERE n.node_id in $ids
			RETURN n.node_id,m.node_id,m.node_name,sum(size(c.left_pids)),(startNode(c) = n),c.left_ips,c.right_ips`
	r, err := tx.Run(ctx, query, map[string]interface{}{"ids": ids})
	if err != nil {
		return inbound, outbound, err
	}

	recs, err := r.Collect(ctx)
	if err != nil {
		return inbound, outbound, err
	}

	for _, rec := range recs {
		ips := []interface{}{}
		if rec.Values[5] != nil {
			ips = rec.Values[5].([]interface{})
		} else if rec.Values[6] != nil {
			ips = rec.Values[6].([]interface{})
		}
		connection := model.ConnectionQueryResp{
			FromNodeID: rec.Values[0].(string),
			NodeID:     rec.Values[1].(string),
			Count:      rec.Values[3].(int64),
			IPs:        ips,
		}
		if rec.Values[2] == nil {
			connection.NodeName = connection.NodeID
		} else {
			connection.NodeName = rec.Values[2].(string)
		}
		isOutbound := rec.Values[4].(bool)
		if isOutbound {
			outbound = append(outbound, connection)
		} else {
			inbound = append(inbound, connection)
		}
	}
	return inbound, outbound, nil
}

func getIndirectFromIDs[T any](ctx context.Context, query string, ids []string) ([]T, map[string]string, error) {

	ctx, span := telemetry.NewSpan(ctx, "lookup", "get-indirect-from-ids")
	defer span.End()

	res := []T{}
	matchedID := make(map[string]string)

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, matchedID, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, matchedID, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, query, map[string]interface{}{"ids": ids})

	if err != nil {
		return res, matchedID, err
	}

	recs, err := r.Collect(ctx)

	if err != nil {
		return res, matchedID, err
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

		nData, has := rec.Get("n.node_id")
		if !has {
			log.Warn().Msgf("Missing n.node_id")
			continue
		}
		var matchedNodeID string
		if matchedNodeID, ok = nData.(string); !ok {
			continue
		}
		matchedID[da.Props["node_id"].(string)] = matchedNodeID
		res = append(res, node)
	}

	return res, matchedID, nil
}

func getHostContainers(ctx context.Context, ids []string) ([]model.Container, map[string]string, error) {
	return getIndirectFromIDs[model.Container](ctx, `
		MATCH (n:Node) -[:HOSTS]-> (m:Container)
		WHERE n.node_id IN $ids
		RETURN m, n.node_id`,
		ids)
}

func getHostPods(ctx context.Context, ids []string) ([]model.Pod, map[string]string, error) {
	return getIndirectFromIDs[model.Pod](ctx, `
		MATCH (n:Node) -[:HOSTS]-> (m:Pod)
		WHERE n.node_id IN $ids
		RETURN m, n.node_id`,
		ids)
}

func getHostContainerImages(ctx context.Context, ids []string) ([]model.ContainerImage, map[string]string, error) {
	return getIndirectFromIDs[model.ContainerImage](ctx, `
		MATCH (n:Node) -[:HOSTS]-> (m:ContainerImage)
		WHERE n.node_id IN $ids
		RETURN m, n.node_id`,
		ids)
}

func getRegistryImages(ctx context.Context, ids []string) ([]model.ContainerImage, map[string]string, error) {
	return getIndirectFromIDs[model.ContainerImage](ctx, `
		MATCH (n:RegistryAccount) -[:HOSTS]-> (m:ContainerImage)
		WHERE n.node_id IN $ids
		RETURN m, n.node_id`,
		ids)
}

func getHostProcesses(ctx context.Context, ids []string) ([]model.Process, map[string]string, error) {
	return getIndirectFromIDs[model.Process](ctx, `
		MATCH (n:Node) -[:HOSTS]-> (m:Process)
		WHERE n.node_id IN $ids
		RETURN m, n.node_id`,
		ids)
}

func getContainerProcesses(ctx context.Context, ids []string) ([]model.Process, map[string]string, error) {
	return getIndirectFromIDs[model.Process](ctx, `
		MATCH (n:Container) -[:HOSTS]-> (m:Process)
		WHERE n.node_id IN $ids
		RETURN m, n.node_id`,
		ids)
}

func getContainerContainerImages(ctx context.Context, ids []string) ([]model.ContainerImage, map[string]string, error) {
	return getIndirectFromIDs[model.ContainerImage](ctx, `
		MATCH (n:Container)
		WHERE n.node_id IN $ids
		MATCH (m:ContainerImage{node_id:n.docker_image_id})
		RETURN m, n.node_id`,
		ids)
}

func getContainerImageContainers(ctx context.Context, ids []string) ([]model.Container, map[string]string, error) {
	return getIndirectFromIDs[model.Container](ctx, `
		MATCH (n:Container)
		WHERE n.docker_image_id in $ids
		RETURN n, n.docker_image_id`,
		ids)
}

func getClusterHosts(ctx context.Context, ids []string) ([]model.Host, map[string]string, error) {
	return getIndirectFromIDs[model.Host](ctx, `
		MATCH (n:KubernetesCluster) -[:INSTANCIATE]-> (m:Node)
		WHERE n.node_id IN $ids
		RETURN m, n.node_id`,
		ids)
}

func GetVulnerabilitiesReport(ctx context.Context, filter LookupFilter) ([]model.Vulnerability, error) {
	return getGenericDirectNodeReport[model.Vulnerability](ctx, filter)
}

func GetSecretsReport(ctx context.Context, filter LookupFilter) ([]model.Secret, error) {
	return getGenericDirectNodeReport[model.Secret](ctx, filter)
}

func GetMalwaresReport(ctx context.Context, filter LookupFilter) ([]model.Malware, error) {
	return getGenericDirectNodeReport[model.Malware](ctx, filter)
}

func GetComplianceReport(ctx context.Context, filter LookupFilter) ([]model.Compliance, error) {
	return getGenericDirectNodeReport[model.Compliance](ctx, filter)
}

func GetCloudComplianceReport(ctx context.Context, filter LookupFilter) ([]model.CloudCompliance, error) {
	return getGenericDirectNodeReport[model.CloudCompliance](ctx, filter)
}

package reporters_lookup

import (
	"context"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
	"github.com/rs/zerolog/log"
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

	hostIds := make([]string, len(hosts))
	hostIdIndex := make(map[string]int)
	for i, host := range hosts {
		hostIds[i] = host.ID
		hostIdIndex[host.ID] = i
	}

	var index int
	if getProcesses == true {
		processes, matched, err := getHostProcesses(ctx, hostIds)
		if err == nil {
			for _, process := range processes {
				index = hostIdIndex[matched[process.ID]]
				hosts[index].Processes = append(hosts[index].Processes, process)
			}
		}
	}
	if getContainers == true {
		containers, matched, err := getHostContainers(ctx, hostIds)
		if err == nil {
			for _, container := range containers {
				index = hostIdIndex[matched[container.ID]]
				hosts[index].Containers = append(hosts[index].Containers, container)
			}
		}
	}
	if getContainerImages == true {
		containerImages, matched, err := getHostContainerImages(ctx, hostIds)
		if err == nil {
			for _, containerImage := range containerImages {
				index = hostIdIndex[matched[containerImage.ID]]
				hosts[index].ContainerImages = append(hosts[index].ContainerImages, containerImage)
			}
		}
	}
	if getPods == true {
		pods, matched, err := getHostPods(ctx, hostIds)
		if err == nil {
			for _, pod := range pods {
				index = hostIdIndex[matched[pod.ID]]
				hosts[index].Pods = append(hosts[index].Pods, pod)
			}
		}
	}
	if getConnections == true {
		inboundConnections, outboundConnections, err := getNodeConnections[model.Host](ctx, hostIds)
		if err == nil {
			for _, conn := range inboundConnections {
				index = hostIdIndex[conn.FromNodeId]
				hosts[index].InboundConnections = append(hosts[index].InboundConnections, model.Connection{
					NodeName: conn.NodeName,
					NodeId:   conn.NodeId,
					Count:    conn.Count,
				})
			}
			for _, conn := range outboundConnections {
				index = hostIdIndex[conn.FromNodeId]
				hosts[index].OutboundConnections = append(hosts[index].OutboundConnections, model.Connection{
					NodeName: conn.NodeName,
					NodeId:   conn.NodeId,
					Count:    conn.Count,
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
	containerIdIndex := make(map[string]int)
	for i, container := range containers {
		containerIds[i] = container.ID
		containerIdIndex[container.ID] = i
	}

	var index int
	if getProcesses == true {
		processes, matched, err := getContainerProcesses(ctx, containerIds)
		if err == nil {
			for _, process := range processes {
				index = containerIdIndex[matched[process.ID]]
				containers[index].Processes = append(containers[index].Processes, process)
			}
		}
	}
	if getContainerImages == true {
		images, matched, err := getContainerContainerImages(ctx, containerIds)
		if err == nil {
			for _, image := range images {
				index = containerIdIndex[matched[image.ID]]
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
	imageIdIndex := make(map[string]int)
	for i, image := range images {
		imagesIds[i] = image.ID
		imageIdIndex[image.ID] = i
	}

	var index int
	if getContainers == true {
		containers, matched, err := getContainerImageContainers(ctx, imagesIds)
		if err == nil {
			for _, container := range containers {
				index = imageIdIndex[matched[container.ID]]
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

	clusterIds := make([]string, len(clusters))
	clusterIdIndex := make(map[string]int)
	for i, cluster := range clusters {
		clusterIds[i] = cluster.ID
		clusterIdIndex[cluster.ID] = i
	}

	var index int
	if getHosts == true {
		hosts, matched, err := getClusterHosts(ctx, clusterIds)
		if err == nil {
			for _, host := range hosts {
				index = clusterIdIndex[matched[host.ID]]
				clusters[index].Hosts = append(clusters[index].Hosts, host)
			}
		}
	}

	return clusters, nil
}

func GetCloudResourcesReport(ctx context.Context, filter LookupFilter) ([]model.CloudResource, error) {
	entries, err := getGenericDirectNodeReport[model.CloudResource](ctx, filter)
	for _, entry := range entries {
		label, found := commonConstants.CSPM_RESOURCE_LABELS[commonConstants.CSPM_RESOURCES[entry.Type]]
		if found {
			entry.Type = label
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

	registryIds := make([]string, len(registry))
	registryIdIndex := make(map[string]int)
	for i, r := range registry {
		registryIds[i] = r.ID
		registryIdIndex[r.ID] = i
	}

	var index int
	if getImages == true {
		images, matched, err := getRegistryImages(ctx, registryIds)
		if err == nil {
			for _, image := range images {
				index = registryIdIndex[matched[image.ID]]
				registry[index].ContainerImages = append(registry[index].ContainerImages, image)
			}
		}
	}

	return registry, nil
}

func getGenericDirectNodeReport[T reporters.Cypherable](ctx context.Context, filter LookupFilter) ([]T, error) {
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
	var query string
	if len(filter.NodeIds) == 0 {
		query = `
			MATCH (n:` + dummy.NodeType() + `)
			OPTIONAL MATCH (n) -[:IS]-> (e)
			RETURN ` + reporters.FieldFilterCypher("n", filter.InFieldFilter) + `, e`
	} else {
		query = `
			MATCH (n:` + dummy.NodeType() + `)
			WHERE n.node_id IN $ids
			OPTIONAL MATCH (n) -[:IS]-> (e)
			RETURN ` + reporters.FieldFilterCypher("n", filter.InFieldFilter) + `, e`
	}
	log.Info().Msgf("query: %s", query)
	r, err = tx.Run(query,
		map[string]interface{}{"ids": filter.NodeIds})

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
				if k != "node_id" {
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

func getNodeConnections[T reporters.Cypherable](ctx context.Context, ids []string) ([]model.ConnectionQueryResp, []model.ConnectionQueryResp, error) {
	inbound := []model.ConnectionQueryResp{}
	outbound := []model.ConnectionQueryResp{}
	var dummy T
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return inbound, outbound, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return inbound, outbound, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return inbound, outbound, err
	}
	defer tx.Close()

	query := `
			MATCH (n:` + dummy.NodeType() + `)-[c:CONNECTS]-(m) 
			WHERE n.node_id in $ids
			RETURN n.node_id,m.node_id,m.node_name,count(c),(startNode(c) = n)`
	r, err := tx.Run(query, map[string]interface{}{"ids": ids})
	if err != nil {
		return inbound, outbound, err
	}

	recs, err := r.Collect()
	if err != nil {
		return inbound, outbound, err
	}

	for _, rec := range recs {
		connection := model.ConnectionQueryResp{
			FromNodeId: rec.Values[0].(string),
			NodeId:     rec.Values[1].(string),
			Count:      rec.Values[3].(int64),
		}
		if rec.Values[2] == nil {
			connection.NodeName = connection.NodeId
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
	res := []T{}
	matchedId := make(map[string]string)

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, matchedId, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, matchedId, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, matchedId, err
	}
	defer tx.Close()

	r, err := tx.Run(query, map[string]interface{}{"ids": ids})

	if err != nil {
		return res, matchedId, err
	}

	recs, err := r.Collect()

	if err != nil {
		return res, matchedId, err
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

		n_data, has := rec.Get("n.node_id")
		if !has {
			log.Warn().Msgf("Missing n.node_id")
			continue
		}
		var matchedNodeId string
		if matchedNodeId, ok = n_data.(string); !ok {
			continue
		}
		matchedId[da.Props["node_id"].(string)] = matchedNodeId
		res = append(res, node)
	}

	return res, matchedId, nil
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

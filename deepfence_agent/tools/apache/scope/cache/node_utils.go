package cache

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"github.com/weaveworks/scope/render/detailed"
	"log"
	"strconv"
	"strings"
)

func (r *RedisCache) getDfIdFromScopeId(scopeID string) string {
	temp := []byte(scopeID + r.nodeType)
	return fmt.Sprintf("%x", md5.Sum(temp))
}

func (r *RedisCache) getDfIdFromScopeIdNodeType(scopeID string, nodeType string) string {
	temp := []byte(scopeID + nodeType)
	return fmt.Sprintf("%x", md5.Sum(temp))
}

func (r *RedisCache) formatParentNodes(parents []detailed.Parent) []ParentNode {
	// Get formatted data for children / parents
	parentNodes := make([]ParentNode, len(parents))
	// {
	//   "parents": [
	//     {
	//       "id": "k8s.gcr.io/pause;<container_image>",
	//       "label": "k8s.gcr.io/pause",
	//       "topologyId": "containers-by-image"
	//     }
	//   ]
	// }
	//
	for i, parent := range parents {
		parentNode := ParentNode{Type: TopologyIdNodeTypeMap[parent.TopologyID], Label: parent.Label, ID: r.getDfIdFromScopeIdNodeType(parent.ID, TopologyIdNodeTypeMap[parent.TopologyID])}
		parentNodes[i] = parentNode
	}
	return parentNodes
}

func (r *RedisCache) formatAdjacency(adjacenciesScopeId []string) []string {
	// Adjacency - scope_id to df_id
	adjacencies := make([]string, len(adjacenciesScopeId))
	for i, scopeId := range adjacenciesScopeId {
		adjacencies[i] = r.getDfIdFromScopeId(scopeId)
	}
	return adjacencies
}

func (r *RedisCache) formatHostNodeDetail(scopeTopology detailed.NodeSummary) (DeepfenceTopology, string, []string) {
	var dfTopology = DeepfenceTopology{HostName: scopeTopology.Label, ID: r.getDfIdFromScopeId(scopeTopology.ID),
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, Name: scopeTopology.Label,
		ScopeId: scopeTopology.ID, UserDefinedTags: make([]string, 0)}
	probeId := ""
	var localNetworks []string
	cloudMetadata := CloudMetadata{}
	dfTopology.CloudMetadata = &cloudMetadata

	for _, metadata := range scopeTopology.Metadata {
		switch metadata.ID {
		case "local_networks":
			for _, nw := range strings.Split(metadata.Value, ",") {
				localNetworks = append(localNetworks, strings.TrimSpace(nw))
			}
			dfTopology.LocalNetworks = localNetworks
		case "probeId":
			probeId = metadata.Value
		case "interfaceNames":
			dfTopology.InterfaceNames = strings.Split(metadata.Value, ";")
		case "kernel_version":
			dfTopology.KernelVersion = metadata.Value
		case "uptime":
			dfTopology.Uptime, _ = strconv.Atoi(metadata.Value)
		case "authToken":
			dfTopology.AuthToken = metadata.Value
		case "os":
			dfTopology.Os = metadata.Value
		case "connectedProcesses":
			var connectedProcesses ConnectedProcesses
			err := json.Unmarshal([]byte(metadata.Value), &connectedProcesses)
			if err == nil {
				dfTopology.ConnectedProcesses = &connectedProcesses
			}
		case "cloud_metadata":
			err := json.Unmarshal([]byte(metadata.Value), &cloudMetadata)
			if err == nil {
				dfTopology.CloudMetadata = &cloudMetadata
			}
		case "interface_ips":
			var interfaceIps map[string]string
			err := json.Unmarshal([]byte(metadata.Value), &interfaceIps)
			if err == nil {
				dfTopology.InterfaceIps = interfaceIps
			}
		case "cloud_provider":
			dfTopology.CloudProvider = metadata.Value
		case "kubernetes_cluster_id":
			dfTopology.KubernetesClusterId = metadata.Value
		case "kubernetes_cluster_name":
			dfTopology.KubernetesClusterName = metadata.Value
		case "is_ui_vm":
			if metadata.Value == "true" {
				dfTopology.IsUiVm = true
			}
		case "user_defined_tags":
			if metadata.Value != "" {
				dfTopology.UserDefinedTags = append(dfTopology.UserDefinedTags, strings.Split(metadata.Value, ",")...)
			}
		case "cloud_tags":
			if metadata.Value != "" {
				dfTopology.UserDefinedTags = append(dfTopology.UserDefinedTags, strings.Split(metadata.Value, ",")...)
			}
		case "version":
			dfTopology.AgentVersion = metadata.Value
		case "agent_running":
			dfTopology.AgentRunning = metadata.Value
			if dfTopology.AgentRunning == "no" {
				dfTopology.Pseudo = true
			}
		}
	}
	dfTopology.Metrics = scopeTopology.Metrics
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology, probeId, localNetworks
}

func (r *RedisCache) formatTopologyHostData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	noOfHosts := 0
	noOfUnprotectedHosts := 0
	hostNameProbeIdMap := map[string]string{}
	countOfHostsByUser := make(map[string]int)
	localNetworksAllHosts := make([]string, 0)
	topologyFilters := []TopologyFilterOption{
		{Name: "agent_running", Label: "Agent Running", Type: filterTypeStr, Options: []string{"yes", "no"}, NumberOptions: nil},
		{Name: "is_ui_vm", Label: "Console VM", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
		{Name: "pseudo", Label: "Pseudo", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
		{Name: "vulnerability_scan_status", Label: "Vulnerability Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
		{Name: "secret_scan_status", Label: "Secret Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
		{Name: "malware_scan_status", Label: "Malware Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
	}
	var nodeIdVulnerabilityStatusMap, nodeIdVulnerabilityStatusTimeMap, nodeIdSecretStatusMap, nodeIdMalwareStatusMap, nodeIdSecretStatusTimeMap map[string]string
	var nodeIdMalwareStatusTimeMap map[string]string
	r.nodeStatus.RLock()
	nodeIdVulnerabilityStatusMap = r.nodeStatus.VulnerabilityScanStatus
	nodeIdVulnerabilityStatusTimeMap = r.nodeStatus.VulnerabilityScanStatusTime
	nodeIdSecretStatusMap = r.nodeStatus.SecretScanStatus
	nodeIdSecretStatusTimeMap = r.nodeStatus.SecretScanStatusTime
	nodeIdMalwareStatusMap  = r.nodeStatus.MalwareScanStatus
	nodeIdMalwareStatusTimeMap = r.nodeStatus.MalwareScanStatusTime
	r.nodeStatus.RUnlock()
	var filtersHostName, filtersKernelVersion, filtersOs, filtersCloudProvider, filtersInstanceType []string
	var filtersAvailabilityZone, filtersDataCenter, filtersZone, filtersLocation, filtersSKU []string
	var filtersResourceGroupName, filtersKubernetesClusterId, filtersKubernetesClusterName, filtersUserDefinedTags, filtersAgentVersion []string
	for _, scopeTopology := range nodeSummaries {
		dfTopology, probeId, localNetworks := r.formatHostNodeDetail(scopeTopology)
		localNetworksAllHosts = append(localNetworksAllHosts, localNetworks...)
		hostNameProbeIdMap[dfTopology.HostName] = probeId
		dfTopology.VulnerabilityScanStatus = nodeIdVulnerabilityStatusMap[dfTopology.HostName]
		if dfTopology.VulnerabilityScanStatus == "" {
			dfTopology.VulnerabilityScanStatus = scanStatusNeverScanned
		}
		dfTopology.VulnerabilityScanStatusTime = nodeIdVulnerabilityStatusTimeMap[dfTopology.HostName]
		dfTopology.SecretScanStatus = nodeIdSecretStatusMap[dfTopology.HostName]
		if dfTopology.SecretScanStatus == "" {
			dfTopology.SecretScanStatus = scanStatusNeverScanned
		}
		dfTopology.SecretScanStatusTime = nodeIdSecretStatusTimeMap[dfTopology.HostName]
		dfTopology.MalwareScanStatus = nodeIdMalwareStatusMap[dfTopology.HostName]
		if dfTopology.MalwareScanStatus == "" {
			dfTopology.MalwareScanStatus = scanStatusNeverScanned
		}
		dfTopology.MalwareScanStatusTime = nodeIdMalwareStatusTimeMap[dfTopology.HostName]
		if dfTopology.AgentRunning == "no" {
			noOfUnprotectedHosts += 1
		}
		if dfTopology.Pseudo == false && dfTopology.IsUiVm == false {
			noOfHosts += 1
			if dfTopology.AuthToken != "" {
				countOfHostsByUser[dfTopology.AuthToken] += 1
			}
			filtersHostName = append(filtersHostName, dfTopology.HostName)
			if dfTopology.KernelVersion != "" && !InArray(dfTopology.KernelVersion, filtersKernelVersion) {
				filtersKernelVersion = append(filtersKernelVersion, dfTopology.KernelVersion)
			}
			if dfTopology.Os != "" && !InArray(dfTopology.Os, filtersOs) {
				filtersOs = append(filtersOs, dfTopology.Os)
			}
			if dfTopology.CloudProvider != "" && !InArray(dfTopology.CloudProvider, filtersCloudProvider) {
				filtersCloudProvider = append(filtersCloudProvider, dfTopology.CloudProvider)
			}
			if dfTopology.CloudMetadata.InstanceType != "" && !InArray(dfTopology.CloudMetadata.InstanceType, filtersInstanceType) {
				filtersInstanceType = append(filtersInstanceType, dfTopology.CloudMetadata.InstanceType)
			}
			if dfTopology.CloudMetadata.AvailabilityZone != "" && !InArray(dfTopology.CloudMetadata.AvailabilityZone, filtersAvailabilityZone) {
				filtersAvailabilityZone = append(filtersAvailabilityZone, dfTopology.CloudMetadata.AvailabilityZone)
			}
			if dfTopology.CloudMetadata.DataCenter != "" && !InArray(dfTopology.CloudMetadata.DataCenter, filtersDataCenter) {
				filtersDataCenter = append(filtersDataCenter, dfTopology.CloudMetadata.DataCenter)
			}
			if dfTopology.CloudMetadata.Zone != "" && !InArray(dfTopology.CloudMetadata.Zone, filtersZone) {
				filtersZone = append(filtersZone, dfTopology.CloudMetadata.Zone)
			}
			if dfTopology.CloudMetadata.Location != "" && !InArray(dfTopology.CloudMetadata.Location, filtersLocation) {
				filtersLocation = append(filtersLocation, dfTopology.CloudMetadata.Location)
			}
			if dfTopology.CloudMetadata.SKU != "" && !InArray(dfTopology.CloudMetadata.SKU, filtersSKU) {
				filtersSKU = append(filtersSKU, dfTopology.CloudMetadata.SKU)
			}
			if dfTopology.CloudMetadata.ResourceGroupName != "" && !InArray(dfTopology.CloudMetadata.ResourceGroupName, filtersResourceGroupName) {
				filtersResourceGroupName = append(filtersResourceGroupName, dfTopology.CloudMetadata.ResourceGroupName)
			}
			if dfTopology.KubernetesClusterId != "" && !InArray(dfTopology.KubernetesClusterId, filtersKubernetesClusterId) {
				filtersKubernetesClusterId = append(filtersKubernetesClusterId, dfTopology.KubernetesClusterId)
			}
			if dfTopology.KubernetesClusterName != "" && !InArray(dfTopology.KubernetesClusterName, filtersKubernetesClusterName) {
				filtersKubernetesClusterName = append(filtersKubernetesClusterName, dfTopology.KubernetesClusterName)
			}
			if len(dfTopology.UserDefinedTags) > 0 {
				for _, tag := range dfTopology.UserDefinedTags {
					if !InArray(tag, filtersUserDefinedTags) {
						filtersUserDefinedTags = append(filtersUserDefinedTags, tag)
					}
				}
			}
			if dfTopology.AgentVersion != "" && !InArray(dfTopology.AgentVersion, filtersAgentVersion) {
				filtersAgentVersion = append(filtersAgentVersion, dfTopology.AgentVersion)
			}
		}
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	redisConn := r.redisPool.Get()
	defer redisConn.Close()
	localNetworksAllHosts = uniqueSlice(localNetworksAllHosts)
	localNetworksAllHostsJson, _ := CodecEncode(localNetworksAllHosts)
	_, err := redisConn.Do("SETEX", topologyLocalNetworksRedisKey, RedisExpiryTime, string(localNetworksAllHostsJson))
	if err != nil {
		log.Println("Error: SETEX "+topologyLocalNetworksRedisKey, err)
	}
	hostNameProbeIdMapJson, _ := CodecEncode(hostNameProbeIdMap)
	_, err = redisConn.Do("SETEX", topologyHostsProbeMapRedisKey, RedisExpiryTime, string(hostNameProbeIdMapJson))
	if err != nil {
		log.Println("Error: SETEX "+topologyHostsProbeMapRedisKey, err)
	}
	countOfHostsByUserJson, _ := CodecEncode(countOfHostsByUser)
	_, err = redisConn.Do("SETEX", countOfHostsByUserKey, RedisExpiryTime, string(countOfHostsByUserJson))
	if err != nil {
		log.Println("Error: SETEX "+countOfHostsByUserKey, err)
	}
	_, err = redisConn.Do("SETEX", noOfHostsRedisKey, RedisExpiryTime, noOfHosts)
	if err != nil {
		log.Println("Error: SETEX "+noOfHostsRedisKey, err)
	}
	_, err = redisConn.Do("HSET", ScopeTopologyCount, r.nodeType, noOfHosts, r.nodeType+"_unprotected", noOfUnprotectedHosts, "cloud_provider", len(filtersCloudProvider))
	if err != nil {
		log.Println("Error: HSET "+ScopeTopologyCount, err)
	}
	if len(filtersHostName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "host_name", Label: "Hostname", Type: filterTypeStr, Options: filtersHostName, NumberOptions: nil})
	}
	if len(filtersKernelVersion) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kernel_version", Label: "Kernel Version", Type: filterTypeStr, Options: filtersKernelVersion, NumberOptions: nil})
	}
	if len(filtersOs) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "os", Label: "Os", Type: filterTypeStr, Options: filtersOs, NumberOptions: nil})
	}
	if len(filtersCloudProvider) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_provider", Label: "Cloud Provider", Type: filterTypeStr, Options: filtersCloudProvider, NumberOptions: nil})
	}
	if len(filtersInstanceType) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_metadata.instance_type", Label: "Instance Type", Type: filterTypeStr, Options: filtersInstanceType, NumberOptions: nil})
	}
	if len(filtersAvailabilityZone) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_metadata.availability_zone", Label: "Availability Zone", Type: filterTypeStr, Options: filtersAvailabilityZone, NumberOptions: nil})
	}
	if len(filtersDataCenter) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_metadata.data_center", Label: "Data Center", Type: filterTypeStr, Options: filtersDataCenter, NumberOptions: nil})
	}
	if len(filtersZone) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_metadata.zone", Label: "Zone", Type: filterTypeStr, Options: filtersZone, NumberOptions: nil})
	}
	if len(filtersLocation) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_metadata.location", Label: "Location", Type: filterTypeStr, Options: filtersLocation, NumberOptions: nil})
	}
	if len(filtersSKU) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_metadata.sku", Label: "SKU", Type: filterTypeStr, Options: filtersSKU, NumberOptions: nil})
	}
	if len(filtersResourceGroupName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "cloud_metadata.resource_group_name", Label: "Resource Group Name", Type: filterTypeStr, Options: filtersResourceGroupName, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterId) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_id", Label: "Kubernetes Cluster Id", Type: filterTypeStr, Options: filtersKubernetesClusterId, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_name", Label: "Kubernetes Cluster Name", Type: filterTypeStr, Options: filtersKubernetesClusterName, NumberOptions: nil})
	}
	if len(filtersUserDefinedTags) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "user_defined_tags", Label: "User Defined Tags", Type: filterTypeStr, Options: filtersUserDefinedTags, NumberOptions: nil})
	}
	if len(filtersAgentVersion) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "version", Label: "Sensor Version", Type: filterTypeStr, Options: filtersAgentVersion, NumberOptions: nil})
	}
	topologyFiltersJson, _ := CodecEncode(topologyFilters)
	_, err = redisConn.Do("SETEX", r.filterRedisKey, RedisExpiryTime, string(topologyFiltersJson))
	if err != nil {
		log.Println("Error: SETEX "+r.filterRedisKey, err)
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatContainerNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{ContainerName: scopeTopology.Label, Name: scopeTopology.Label, ID: r.getDfIdFromScopeId(scopeTopology.ID),
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, HostName: scopeTopology.LabelMinor, Meta: scopeTopology.LabelMinor, ScopeId: scopeTopology.ID, UserDefinedTags: make([]string, 0)}

	for _, metadata := range scopeTopology.Metadata {
		switch metadata.ID {
		case "docker_image_name":
			dfTopology.ImageName = metadata.Value
		case "docker_image_tag":
			dfTopology.ImageTag = metadata.Value
		case "docker_container_command":
			dfTopology.DockerContainerCommand = metadata.Value
		case "docker_container_state_human":
			statusStopped := []string{dockerStateExited, dockerStateRestarting, dockerStateDead, dockerStateRemoving, dockerStateCreated, dockerStateDeleted}
			statusPaused := []string{dockerStatePaused}
			statusRunning := []string{dockerStateUp, dockerStateRunning}
			cState := strings.ToLower(metadata.Value)
			for _, state := range statusStopped {
				if strings.Contains(cState, state) {
					dfTopology.DockerContainerState = dockerStateStopped
					break
				}
			}
			if dfTopology.DockerContainerState == "" {
				for _, state := range statusPaused {
					if strings.Contains(cState, state) {
						dfTopology.DockerContainerState = dockerStatePaused
						break
					}
				}
			}
			if dfTopology.DockerContainerState == "" {
				for _, state := range statusRunning {
					if strings.Contains(cState, state) {
						dfTopology.DockerContainerState = dockerStateRunning
						break
					}
				}
			}
		case "docker_container_uptime":
			dfTopology.DockerContainerUptime, _ = strconv.Atoi(metadata.Value)
		case "docker_container_networks":
			dfTopology.DockerContainerNetworks = metadata.Value
		case "docker_container_ips":
			var containerIps []string
			for _, ip := range strings.Split(metadata.Value, ",") {
				containerIps = append(containerIps, strings.TrimSpace(ip))
			}
			dfTopology.DockerContainerIps = containerIps
		case "docker_container_ports":
			dfTopology.DockerContainerPorts = metadata.Value
		case "docker_container_created":
			dfTopology.DockerContainerCreated = metadata.Value
		case "docker_container_id":
			dfTopology.DockerContainerID = metadata.Value
		case "is_ui_vm":
			if metadata.Value == "true" {
				dfTopology.IsUiVm = true
			}
		case "docker_image_id":
			dfTopology.DockerImageID = metadata.Value
		case "user_defined_tags":
			if metadata.Value != "" {
				dfTopology.UserDefinedTags = strings.Split(metadata.Value, ",")
			}
		case "kubernetes_cluster_id":
			dfTopology.KubernetesClusterId = metadata.Value
		case "kubernetes_cluster_name":
			dfTopology.KubernetesClusterName = metadata.Value
		}
	}
	dfTopology.Metrics = scopeTopology.Metrics
	if dfTopology.ImageName != "" && dfTopology.ImageTag != "" {
		dfTopology.ImageNameWithTag = fmt.Sprintf("%s:%s", dfTopology.ImageName, dfTopology.ImageTag)
	}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyContainerData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	noOfContainers := 0
	topologyFilters := []TopologyFilterOption{
		{Name: "is_ui_vm", Label: "Console VM", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
		{Name: "pseudo", Label: "Pseudo", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
		{Name: "docker_container_state", Label: "Container State", Type: filterTypeStr, Options: []string{dockerStateStopped, dockerStatePaused, dockerStateRunning}, NumberOptions: nil},
		{Name: "vulnerability_scan_status", Label: "Vulnerability Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
		{Name: "secret_scan_status", Label: "Secret Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
		{Name: "malware_scan_status", Label: "Malware Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
	}
	var nodeIdVulnerabilityStatusMap, nodeIdVulnerabilityStatusTimeMap, nodeIdSecretStatusMap, nodeIdMalwareStatusMap, nodeIdSecretStatusTimeMap map[string]string
	var nodeIdMalwareStatusTimeMap map[string]string
	r.nodeStatus.RLock()
	nodeIdVulnerabilityStatusMap = r.nodeStatus.VulnerabilityScanStatus
	nodeIdVulnerabilityStatusTimeMap = r.nodeStatus.VulnerabilityScanStatusTime
	nodeIdSecretStatusMap = r.nodeStatus.SecretScanStatus
	nodeIdSecretStatusTimeMap = r.nodeStatus.SecretScanStatusTime
	nodeIdMalwareStatusMap = r.nodeStatus.MalwareScanStatus
	nodeIdMalwareStatusTimeMap = r.nodeStatus.MalwareScanStatusTime
	r.nodeStatus.RUnlock()
	var filtersHostName, filtersUserDefinedTags, filtersImageName, filtersImageTag, filtersImageNameWithTag, filtersContainerName, filtersKubernetesClusterId, filtersKubernetesClusterName []string
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatContainerNodeDetail(scopeTopology)
		dfTopology.VulnerabilityScanStatus = nodeIdVulnerabilityStatusMap[dfTopology.ImageNameWithTag]
		if dfTopology.VulnerabilityScanStatus == "" {
			dfTopology.VulnerabilityScanStatus = scanStatusNeverScanned
		}
		dfTopology.VulnerabilityScanStatusTime = nodeIdVulnerabilityStatusTimeMap[dfTopology.ImageNameWithTag]
		dfTopology.SecretScanStatus = nodeIdSecretStatusMap[dfTopology.ImageNameWithTag]
		if dfTopology.SecretScanStatus == "" {
			dfTopology.SecretScanStatus = scanStatusNeverScanned
		}
		dfTopology.SecretScanStatusTime = nodeIdSecretStatusTimeMap[dfTopology.ImageNameWithTag]
		dfTopology.MalwareScanStatus = nodeIdMalwareStatusMap[dfTopology.ImageNameWithTag]
		if dfTopology.MalwareScanStatus == "" {
			dfTopology.MalwareScanStatus = scanStatusNeverScanned
		}
		dfTopology.MalwareScanStatusTime = nodeIdMalwareStatusTimeMap[dfTopology.ImageNameWithTag]
		if dfTopology.Pseudo == false && dfTopology.IsUiVm == false {
			cnameSplit := strings.Split(dfTopology.ContainerName, "/")
			if len(cnameSplit) > 1 {
				if cnameSplit[0] != kubeSystemNamespace && cnameSplit[0] != KubePublicNamespace {
					noOfContainers += 1
				}
			} else {
				noOfContainers += 1
			}
			if dfTopology.Name != "" && !InArray(dfTopology.Name, filtersContainerName) {
				filtersContainerName = append(filtersContainerName, dfTopology.ContainerName)
			}
			if dfTopology.HostName != "" && !InArray(dfTopology.HostName, filtersHostName) {
				filtersHostName = append(filtersHostName, dfTopology.HostName)
			}
			if dfTopology.ImageName != "" && !InArray(dfTopology.ImageName, filtersImageName) {
				filtersImageName = append(filtersImageName, dfTopology.ImageName)
			}
			if dfTopology.ImageTag != "" && !InArray(dfTopology.ImageTag, filtersImageTag) {
				filtersImageTag = append(filtersImageTag, dfTopology.ImageTag)
			}
			if dfTopology.ImageNameWithTag != "" && !InArray(dfTopology.ImageNameWithTag, filtersImageNameWithTag) {
				filtersImageNameWithTag = append(filtersImageNameWithTag, dfTopology.ImageNameWithTag)
			}
			if len(dfTopology.UserDefinedTags) > 0 {
				for _, tag := range dfTopology.UserDefinedTags {
					if !InArray(tag, filtersUserDefinedTags) {
						filtersUserDefinedTags = append(filtersUserDefinedTags, tag)
					}
				}
			}
			if dfTopology.KubernetesClusterId != "" && !InArray(dfTopology.KubernetesClusterId, filtersKubernetesClusterId) {
				filtersKubernetesClusterId = append(filtersKubernetesClusterId, dfTopology.KubernetesClusterId)
			}
			if dfTopology.KubernetesClusterName != "" && !InArray(dfTopology.KubernetesClusterName, filtersKubernetesClusterName) {
				filtersKubernetesClusterName = append(filtersKubernetesClusterName, dfTopology.KubernetesClusterName)
			}
		}

		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	redisConn := r.redisPool.Get()
	defer redisConn.Close()
	_, err := redisConn.Do("HSET", ScopeTopologyCount, r.nodeType, noOfContainers)
	if err != nil {
		log.Println("Error: HSET "+ScopeTopologyCount, err)
	}
	if len(filtersContainerName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "container_name", Label: "Container Name", Type: filterTypeStr, Options: filtersContainerName, NumberOptions: nil})
	}
	if len(filtersHostName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "host_name", Label: "Hostname", Type: filterTypeStr, Options: filtersHostName, NumberOptions: nil})
	}
	if len(filtersImageName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "image_name", Label: "Image Name", Type: filterTypeStr, Options: filtersImageName, NumberOptions: nil})
	}
	if len(filtersImageTag) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "image_tag", Label: "Image Tag", Type: filterTypeStr, Options: filtersImageTag, NumberOptions: nil})
	}
	if len(filtersImageNameWithTag) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "image_name_with_tag", Label: "Image Name and Tag", Type: filterTypeStr, Options: filtersImageNameWithTag, NumberOptions: nil})
	}
	if len(filtersUserDefinedTags) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "user_defined_tags", Label: "User Defined Tags", Type: filterTypeStr, Options: filtersUserDefinedTags, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterId) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_id", Label: "Kubernetes Cluster Id", Type: filterTypeStr, Options: filtersKubernetesClusterId, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_name", Label: "Kubernetes Cluster Name", Type: filterTypeStr, Options: filtersKubernetesClusterName, NumberOptions: nil})
	}
	topologyFiltersJson, _ := CodecEncode(topologyFilters)
	_, err = redisConn.Do("SETEX", r.filterRedisKey, RedisExpiryTime, string(topologyFiltersJson))
	if err != nil {
		log.Println("Error: SETEX "+r.filterRedisKey, err)
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatContainerImageNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{ID: r.getDfIdFromScopeId(scopeTopology.ID), Name: scopeTopology.Label,
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, ScopeId: scopeTopology.ID, UserDefinedTags: make([]string, 0)}
	for _, parent := range scopeTopology.Parents {
		if parent.TopologyID == TopologyIdHost {
			dfTopology.HostName = parent.Label
			break
		}
	}
	for _, metadata := range scopeTopology.Metadata {
		switch metadata.ID {
		case "container":
			dfTopology.ContainerCount, _ = strconv.Atoi(metadata.Value)
		case "docker_image_name":
			dfTopology.ImageName = metadata.Value
		case "docker_image_tag":
			dfTopology.ImageTag = metadata.Value
		case "docker_image_size":
			dfTopology.DockerImageSize = metadata.Value
		case "docker_image_virtual_size":
			dfTopology.DockerImageVirtualSize = metadata.Value
		case "docker_image_created_at":
			dfTopology.DockerImageCreatedAt = metadata.Value
		case "docker_image_id":
			dfTopology.DockerImageID = metadata.Value
		case "user_defined_tags":
			if metadata.Value != "" {
				dfTopology.UserDefinedTags = strings.Split(metadata.Value, ",")
			}
		}
	}
	if dfTopology.ImageName != "" && dfTopology.ImageTag != "" {
		dfTopology.ImageNameWithTag = fmt.Sprintf("%s:%s", dfTopology.ImageName, dfTopology.ImageTag)
	}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyContainerImageData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	noOfImages := 0
	topologyFilters := []TopologyFilterOption{
		{Name: "pseudo", Label: "Pseudo", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
		{Name: "vulnerability_scan_status", Label: "Vulnerability Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
		{Name: "secret_scan_status", Label: "Secret Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
		{Name: "malware_scan_status", Label: "Malware Scan Status", Type: filterTypeStr, Options: []string{"queued", "in_progress", "complete", "error", "never_scanned"}, NumberOptions: nil},
	}
	var nodeIdVulnerabilityStatusMap, nodeIdVulnerabilityStatusTimeMap, nodeIdSecretStatusMap, nodeIdMalwareStatusMap, nodeIdSecretStatusTimeMap map[string]string
	var nodeIdMalwareStatusTimeMap map[string]string
	r.nodeStatus.RLock()            
	nodeIdVulnerabilityStatusMap = r.nodeStatus.VulnerabilityScanStatus
	nodeIdVulnerabilityStatusTimeMap = r.nodeStatus.VulnerabilityScanStatusTime
	nodeIdSecretStatusMap = r.nodeStatus.SecretScanStatus
	nodeIdSecretStatusTimeMap = r.nodeStatus.SecretScanStatusTime
	nodeIdMalwareStatusMap = r.nodeStatus.MalwareScanStatus
	nodeIdMalwareStatusTimeMap = r.nodeStatus.MalwareScanStatusTime
	r.nodeStatus.RUnlock()
	var filtersUserDefinedTags, filtersImageName, filtersImageTag, filtersImageNameWithTag []string
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatContainerImageNodeDetail(scopeTopology)
		dfTopology.VulnerabilityScanStatus = nodeIdVulnerabilityStatusMap[dfTopology.ImageNameWithTag]
		if dfTopology.VulnerabilityScanStatus == "" {
			dfTopology.VulnerabilityScanStatus = scanStatusNeverScanned
		}
		dfTopology.VulnerabilityScanStatusTime = nodeIdVulnerabilityStatusTimeMap[dfTopology.ImageNameWithTag]
		dfTopology.SecretScanStatus = nodeIdSecretStatusMap[dfTopology.ImageNameWithTag]
		if dfTopology.SecretScanStatus == "" {
			dfTopology.SecretScanStatus = scanStatusNeverScanned
		}
		dfTopology.SecretScanStatusTime = nodeIdSecretStatusTimeMap[dfTopology.ImageNameWithTag]
		dfTopology.MalwareScanStatusTime = nodeIdMalwareStatusTimeMap[dfTopology.ImageNameWithTag]
		dfTopology.MalwareScanStatus = nodeIdMalwareStatusMap[dfTopology.ImageNameWithTag]
		if dfTopology.Pseudo == false {
			noOfImages += 1
			if dfTopology.ImageName != "" && !InArray(dfTopology.ImageName, filtersImageName) {
				filtersImageName = append(filtersImageName, dfTopology.ImageName)
			}
			if dfTopology.ImageTag != "" && !InArray(dfTopology.ImageTag, filtersImageTag) {
				filtersImageTag = append(filtersImageTag, dfTopology.ImageTag)
			}
			if dfTopology.ImageNameWithTag != "" && !InArray(dfTopology.ImageNameWithTag, filtersImageNameWithTag) {
				filtersImageNameWithTag = append(filtersImageNameWithTag, dfTopology.ImageNameWithTag)
			}
			if len(dfTopology.UserDefinedTags) > 0 {
				for _, tag := range dfTopology.UserDefinedTags {
					if !InArray(tag, filtersUserDefinedTags) {
						filtersUserDefinedTags = append(filtersUserDefinedTags, tag)
					}
				}
			}
		}
		
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	redisConn := r.redisPool.Get()
	defer redisConn.Close()
	_, err := redisConn.Do("HSET", ScopeTopologyCount, r.nodeType, noOfImages)
	if err != nil {
		log.Println("Error: HSET "+ScopeTopologyCount, err)
	}
	if len(filtersImageName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "image_name", Label: "Image Name", Type: filterTypeStr, Options: filtersImageName, NumberOptions: nil})
	}
	if len(filtersImageTag) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "image_tag", Label: "Image Tag", Type: filterTypeStr, Options: filtersImageTag, NumberOptions: nil})
	}
	if len(filtersImageNameWithTag) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "image_name_with_tag", Label: "Image", Type: filterTypeStr, Options: filtersImageNameWithTag, NumberOptions: nil})
	}
	if len(filtersUserDefinedTags) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "user_defined_tags", Label: "User Defined Tags", Type: filterTypeStr, Options: filtersUserDefinedTags, NumberOptions: nil})
	}
	topologyFiltersJson, _ := CodecEncode(topologyFilters)
	_, err = redisConn.Do("SETEX", r.filterRedisKey, RedisExpiryTime, string(topologyFiltersJson))
	if err != nil {
		log.Println("Error: SETEX "+r.filterRedisKey, err)
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatContainerByNameNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{ID: r.getDfIdFromScopeId(scopeTopology.ID), Name: scopeTopology.ID,
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, ScopeId: scopeTopology.ID}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyContainerByNameData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatContainerByNameNodeDetail(scopeTopology)
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatProcessNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{HostName: scopeTopology.Label, ID: r.getDfIdFromScopeId(scopeTopology.ID),
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, Process: scopeTopology.Label, ScopeId: scopeTopology.ID}
	for _, parent := range scopeTopology.Parents {
		if parent.TopologyID == TopologyIdHost {
			dfTopology.HostName = parent.Label
			break
		}
	}
	for _, metadata := range scopeTopology.Metadata {
		switch metadata.ID {
		case "pid":
			dfTopology.Pid, _ = strconv.Atoi(metadata.Value)
		case "cmdline":
			dfTopology.Cmdline = metadata.Value
		case "ppid":
			dfTopology.Ppid, _ = strconv.Atoi(metadata.Value)
		case "threads":
			dfTopology.Threads, _ = strconv.Atoi(metadata.Value)
		}
	}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyProcessData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatProcessNodeDetail(scopeTopology)
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatProcessByNameNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{ID: r.getDfIdFromScopeId(scopeTopology.ID), Process: scopeTopology.ID,
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, ScopeId: scopeTopology.ID}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyProcessByNameData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatProcessByNameNodeDetail(scopeTopology)
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatPodNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{ID: r.getDfIdFromScopeId(scopeTopology.ID), Name: scopeTopology.Label, PodName: scopeTopology.Label,
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, ScopeId: scopeTopology.ID}
	for _, parent := range scopeTopology.Parents {
		if parent.TopologyID == TopologyIdHost {
			dfTopology.HostName = parent.Label
			break
		}
	}
	for _, metadata := range scopeTopology.Metadata {
		switch metadata.ID {
		case "kubernetes_node_type":
			dfTopology.KubernetesNodeType = metadata.Value
		case "kubernetes_state":
			dfTopology.KubernetesState = metadata.Value
		case "kubernetes_ip":
			dfTopology.KubernetesIP = metadata.Value
		case "container":
			dfTopology.ContainerCount, _ = strconv.Atoi(metadata.Value)
		case "kubernetes_namespace":
			dfTopology.KubernetesNamespace = metadata.Value
		case "kubernetes_created":
			dfTopology.KubernetesCreated = metadata.Value
		case "kubernetes_restart_count":
			dfTopology.KubernetesRestartCount, _ = strconv.Atoi(metadata.Value)
		case "kubernetes_is_in_host_network":
			dfTopology.KubernetesIsInHostNetwork, _ = strconv.ParseBool(metadata.Value)
		case "kubernetes_snapshot_data":
			dfTopology.KubernetesSnapshotData = metadata.Value
		case "kubernetes_volume_claim":
			dfTopology.KubernetesVolumeClaim = metadata.Value
		case "kubernetes_volume_capacity":
			dfTopology.KubernetesVolumeCapacity = metadata.Value
		case "kubernetes_volume_name":
			dfTopology.KubernetesVolumeName = metadata.Value
		case "kubernetes_volume_snapshot_name":
			dfTopology.KubernetesVolumeSnapshotName = metadata.Value
		case "kubernetes_provisioner":
			dfTopology.KubernetesProvisioner = metadata.Value
		case "kubernetes_name":
			dfTopology.KubernetesName = metadata.Value
		case "kubernetes_storage_class_name":
			dfTopology.KubernetesStorageClassName = metadata.Value
		case "kubernetes_access_modes":
			dfTopology.KubernetesAccessModes = metadata.Value
		case "kubernetes_status":
			dfTopology.KubernetesStatus = metadata.Value
		case "kubernetes_storage_driver":
			dfTopology.KubernetesStorageDriver = metadata.Value
		case "kubernetes_cluster_id":
			dfTopology.KubernetesClusterId = metadata.Value
		case "kubernetes_cluster_name":
			dfTopology.KubernetesClusterName = metadata.Value
		case "control_probe_id":
			dfTopology.ClusterAgentProbeId = metadata.Value
		}
	}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyPodData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	noOfPods := 0
	localNetworksK8s := make([]string, 0)
	topologyFilters := []TopologyFilterOption{
		{Name: "pseudo", Label: "Pseudo", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
	}
	var filtersPodName, filtersKubernetesClusterId, filtersKubernetesClusterName, filtersKubernetesNamespace []string
	redisConn := r.redisPool.Get()
	defer redisConn.Close()
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatPodNodeDetail(scopeTopology)
		if dfTopology.KubernetesPublicIP != "" {
			localNetworksK8s = append(localNetworksK8s, dfTopology.KubernetesPublicIP)
		}
		if dfTopology.KubernetesIP != "" {
			localNetworksK8s = append(localNetworksK8s, dfTopology.KubernetesIP)
		}
		if dfTopology.Pseudo == false {
			if dfTopology.KubernetesNamespace != "" && dfTopology.KubernetesNamespace != kubeSystemNamespace && dfTopology.KubernetesNamespace != KubePublicNamespace {
				noOfPods += 1
			}
			if strings.HasPrefix(dfTopology.Name, "deepfence/deepfence-cluster-agent") {
				_, err := redisConn.Do("SETEX", "CLUSTER_AGENT_PROBE_ID_"+dfTopology.KubernetesClusterId, RedisExpiryTime, dfTopology.ClusterAgentProbeId)
				if err != nil {
					log.Println("Error: SETEX CLUSTER_AGENT_PROBE_ID_"+dfTopology.KubernetesClusterId, err)
				}
			}
			if dfTopology.PodName != "" && !InArray(dfTopology.PodName, filtersPodName) {
				filtersPodName = append(filtersPodName, dfTopology.PodName)
			}
			if dfTopology.KubernetesClusterId != "" && !InArray(dfTopology.KubernetesClusterId, filtersKubernetesClusterId) {
				filtersKubernetesClusterId = append(filtersKubernetesClusterId, dfTopology.KubernetesClusterId)
			}
			if dfTopology.KubernetesClusterName != "" && !InArray(dfTopology.KubernetesClusterName, filtersKubernetesClusterName) {
				filtersKubernetesClusterName = append(filtersKubernetesClusterName, dfTopology.KubernetesClusterName)
			}
			if dfTopology.KubernetesNamespace != "" && !InArray(dfTopology.KubernetesNamespace, filtersKubernetesNamespace) {
				filtersKubernetesNamespace = append(filtersKubernetesNamespace, dfTopology.KubernetesNamespace)
			}
		}
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	localNetworksK8s = uniqueSlice(localNetworksK8s)
	localNetworksK8sJson, _ := CodecEncode(localNetworksK8s)
	_, err := redisConn.Do("SETEX", topologyLocalNetworksK8sRedisKey, RedisExpiryTime, string(localNetworksK8sJson))
	if err != nil {
		log.Println("Error: SETEX "+topologyLocalNetworksRedisKey, err)
	}
	_, err = redisConn.Do("HSET", ScopeTopologyCount, r.nodeType, noOfPods, "kube_cluster", len(filtersKubernetesClusterId), "kube_namespace", len(filtersKubernetesNamespace))
	if err != nil {
		log.Println("Error: HSET "+ScopeTopologyCount, err)
	}
	if len(filtersPodName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "pod_name", Label: "Pod Name", Type: filterTypeStr, Options: filtersPodName, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterId) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_id", Label: "Cluster ID", Type: filterTypeStr, Options: filtersKubernetesClusterId, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_name", Label: "Cluster Name", Type: filterTypeStr, Options: filtersKubernetesClusterName, NumberOptions: nil})
	}
	if len(filtersKubernetesNamespace) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_namespace", Label: "Namespace", Type: filterTypeStr, Options: filtersKubernetesNamespace, NumberOptions: nil})
	}
	topologyFiltersJson, _ := CodecEncode(topologyFilters)
	_, err = redisConn.Do("SETEX", r.filterRedisKey, RedisExpiryTime, string(topologyFiltersJson))
	if err != nil {
		log.Println("Error: SETEX "+r.filterRedisKey, err)
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatKubeServiceNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{ID: r.getDfIdFromScopeId(scopeTopology.ID), Name: scopeTopology.Label,
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, ScopeId: scopeTopology.ID}
	for _, metadata := range scopeTopology.Metadata {
		switch metadata.ID {
		case "kubernetes_namespace":
			dfTopology.KubernetesNamespace = metadata.Value
		case "kubernetes_created":
			dfTopology.KubernetesCreated = metadata.Value
		case "kubernetes_ip":
			dfTopology.KubernetesIP = metadata.Value
		case "kubernetes_public_ip":
			dfTopology.KubernetesPublicIP = metadata.Value
		case "kubernetes_ingress_ip":
			dfTopology.KubernetesIngressIP = metadata.Value
		case "pod":
			dfTopology.PodCount, _ = strconv.Atoi(metadata.Value)
		case "kubernetes_type":
			dfTopology.KubernetesType = metadata.Value
		case "kubernetes_ports":
			dfTopology.KubernetesPorts = metadata.Value
		case "kubernetes_cluster_id":
			dfTopology.KubernetesClusterId = metadata.Value
		case "kubernetes_cluster_name":
			dfTopology.KubernetesClusterName = metadata.Value
		case "control_probe_id":
			dfTopology.ClusterAgentProbeId = metadata.Value
		}
	}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyKubeServiceData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	k8sIps := make([]string, 0)
	topologyFilters := []TopologyFilterOption{
		{Name: "pseudo", Label: "Pseudo", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
	}
	var filtersName, filtersKubernetesClusterId, filtersKubernetesClusterName, filtersKubernetesNamespace []string
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatKubeServiceNodeDetail(scopeTopology)
		if dfTopology.KubernetesPublicIP != "" {
			k8sIps = append(k8sIps, dfTopology.KubernetesPublicIP)
		}
		if dfTopology.KubernetesIngressIP != "" {
			ingressIps := strings.Split(dfTopology.KubernetesIngressIP, ",")
			for _, ingressIp := range ingressIps {
				if ingressIp != "" {
					k8sIps = append(k8sIps, ingressIp)
				}
			}
		}
		if dfTopology.KubernetesIP != "" {
			k8sIps = append(k8sIps, dfTopology.KubernetesIP)
		}
		if dfTopology.Name != "" && !InArray(dfTopology.Name, filtersName) {
			filtersName = append(filtersName, dfTopology.Name)
		}
		if dfTopology.KubernetesClusterId != "" && !InArray(dfTopology.KubernetesClusterId, filtersKubernetesClusterId) {
			filtersKubernetesClusterId = append(filtersKubernetesClusterId, dfTopology.KubernetesClusterId)
		}
		if dfTopology.KubernetesClusterName != "" && !InArray(dfTopology.KubernetesClusterName, filtersKubernetesClusterName) {
			filtersKubernetesClusterName = append(filtersKubernetesClusterName, dfTopology.KubernetesClusterName)
		}
		if dfTopology.KubernetesNamespace != "" && !InArray(dfTopology.KubernetesNamespace, filtersKubernetesNamespace) {
			filtersKubernetesNamespace = append(filtersKubernetesNamespace, dfTopology.KubernetesNamespace)
		}
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	k8sIps = uniqueSlice(k8sIps)
	k8sIpsJson, _ := CodecEncode(k8sIps)
	redisConn := r.redisPool.Get()
	defer redisConn.Close()
	_, err := redisConn.Do("SETEX", topologyLocalServicesK8sRedisKey, RedisExpiryTime, string(k8sIpsJson))
	if err != nil {
		log.Println("Error: SETEX "+topologyLocalServicesK8sRedisKey, err)
	}
	if len(filtersName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "name", Label: "Name", Type: filterTypeStr, Options: filtersName, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterId) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_id", Label: "Cluster ID", Type: filterTypeStr, Options: filtersKubernetesClusterId, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_name", Label: "Cluster Name", Type: filterTypeStr, Options: filtersKubernetesClusterName, NumberOptions: nil})
	}
	if len(filtersKubernetesNamespace) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_namespace", Label: "Namespace", Type: filterTypeStr, Options: filtersKubernetesNamespace, NumberOptions: nil})
	}
	topologyFiltersJson, _ := CodecEncode(topologyFilters)
	_, err = redisConn.Do("SETEX", r.filterRedisKey, RedisExpiryTime, string(topologyFiltersJson))
	if err != nil {
		log.Println("Error: SETEX "+r.filterRedisKey, err)
	}
	return topologyDf, dfIdToScopeIdMap
}

func (r *RedisCache) formatKubeControllerNodeDetail(scopeTopology detailed.NodeSummary) DeepfenceTopology {
	var dfTopology = DeepfenceTopology{ID: r.getDfIdFromScopeId(scopeTopology.ID), Name: scopeTopology.Label,
		Pseudo: scopeTopology.Pseudo, Type: r.nodeType, Meta: scopeTopology.LabelMinor, ScopeId: scopeTopology.ID}
	for _, metadata := range scopeTopology.Metadata {
		switch metadata.ID {
		case "kubernetes_node_type":
			dfTopology.KubernetesNodeType = metadata.Value
		case "kubernetes_namespace":
			dfTopology.KubernetesNamespace = metadata.Value
		case "kubernetes_created":
			dfTopology.KubernetesCreated = metadata.Value
		case "kubernetes_observed_generation":
			dfTopology.KubernetesObservedGeneration, _ = strconv.Atoi(metadata.Value)
		case "kubernetes_desired_replicas":
			dfTopology.KubernetesDesiredReplicas, _ = strconv.Atoi(metadata.Value)
		case "pod":
			dfTopology.PodCount, _ = strconv.Atoi(metadata.Value)
		case "kubernetes_strategy":
			dfTopology.KubernetesStrategy = metadata.Value
		}
	}
	dfTopology.Parents = r.formatParentNodes(scopeTopology.Parents)
	dfTopology.Adjacency = r.formatAdjacency(scopeTopology.Adjacency)
	return dfTopology
}

func (r *RedisCache) formatTopologyKubeControllerData(nodeSummaries detailed.NodeSummaries) (map[string]DeepfenceTopology, map[string]string) {
	topologyDf := make(map[string]DeepfenceTopology)
	dfIdToScopeIdMap := make(map[string]string)
	topologyFilters := []TopologyFilterOption{
		{Name: "pseudo", Label: "Pseudo", Type: filterTypeBool, Options: []string{}, NumberOptions: nil},
	}
	var filtersName, filtersKubernetesClusterId, filtersKubernetesClusterName, filtersKubernetesNodeType, filtersKubernetesNamespace []string
	for _, scopeTopology := range nodeSummaries {
		dfTopology := r.formatKubeControllerNodeDetail(scopeTopology)
		if dfTopology.Name != "" && !InArray(dfTopology.Name, filtersName) {
			filtersName = append(filtersName, dfTopology.Name)
		}
		if dfTopology.KubernetesClusterId != "" && !InArray(dfTopology.KubernetesClusterId, filtersKubernetesClusterId) {
			filtersKubernetesClusterId = append(filtersKubernetesClusterId, dfTopology.KubernetesClusterId)
		}
		if dfTopology.KubernetesClusterName != "" && !InArray(dfTopology.KubernetesClusterName, filtersKubernetesClusterName) {
			filtersKubernetesClusterName = append(filtersKubernetesClusterName, dfTopology.KubernetesClusterName)
		}
		if dfTopology.KubernetesNodeType != "" && !InArray(dfTopology.KubernetesNodeType, filtersKubernetesNodeType) {
			filtersKubernetesNodeType = append(filtersKubernetesNodeType, dfTopology.KubernetesNodeType)
		}
		if dfTopology.KubernetesNamespace != "" && !InArray(dfTopology.KubernetesNamespace, filtersKubernetesNamespace) {
			filtersKubernetesNamespace = append(filtersKubernetesNamespace, dfTopology.KubernetesNamespace)
		}
		topologyDf[dfTopology.ID] = dfTopology
		dfIdToScopeIdMap[dfTopology.ID] = scopeTopology.ID
	}
	if len(filtersName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "name", Label: "Name", Type: filterTypeStr, Options: filtersName, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterId) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_id", Label: "Cluster ID", Type: filterTypeStr, Options: filtersKubernetesClusterId, NumberOptions: nil})
	}
	if len(filtersKubernetesClusterName) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_cluster_name", Label: "Cluster Name", Type: filterTypeStr, Options: filtersKubernetesClusterName, NumberOptions: nil})
	}
	if len(filtersKubernetesNodeType) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_node_type", Label: "Controller Type", Type: filterTypeStr, Options: filtersKubernetesNodeType, NumberOptions: nil})
	}
	if len(filtersKubernetesNamespace) > 0 {
		topologyFilters = append(topologyFilters, TopologyFilterOption{Name: "kubernetes_namespace", Label: "Namespace", Type: filterTypeStr, Options: filtersKubernetesNamespace, NumberOptions: nil})
	}
	topologyFiltersJson, _ := CodecEncode(topologyFilters)
	redisConn := r.redisPool.Get()
	defer redisConn.Close()
	_, err := redisConn.Do("SETEX", r.filterRedisKey, RedisExpiryTime, string(topologyFiltersJson))
	if err != nil {
		log.Println("Error: SETEX "+r.filterRedisKey, err)
	}
	return topologyDf, dfIdToScopeIdMap
}

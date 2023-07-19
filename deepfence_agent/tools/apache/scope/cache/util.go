package cache

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"reflect"
	"strconv"
	"sync"
	"time"

	"github.com/ugorji/go/codec"
	"github.com/weaveworks/scope/report"

	"github.com/gomodule/redigo/redis"
)

type NodeStatus struct {
	VulnerabilityScanStatus     map[string]string
	VulnerabilityScanStatusTime map[string]string
	SecretScanStatus            map[string]string
	SecretScanStatusTime        map[string]string
	MalwareScanStatus           map[string]string
	MalwareScanStatusTime       map[string]string
	sync.RWMutex
}

const (
	NodeTypeHost                     = "host"
	NodeTypeContainer                = "container"
	NodeTypeProcess                  = "process"
	NodeTypeContainerImage           = "container_image"
	NodeTypeContainerByName          = "container_by_name"
	NodeTypeProcessByName            = "process_by_name"
	NodeTypePod                      = "pod"
	NodeTypeKubeController           = "kube_controller"
	NodeTypeKubeService              = "kube_service"
	NodeTypeSwarmService             = "swarm_service"
	TopologyIdContainer              = "containers"
	TopologyIdContainerImage         = "containers-by-image"
	TopologyIdContainerByName        = "containers-by-hostname"
	TopologyIdProcess                = "processes"
	TopologyIdProcessByName          = "processes-by-name"
	TopologyIdHost                   = "hosts"
	TopologyIdPod                    = "pods"
	TopologyIdKubeController         = "kube-controllers"
	TopologyIdKubeService            = "services"
	TopologyIdSwarmService           = "swarm-services"
	noOfHostsRedisKey                = "x-hosts"
	dfIdToScopeIdRedisKeyPrefix      = "DF_ID_TO_SCOPE_ID_"
	ScopeTopologyCount               = "TOPOLOGY_COUNT"
	TopologyFilterPrefix             = "TOPOLOGY_FILTERS_"
	topologyHostsProbeMapRedisKey    = "TOPOLOGY_HOSTS_PROBE_MAP"
	topologyLocalNetworksRedisKey    = "TOPOLOGY_LOCAL_NETWORKS"
	topologyLocalNetworksK8sRedisKey = "TOPOLOGY_LOCAL_NETWORKS_K8S"
	topologyLocalServicesK8sRedisKey = "TOPOLOGY_LOCAL_SERVICES_K8S"
	countOfHostsByUserKey            = "TOPOLOGY_USER_HOST_COUNT_MAP"
	TopologyFormatDeepfence          = "deepfence"
	TopologyFormatScope              = "scope"
	RedisExpiryTime                  = 180 // 3 minutes
	kubeSystemNamespace              = "kube-system"
	KubePublicNamespace              = "kube-public"
	dockerStateCreated               = "created"
	dockerStateDead                  = "dead"
	dockerStateExited                = "exited"
	dockerStatePaused                = "paused"
	dockerStateRestarting            = "restarting"
	dockerStateRunning               = "running"
	dockerStateDeleted               = "deleted"
	dockerStateRemoving              = "removing"
	dockerStateUp                    = "up"
	dockerStateStopped               = "stopped"
	filterTypeStr                    = "string"
	filterTypeNumber                 = "number"
	filterTypeBool                   = "bool"
	scanStatusNeverScanned           = "never_scanned"
	esAggsSize                       = 50000
)

var (
	TopologyIdNodeTypeMap  map[string]string
	AllNodeTypes           []string
	statusMap              map[string]string
	cveScanLogsEsIndex     = "cve-scan"
	secretScanLogsEsIndex  = "secret-scan-logs"
	malwareScanLogsEsIndex = "malware-scan-logs"
)

func init() {
	AllNodeTypes = []string{NodeTypeHost, NodeTypeContainer, NodeTypeContainerByName, NodeTypeContainerImage, NodeTypeProcess,
		NodeTypeProcessByName, NodeTypePod, NodeTypeKubeController, NodeTypeKubeService, NodeTypeSwarmService}
	statusMap = map[string]string{
		"QUEUED": "queued", "STARTED": "in_progress", "SCAN_IN_PROGRESS": "in_progress", "WARN": "in_progress",
		"COMPLETED": "complete", "ERROR": "error", "STOPPED": "error", "GENERATING_SBOM": "in_progress",
		"GENERATED_SBOM": "in_progress", "IN_PROGRESS": "in_progress", "COMPLETE": "complete"}
	TopologyIdNodeTypeMap = map[string]string{
		TopologyIdPod:             NodeTypePod,
		TopologyIdContainer:       NodeTypeContainer,
		TopologyIdContainerByName: NodeTypeContainerByName,
		TopologyIdContainerImage:  NodeTypeContainerImage,
		TopologyIdHost:            NodeTypeHost,
		TopologyIdKubeController:  NodeTypeKubeController,
		TopologyIdKubeService:     NodeTypeKubeService,
		TopologyIdProcess:         NodeTypeProcess,
		TopologyIdProcessByName:   NodeTypeProcessByName,
		TopologyIdSwarmService:    NodeTypeSwarmService,
	}

	customerUniqueId := os.Getenv("CUSTOMER_UNIQUE_ID")
	if customerUniqueId != "" {
		cveScanLogsEsIndex += fmt.Sprintf("-%s", customerUniqueId)
		secretScanLogsEsIndex += fmt.Sprintf("-%s", customerUniqueId)
		malwareScanLogsEsIndex += fmt.Sprintf("-%s", customerUniqueId)
	}
}

func uniqueSlice(strSlice []string) []string {
	keys := make(map[string]bool)
	var list []string
	for _, entry := range strSlice {
		if _, value := keys[entry]; !value {
			keys[entry] = true
			list = append(list, entry)
		}
	}
	return list
}

func InArray(val interface{}, array interface{}) bool {
	switch reflect.TypeOf(array).Kind() {
	case reflect.Slice:
		s := reflect.ValueOf(array)

		for i := 0; i < s.Len(); i++ {
			if reflect.DeepEqual(val, s.Index(i).Interface()) == true {
				return true
			}
		}
	}
	return false
}

func ExecuteCommandInBackground(commandStr string) {
	cmd := exec.Command("/bin/sh", "-c", commandStr)
	err := cmd.Start()
	if err != nil {
		return
	}
	err = WaitFunction(cmd)
	if err != nil {
		return
	}
}

func WaitFunction(command *exec.Cmd) error {
	err := command.Wait()
	if err != nil {
		return err
	}
	return nil
}

func JsonEncode(data interface{}) ([]byte, error) {
	buf := new(bytes.Buffer)
	enc := json.NewEncoder(buf)
	enc.SetEscapeHTML(false)
	err := enc.Encode(data)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func CodecEncode(data interface{}) ([]byte, error) {
	buf := new(bytes.Buffer)
	err := codec.NewEncoder(buf, &codec.JsonHandle{}).Encode(data)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func CodecDecode(reader io.Reader, data interface{}) error {
	err := codec.NewDecoder(reader, &codec.JsonHandle{}).Decode(data)
	if err != nil {
		return err
	}
	return nil
}

func (topologyOptions *TopologyOptions) TopologyOptionsValidate() {
	// container?format=deepfence&pseudo=show&stopped=both
	topologyParams := topologyOptions.Params
	// format = deepfence | scope
	if topologyParams.Format != TopologyFormatDeepfence && topologyParams.Format != TopologyFormatScope {
		topologyParams.Format = TopologyFormatDeepfence
	}
	// pseudo = show | hide
	if topologyParams.Pseudo != "show" && topologyParams.Pseudo != "hide" {
		topologyParams.Pseudo = "show"
	}
	// stopped = both | running | stopped
	if topologyParams.Stopped != "stopped" && topologyParams.Stopped != "running" && topologyParams.Stopped != "both" {
		topologyParams.Stopped = "both"
	}
	// unconnected = show | hide
	if topologyParams.Unconnected != "show" && topologyParams.Unconnected != "hide" {
		topologyParams.Unconnected = "show"
	}

	if topologyOptions.NodeType == NodeTypeHost {
		topologyOptions.Key = fmt.Sprintf("%s?format=%s", topologyOptions.NodeType, topologyParams.Format)
	} else if topologyOptions.NodeType == NodeTypeContainer || topologyOptions.NodeType == NodeTypeContainerByName || topologyOptions.NodeType == NodeTypeContainerImage {
		topologyOptions.Key = fmt.Sprintf("%s?stopped=%s&pseudo=%s&format=%s", topologyOptions.NodeType, topologyParams.Stopped, topologyParams.Pseudo, topologyParams.Format)
	} else if topologyOptions.NodeType == NodeTypeProcess || topologyOptions.NodeType == NodeTypeProcessByName {
		topologyOptions.Key = fmt.Sprintf("%s?unconnected=%s&format=%s", topologyOptions.NodeType, topologyParams.Unconnected, topologyParams.Format)
	} else if topologyOptions.NodeType == NodeTypePod {
		topologyOptions.Key = fmt.Sprintf("%s?namespace=%s&pseudo=%s&format=%s", topologyOptions.NodeType, topologyParams.Namespace, topologyParams.Pseudo, topologyParams.Format)
	} else if topologyOptions.NodeType == NodeTypeKubeController || topologyOptions.NodeType == NodeTypeKubeService || topologyOptions.NodeType == NodeTypeSwarmService {
		topologyOptions.Key = fmt.Sprintf("%s?namespace=%s&pseudo=%s&format=%s", topologyOptions.NodeType, topologyParams.Namespace, topologyParams.Pseudo, topologyParams.Format)
	} else {
		topologyOptions.Key = ""
	}
}

func GracefulExit() {
	time.Sleep(time.Second * 5)
	os.Exit(1)
}

func FetchTopologyData(redisConn redis.Conn, channel string) ([]byte, error) {
	var data []byte
	data, err := redis.Bytes(redisConn.Do("GET", channel))
	if err != nil {
		return data, err
	}
	return data, nil
}

type TopologyParams struct {
	Format      string `json:"format,omitempty"`
	Stopped     string `json:"stopped,omitempty"`
	Pseudo      string `json:"pseudo,omitempty"`
	Unconnected string `json:"unconnected,omitempty"`
	Namespace   string `json:"namespace,omitempty"`
}

type TopologyOptions struct {
	NodeType string         `json:"node_type"`
	Params   TopologyParams `json:"params"`
	Key      string         `json:"channel"`
}

type MetricSample struct {
	Timestamp time.Time `json:"date,omitempty"`
	Value     float64   `json:"value,omitempty"`
}

type TableRow struct {
	ID      string            `json:"id,omitempty"`
	Entries map[string]string `json:"entries,omitempty"`
}

type TableColumn struct {
	ID       string `json:"id,omitempty"`
	Label    string `json:"label,omitempty"`
	DataType string `json:"dataType,omitempty"`
}

type TopologyTable struct {
	ID              string        `json:"id,omitempty"`
	Label           string        `json:"label,omitempty"`
	Type            string        `json:"type,omitempty"`
	Columns         []TableColumn `json:"columns,omitempty"`
	Rows            []TableRow    `json:"rows,omitempty"`
	TruncationCount int           `json:"truncationCount,omitempty"`
}

type ScopeMetadata struct {
	ID       string  `json:"id,omitempty"`
	Label    string  `json:"label,omitempty"`
	Value    string  `json:"value,omitempty"`
	Priority float64 `json:"priority,omitempty"`
	DataType string  `json:"dataType,omitempty"`
	Truncate int     `json:"truncate,omitempty"`
}

type ParentNode struct {
	ID    string `json:"id,omitempty"`
	Label string `json:"label,omitempty"`
	Type  string `json:"type"`
}

type CloudMetadata struct {
	CloudProvider     string   `json:"cloud_provider"`
	InstanceID        string   `json:"instance_id,omitempty"`
	PublicIP          []string `json:"public_ip"`
	PrivateIP         []string `json:"private_ip"`
	InstanceType      string   `json:"instance_type,omitempty"`
	AvailabilityZone  string   `json:"availability_zone,omitempty"`
	Hostname          string   `json:"hostname,omitempty"`
	KernelId          string   `json:"kernel_id,omitempty"`
	ID                string   `json:"id,omitempty"`
	DataCenter        string   `json:"data_center,omitempty"`
	Domain            string   `json:"domain,omitempty"`
	Zone              string   `json:"zone,omitempty"`
	Name              string   `json:"name,omitempty"`
	MachineType       string   `json:"machine_type,omitempty"`
	VmID              string   `json:"vm_id,omitempty"`
	VMSize            string   `json:"vm_size,omitempty"`
	Location          string   `json:"location,omitempty"`
	OsType            string   `json:"os_type,omitempty"`
	SKU               string   `json:"sku,omitempty"`
	ResourceGroupName string   `json:"resource_group_name,omitempty"`
}

type TopologyStatistics struct {
	HideIfEmpty bool   `json:"hide_if_empty"`
	Name        string `json:"name"`
	Options     []struct {
		DefaultValue string `json:"defaultValue"`
		ID           string `json:"id"`
		Options      []struct {
			Label string `json:"label"`
			Value string `json:"value"`
		} `json:"options"`
	} `json:"options"`
	Rank  int `json:"rank"`
	Stats struct {
		EdgeCount          int `json:"edge_count"`
		FilteredNodes      int `json:"filtered_nodes"`
		NodeCount          int `json:"node_count"`
		NonpseudoNodeCount int `json:"nonpseudo_node_count"`
	} `json:"stats"`
	SubTopologies []struct {
		HideIfEmpty bool   `json:"hide_if_empty"`
		Name        string `json:"name"`
		Options     []struct {
			DefaultValue string `json:"defaultValue"`
			ID           string `json:"id"`
			Options      []struct {
				Label string `json:"label"`
				Value string `json:"value"`
			} `json:"options"`
		} `json:"options"`
		Rank  int `json:"rank"`
		Stats struct {
			EdgeCount          int `json:"edge_count"`
			FilteredNodes      int `json:"filtered_nodes"`
			NodeCount          int `json:"node_count"`
			NonpseudoNodeCount int `json:"nonpseudo_node_count"`
		} `json:"stats"`
		URL string `json:"url"`
	} `json:"sub_topologies,omitempty"`
	URL string `json:"url"`
}

type DeepfenceTopology struct {
	AgentVersion                 string              `json:"version,omitempty"`
	AgentRunning                 string              `json:"agent_running,omitempty"`
	KernelVersion                string              `json:"kernel_version,omitempty"`
	Uptime                       int                 `json:"uptime,omitempty"`
	AuthToken                    string              `json:"auth_token,omitempty"`
	HostName                     string              `json:"host_name,omitempty"`
	Os                           string              `json:"os,omitempty"`
	LocalNetworks                []string            `json:"local_networks,omitempty"`
	InterfaceNames               []string            `json:"interfaceNames,omitempty"`
	Name                         string              `json:"name"`
	InterfaceIps                 map[string]string   `json:"interface_ips,omitempty"`
	CloudProvider                string              `json:"cloud_provider,omitempty"`
	Adjacency                    []string            `json:"adjacency,omitempty"`
	DockerContainerCommand       string              `json:"docker_container_command,omitempty"`
	DockerContainerStateHuman    string              `json:"docker_container_state_human,omitempty"`
	DockerContainerUptime        int                 `json:"docker_container_uptime,omitempty"`
	DockerContainerNetworks      string              `json:"docker_container_networks,omitempty"`
	DockerContainerIps           []string            `json:"docker_container_ips,omitempty"`
	DockerContainerCreated       string              `json:"docker_container_created,omitempty"`
	DockerContainerID            string              `json:"docker_container_id,omitempty"`
	DockerContainerState         string              `json:"docker_container_state,omitempty"`
	DockerContainerPorts         string              `json:"docker_container_ports,omitempty"`
	ID                           string              `json:"id"`
	ContainerName                string              `json:"container_name,omitempty"`
	Type                         string              `json:"type"`
	ImageName                    string              `json:"image_name,omitempty"`
	ImageNameWithTag             string              `json:"image_name_with_tag,omitempty"`
	Pseudo                       bool                `json:"pseudo"`
	Meta                         string              `json:"meta,omitempty"`
	ImageTag                     string              `json:"image_tag,omitempty"`
	ContainerCount               int                 `json:"container_count,omitempty"`
	PodCount                     int                 `json:"pod_count,omitempty"`
	PodName                      string              `json:"pod_name,omitempty"`
	Pid                          int                 `json:"pid,omitempty"`
	Cmdline                      string              `json:"cmdline,omitempty"`
	Ppid                         int                 `json:"ppid,omitempty"`
	Threads                      int                 `json:"threads,omitempty"`
	Process                      string              `json:"process,omitempty"`
	KubernetesState              string              `json:"kubernetes_state,omitempty"`
	KubernetesIP                 string              `json:"kubernetes_ip,omitempty"`
	KubernetesPublicIP           string              `json:"kubernetes_public_ip,omitempty"`
	KubernetesIngressIP          string              `json:"kubernetes_ingress_ip,omitempty"`
	KubernetesNamespace          string              `json:"kubernetes_namespace,omitempty"`
	KubernetesCreated            string              `json:"kubernetes_created,omitempty"`
	KubernetesRestartCount       int                 `json:"kubernetes_restart_count,omitempty"`
	KubernetesIsInHostNetwork    bool                `json:"kubernetes_is_in_host_network,omitempty"`
	KubernetesType               string              `json:"kubernetes_type,omitempty"`
	KubernetesPorts              string              `json:"kubernetes_ports,omitempty"`
	KubernetesNodeType           string              `json:"kubernetes_node_type,omitempty"`
	KubernetesObservedGeneration int                 `json:"kubernetes_observed_generation,omitempty"`
	KubernetesDesiredReplicas    int                 `json:"kubernetes_desired_replicas,omitempty"`
	KubernetesStrategy           string              `json:"kubernetes_strategy,omitempty"`
	KubernetesSnapshotData       string              `json:"kubernetes_snapshot_data,omitempty"`
	KubernetesVolumeClaim        string              `json:"kubernetes_volume_claim,omitempty"`
	KubernetesVolumeCapacity     string              `json:"kubernetes_volume_capacity,omitempty"`
	KubernetesVolumeName         string              `json:"kubernetes_volume_name,omitempty"`
	KubernetesVolumeSnapshotName string              `json:"kubernetes_volume_snapshot_name,omitempty"`
	KubernetesProvisioner        string              `json:"kubernetes_provisioner,omitempty"`
	KubernetesName               string              `json:"kubernetes_name,omitempty"`
	KubernetesStorageClassName   string              `json:"kubernetes_storage_class_name,omitempty"`
	KubernetesAccessModes        string              `json:"kubernetes_access_modes,omitempty"`
	KubernetesStatus             string              `json:"kubernetes_status,omitempty"`
	KubernetesStorageDriver      string              `json:"kubernetes_storage_driver,omitempty"`
	Parents                      []ParentNode        `json:"parents,omitempty"`
	ConnectedProcesses           *ConnectedProcesses `json:"connectedProcesses,omitempty"`
	CloudMetadata                *CloudMetadata      `json:"cloud_metadata,omitempty"`
	KubernetesClusterId          string              `json:"kubernetes_cluster_id,omitempty"`
	KubernetesClusterName        string              `json:"kubernetes_cluster_name,omitempty"`
	ClusterAgentProbeId          string              `json:"cluster_agent_probe_id"`
	UserDefinedTags              []string            `json:"user_defined_tags"`
	DockerImageSize              string              `json:"docker_image_size,omitempty"`
	DockerImageCreatedAt         string              `json:"docker_image_created_at,omitempty"`
	DockerImageVirtualSize       string              `json:"docker_image_virtual_size,omitempty"`
	DockerImageID                string              `json:"docker_image_id,omitempty"`
	IsUiVm                       bool                `json:"is_ui_vm,omitempty"`
	Metrics                      []report.MetricRow  `json:"metrics,omitempty"`
	SwarmStackNamespace          string              `json:"stack_namespace,omitempty"`
	ScopeId                      string              `json:"scope_id,omitempty"`
	VulnerabilityScanStatus      string              `json:"vulnerability_scan_status,omitempty"`
	VulnerabilityScanStatusTime  string              `json:"vulnerability_scan_status_time,omitempty"`
	SecretScanStatus             string              `json:"secret_scan_status,omitempty"`
	SecretScanStatusTime         string              `json:"secret_scan_status_time,omitempty"`
	MalwareScanStatus            string              `json:"malware_scan_status,omitempty"`
	MalwareScanStatusTime        string              `json:"malware_scan_status_time,omitempty"`
}

type TopologyFilterNumberOption struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

type TopologyFilterOption struct {
	Name          string                      `json:"name"`
	Label         string                      `json:"label"`
	Type          string                      `json:"type"`
	Options       []string                    `json:"options"`
	NumberOptions *TopologyFilterNumberOption `json:"number_options,omitempty"`
}

type ConnectedProcesses interface{}

func NewRedisPool() (*redis.Pool, int) {
	var dbNumInt int
	var errVal error
	dbNumStr := os.Getenv("REDIS_DB_NUMBER")
	if dbNumStr == "" {
		dbNumInt = 0
	} else {
		dbNumInt, errVal = strconv.Atoi(dbNumStr)
		if errVal != nil {
			dbNumInt = 0
		}
	}
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "deepfence-redis"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	redisAddr := fmt.Sprintf("%s:%s", redisHost, redisPort)
	return &redis.Pool{
		MaxIdle:   50,
		MaxActive: 500, // max number of connections
		Dial: func() (redis.Conn, error) {
			c, err := redis.Dial("tcp", redisAddr, redis.DialDatabase(dbNumInt))
			if err != nil {
				return nil, err
			}
			return c, err
		},
		IdleTimeout: 240 * time.Second,
		TestOnBorrow: func(c redis.Conn, t time.Time) error {
			_, err := c.Do("PING")
			return err
		},
	}, dbNumInt
}

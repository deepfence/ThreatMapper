package host

import (
	"fmt"
	"net"
	"os"

	"github.com/deepfence/df-utils/cloud_metadata"
	"github.com/sirupsen/logrus"

	//"os/exec"
	"encoding/json"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	dfUtils "github.com/deepfence/df-utils"
	"github.com/weaveworks/common/mtime"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/report"
)

// Agent version to dispay in metadata
var (
	agentVersionNo = "1.1.1"
	agentCommitID  = "Unknown"
	agentBuildTime = "0"
	agentRunning   = "yes"
)

// Keys for use in Node.Latest.
const (
	Timestamp         = report.Timestamp
	HostName          = report.HostName
	LocalNetworks     = report.HostLocalNetworks
	OS                = report.OS
	KernelVersion     = report.KernelVersion
	Uptime            = report.Uptime
	Load1             = report.Load1
	CPUUsage          = report.HostCPUUsage
	MemoryUsage       = report.HostMemoryUsage
	InterfaceNames    = "interfaceNames"
	ProbeId           = "probeId"
	InterfaceIPs      = "interface_ips"
	CloudProvider     = report.CloudProvider
	CloudRegion       = report.CloudRegion
	CloudMetadata     = "cloud_metadata"
	k8sClusterId      = report.KubernetesClusterId
	k8sClusterName    = report.KubernetesClusterName
	UserDfndTags      = "user_defined_tags"
	AgentVersion      = "version"
	IsUiVm            = "is_ui_vm"
	AgentRunning      = "agent_running"
	nodeTypeHost      = "host"
	nodeTypeContainer = "container"
	nodeTypeImage     = "container_image"
	Name              = "name"
	Label             = "label"
)

// Exposed for testing.
const (
	ProcUptime  = "/proc/uptime"
	ProcLoad    = "/proc/loadavg"
	ProcStat    = "/proc/stat"
	ProcMemInfo = "/proc/meminfo"
)

// Exposed for testing.
var (
	MetadataTemplates = report.MetadataTemplates{
		KernelVersion:  {ID: KernelVersion, Label: "Kernel version", From: report.FromLatest, Priority: 1},
		Uptime:         {ID: Uptime, Label: "Uptime", From: report.FromLatest, Priority: 2, Datatype: report.Duration},
		HostName:       {ID: HostName, Label: "Hostname", From: report.FromLatest, Priority: 11},
		OS:             {ID: OS, Label: "OS", From: report.FromLatest, Priority: 12},
		LocalNetworks:  {ID: LocalNetworks, Label: "Local networks", From: report.FromSets, Priority: 13},
		InterfaceNames: {ID: InterfaceNames, Label: "Interface Names", From: report.FromLatest, Priority: 15},
		//PublicIpAddr:   {ID: PublicIpAddr, Label: "Public IP Address", From: report.FromLatest, Priority: 16},
		ProbeId: {ID: ProbeId, Label: "Probe ID", From: report.FromLatest, Priority: 17},
		//ScopeVersion:  {ID: ScopeVersion, Label: "Scope version", From: report.FromLatest, Priority: 14},
		InterfaceIPs:   {ID: InterfaceIPs, Label: "All Interface IP's", From: report.FromLatest, Priority: 21},
		CloudProvider:  {ID: CloudProvider, Label: "Cloud Provider", From: report.FromLatest, Priority: 22},
		CloudRegion:    {ID: CloudRegion, Label: "Cloud Region", From: report.FromLatest, Priority: 23},
		CloudMetadata:  {ID: CloudMetadata, Label: "Cloud Metadata", From: report.FromLatest, Priority: 24},
		k8sClusterId:   {ID: k8sClusterId, Label: "Kubernetes Cluster Id", From: report.FromLatest, Priority: 25},
		k8sClusterName: {ID: k8sClusterName, Label: "Kubernetes Cluster Name", From: report.FromLatest, Priority: 26},
		UserDfndTags:   {ID: UserDfndTags, Label: "User Defined Tags", From: report.FromLatest, Priority: 27},
		AgentVersion:   {ID: AgentVersion, Label: "Agent Version", From: report.FromLatest, Priority: 28},
		IsUiVm:         {ID: IsUiVm, Label: "UI vm", From: report.FromLatest, Priority: 29},
		AgentRunning:   {ID: AgentRunning, Label: "Agent", From: report.FromLatest, Priority: 33},
	}

	MetricTemplates = report.MetricTemplates{
		CPUUsage:    {ID: CPUUsage, Label: "CPU", Format: report.PercentFormat, Priority: 1},
		MemoryUsage: {ID: MemoryUsage, Label: "Memory", Format: report.FilesizeFormat, Priority: 2},
		Load1:       {ID: Load1, Label: "Load (1m)", Format: report.DefaultFormat, Group: "load", Priority: 11},
	}

	CloudProviderMetadataTemplates = report.MetadataTemplates{
		Name:  {ID: Name, Label: "Name", From: report.FromLatest, Priority: 1},
		Label: {ID: Label, Label: "Label", From: report.FromLatest, Priority: 2},
	}

	CloudRegionMetadataTemplates = report.MetadataTemplates{
		Name:          {ID: Name, Label: "Name", From: report.FromLatest, Priority: 1},
		CloudProvider: {ID: CloudProvider, Label: "Cloud Provider", From: report.FromLatest, Priority: 2},
	}
)

type CloudMeta struct {
	cloudMetadata      string
	cloudProvider      string
	cloudProviderLabel string
	cloudRegion        string
	mtx                sync.RWMutex
}

func getCloudMetadata(cloudProvider string) (string, string, string, string) {
	var cloudMetadata cloud_metadata.CloudMetadata
	if cloudProvider == "aws" {
		cloudMetadata, _ = cloud_metadata.GetAWSMetadata(false)
	} else if cloudProvider == "google_cloud" {
		cloudMetadata, _ = cloud_metadata.GetGoogleCloudMetadata(false)
	} else if cloudProvider == "azure" {
		cloudMetadata, _ = cloud_metadata.GetAzureMetadata(false)
	} else if cloudProvider == "digital_ocean" {
		cloudMetadata, _ = cloud_metadata.GetDigitalOceanMetadata(false)
	} else if cloudProvider == "softlayer" {
		cloudMetadata, _ = cloud_metadata.GetSoftlayerMetadata(false)
	} else if cloudProvider == "aws_fargate" {
		cloudMetadata, _ = cloud_metadata.GetAWSFargateMetadata(false)
	} else {
		var err error
		cloudMetadata, err = cloud_metadata.GetGenericMetadata(false)
		if err == nil {
			if !dfUtils.FileExists("/var/run/docker.sock") && !dfUtils.FileExists("/run/containerd/containerd.sock") {
				cloudProvider = report.CloudProviderServerless
				cloudMetadata.CloudProvider = report.CloudProviderServerless
				cloudMetadata.Region = report.CloudProviderServerless
			}
		}
	}
	cloudMetadataJson, err := json.Marshal(cloudMetadata)
	if err != nil {
		return cloudProvider, "Unknown", "unknown", "{}"
	}
	return cloudProvider, cloudMetadata.Label, cloudMetadata.Region, string(cloudMetadataJson)
}

func (r *Reporter) updateCloudMetadata(cloudProvider string) {
	cloudProvider, cloudProviderLabel, cloudRegion, cloudMetadataJson := getCloudMetadata(cloudProvider)
	r.cloudMeta.mtx.Lock()
	r.cloudMeta.cloudProvider = cloudProvider
	r.cloudMeta.cloudProviderLabel = cloudProviderLabel
	r.cloudMeta.cloudRegion = cloudRegion
	r.cloudMeta.cloudMetadata = cloudMetadataJson
	if r.cloudMeta.cloudMetadata == "" {
		r.cloudMeta.cloudMetadata = "{}"
	}
	r.cloudMeta.mtx.Unlock()
}

func getAgentTags() []string {
	var agentTags []string
	// User defined tags can be set from agent side also
	agentTagsStr := os.Getenv("USER_DEFINED_TAGS")
	if agentTagsStr != "" {
		agentTags = strings.Split(agentTagsStr, ",")
	}
	return agentTags
}

func (r *Reporter) updateUserDefinedTags() {
	consoleServer := os.Getenv("CONSOLE_SERVER")
	fileBeatCertPath := os.Getenv("FILEBEAT_CERT_PATH")
	deepfenceKey := os.Getenv("DEEPFENCE_KEY")
	if consoleServer == "" {
		logrus.Error("CONSOLE_SERVER env is empty")
		return
	}
	if fileBeatCertPath == "" {
		logrus.Error("FILEBEAT_CERT_PATH env is empty")
		return
	}
	// Set for the first time
	tags, err := dfUtils.GetUserDefinedTagsForGivenHost(r.hostName, nodeTypeHost, consoleServer, fileBeatCertPath, deepfenceKey)
	for err != nil {
		logrus.Error(err.Error())
		time.Sleep(2 * time.Minute)
		tags, err = dfUtils.GetUserDefinedTagsForGivenHost(r.hostName, nodeTypeHost, consoleServer, fileBeatCertPath, deepfenceKey)
	}
	// User defined tags can be set from agent also
	agentTags := getAgentTags()
	for _, agentTag := range agentTags {
		exists, _ := dfUtils.InArray(agentTag, tags[r.hostName])
		if !exists {
			tags[r.hostName] = append(tags[r.hostName], agentTag)
		}
	}
	var ok bool
	r.userDefinedTags.Lock()
	r.userDefinedTags.tags, ok = tags[r.hostName]
	if !ok {
		r.userDefinedTags.tags = make([]string, 0)
	}
	r.userDefinedTags.Unlock()

	// Then update it every few hours
	ticker := time.NewTicker(12 * time.Hour)
	for {
		select {
		case <-ticker.C:
			tags, err := dfUtils.GetUserDefinedTagsForGivenHost(r.hostName, nodeTypeHost, consoleServer, fileBeatCertPath, deepfenceKey)
			for err != nil {
				logrus.Error(err.Error())
				time.Sleep(5 * time.Minute)
				tags, err = dfUtils.GetUserDefinedTagsForGivenHost(r.hostName, nodeTypeHost, consoleServer, fileBeatCertPath, deepfenceKey)
			}
			// User defined tags can be set from agent also
			agentTags := getAgentTags()
			for _, agentTag := range agentTags {
				exists, _ := dfUtils.InArray(agentTag, tags[r.hostName])
				if !exists {
					tags[r.hostName] = append(tags[r.hostName], agentTag)
				}
			}
			r.userDefinedTags.Lock()
			r.userDefinedTags.tags, ok = tags[r.hostName]
			if !ok {
				r.userDefinedTags.tags = make([]string, 0)
			}
			r.userDefinedTags.Unlock()
		}
	}
}

type UserDefinedTags struct {
	tags []string // Tags given by user. Eg: production, test
	sync.RWMutex
}

type HostDetailsEveryMinute struct {
	Uptime         string
	InterfaceNames string
	InterfaceIPs   string
	LocalCIDRs     []string
	sync.RWMutex
}

func (r *Reporter) updateHostDetailsEveryMinute() {
	interfaceNames, _ := getInterfaceNames()
	var localCIDRs []string
	localNets, err := GetLocalNetworks()
	if err == nil {
		for _, localNet := range localNets {
			localCIDRs = append(localCIDRs, localNet.String())
		}
	}
	interfaceIPs, _ := getInterfaceIPs()
	var uptimeStr string
	uptime, err := GetUptime()
	if err != nil {
		uptimeStr = "0"
	} else {
		uptimeStr = strconv.Itoa(int(uptime / time.Second))
	}
	r.hostDetailsMinute.Lock()
	r.hostDetailsMinute.Uptime = uptimeStr
	r.hostDetailsMinute.InterfaceNames = interfaceNames
	r.hostDetailsMinute.LocalCIDRs = localCIDRs
	r.hostDetailsMinute.InterfaceIPs = interfaceIPs
	r.hostDetailsMinute.Unlock()
}

type HostDetailsMetrics struct {
	Metrics report.Metrics
	sync.RWMutex
}

func (r *Reporter) updateHostDetailsMetrics() {
	now := mtime.Now()
	metrics := GetLoad(now)
	cpuUsage, max := GetCPUUsagePercent()
	metrics[CPUUsage] = report.MakeSingletonMetric(now, cpuUsage).WithMax(max)
	memoryUsage, max := GetMemoryUsageBytes()
	metrics[MemoryUsage] = report.MakeSingletonMetric(now, memoryUsage).WithMax(max)

	r.hostDetailsMetrics.Lock()
	r.hostDetailsMetrics.Metrics = metrics
	r.hostDetailsMetrics.Unlock()
}

func (r *Reporter) updateHostDetails(cloudProvider string) {
	// Set for the first time
	r.updateHostDetailsMetrics()
	r.updateHostDetailsEveryMinute()
	r.updateCloudMetadata(cloudProvider)

	// Update it every now and then
	minuteTicker := time.NewTicker(1 * time.Minute)
	defer minuteTicker.Stop()
	fiveSecTicker := time.NewTicker(5 * time.Second)
	defer fiveSecTicker.Stop()
	hourTicker := time.NewTicker(1 * time.Hour)
	defer hourTicker.Stop()
	for {
		select {
		case <-minuteTicker.C:
			r.updateHostDetailsEveryMinute()
		case <-fiveSecTicker.C:
			r.updateHostDetailsMetrics()
		case <-hourTicker.C:
			r.updateCloudMetadata(cloudProvider)
		}
	}
}

// Reporter generates Reports containing the host topology.
type Reporter struct {
	sync.RWMutex
	hostID             string
	hostName           string
	probeID            string
	version            string
	pipes              controls.PipeClient
	hostShellCmd       []string
	handlerRegistry    *controls.HandlerRegistry
	pipeIDToTTY        map[string]uintptr
	cloudMeta          CloudMeta
	k8sClusterId       string
	k8sClusterNodeId   string
	k8sClusterName     string
	hostDetailsMetrics HostDetailsMetrics
	hostDetailsMinute  HostDetailsEveryMinute
	OSVersion          string
	KernelVersion      string
	AgentVersion       string
	IsUiVm             string
	userDefinedTags    UserDefinedTags
}

// NewReporter returns a Reporter which produces a report containing host
// topology for this host.
func NewReporter(hostID, hostName, probeID, version string, pipes controls.PipeClient, handlerRegistry *controls.HandlerRegistry) (*Reporter, string, string) {
	kernelRelease, kernelVersion, _ := GetKernelReleaseAndVersion()
	kernel := fmt.Sprintf("%s %s", kernelRelease, kernelVersion)
	isUIvm := "false"
	if dfUtils.IsThisHostUIMachine() {
		isUIvm = "true"
	}
	r := &Reporter{
		hostID:          hostID,
		hostName:        hostName,
		probeID:         probeID,
		pipes:           pipes,
		version:         version,
		hostShellCmd:    getHostShellCmd(),
		handlerRegistry: handlerRegistry,
		pipeIDToTTY:     map[string]uintptr{},
		k8sClusterId:    os.Getenv(report.KubernetesClusterId),
		k8sClusterName:  os.Getenv(report.KubernetesClusterName),
		OSVersion:       runtime.GOOS,
		KernelVersion:   kernel,
		AgentVersion:    agentVersionNo + "-" + agentCommitID + "-" + agentBuildTime,
		IsUiVm:          isUIvm,
		userDefinedTags: UserDefinedTags{
			tags: make([]string, 0),
		},
		hostDetailsMinute: HostDetailsEveryMinute{},
	}
	if r.k8sClusterId != "" {
		r.k8sClusterNodeId = report.MakeKubernetesClusterNodeID(r.k8sClusterId)
	}
	r.registerControls()
	go r.updateUserDefinedTags()
	cloudProvider := cloud_metadata.DetectCloudServiceProvider()
	r.updateCloudMetadata(cloudProvider)
	r.cloudMeta.mtx.RLock()
	cloudRegion := r.cloudMeta.cloudRegion
	r.cloudMeta.mtx.RUnlock()
	go r.updateHostDetails(cloudProvider)
	return r, cloudProvider, cloudRegion
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "Host" }

// GetLocalNetworks is exported for mocking
var GetLocalNetworks = report.GetLocalNetworks

func getInterfaceIpMaskMap(systemInterfaces []net.Interface, captureInterfaceNames []string) (map[string]string, map[string]string) {
	interfaceIpMaskMap := map[string]string{}
	captureInterfaceIpMaskMap := map[string]string{}
	for _, systemInterface := range systemInterfaces {
		interfaceAddrs, err := systemInterface.Addrs()
		if err != nil {
			continue
		}
		interfaceIP := ""
		interfaceMask := ""
		for _, interfaceAddr := range interfaceAddrs {
			if ipnet, ok := interfaceAddr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					interfaceIP = ipnet.IP.String()
					interfaceMask = net.IP(ipnet.Mask).String()
					break
				}
			}
		}
		if interfaceIP != "" && interfaceMask != "" {
			interfaceIpMaskMap[interfaceIP] = interfaceMask
		}
	}
	return interfaceIpMaskMap, captureInterfaceIpMaskMap
}

// Report implements Reporter.

func getInterfaceIPs() (string, string) {
	captureInterfaceNames := []string{}
	systemInterfaces, err := net.Interfaces()

	if err != nil {
		return "{}", "{}"
	}
	interfaceIpMaskMap, captureInterfaceIpMaskMap := getInterfaceIpMaskMap(systemInterfaces, captureInterfaceNames)
	interfaceIpMaskMapStr := "{}"
	interfaceIpMaskMapBytes, err := json.Marshal(interfaceIpMaskMap)
	if err == nil {
		interfaceIpMaskMapStr = string(interfaceIpMaskMapBytes)

	}
	captureInterfaceIpMaskMapStr := "{}"
	captureInterfaceIpMaskMapBytes, err := json.Marshal(captureInterfaceIpMaskMap)
	if err == nil {
		captureInterfaceIpMaskMapStr = string(captureInterfaceIpMaskMapBytes)
	}
	return interfaceIpMaskMapStr, captureInterfaceIpMaskMapStr
}

func getInterfaceNames() (string, error) {
	var result string
	var tmpIfaceName string

	interfaces, err := net.Interfaces()
	if err != nil {
		return "", err
	}
	result = ""
	for _, i := range interfaces {
		tmpIfaceName = i.Name
		if result == "" {
			result = tmpIfaceName
		} else {
			result += ";" + tmpIfaceName
		}
	}
	return result, nil
}

// Report implements Reporter.
func (r *Reporter) Report() (report.Report, error) {
	var (
		rep = report.MakeReport()
	)

	rep.Host = rep.Host.WithMetadataTemplates(MetadataTemplates)
	rep.Host = rep.Host.WithMetricTemplates(MetricTemplates)

	r.cloudMeta.mtx.RLock()
	cloudMetadata := r.cloudMeta.cloudMetadata
	cloudProvider := r.cloudMeta.cloudProvider
	cloudProviderLabel := r.cloudMeta.cloudProviderLabel
	cloudRegion := r.cloudMeta.cloudRegion
	r.cloudMeta.mtx.RUnlock()
	if cloudProvider == "" {
		cloudProvider = "unknown"
		cloudProviderLabel = "Unknown"
	}
	if cloudMetadata == "" {
		cloudMetadata = "{}"
	}

	r.userDefinedTags.RLock()
	userDefinedTags := r.userDefinedTags.tags
	r.userDefinedTags.RUnlock()

	r.hostDetailsMinute.RLock()
	uptime := r.hostDetailsMinute.Uptime
	localCIDRs := r.hostDetailsMinute.LocalCIDRs
	interfaceNames := r.hostDetailsMinute.InterfaceNames
	interfaceIPs := r.hostDetailsMinute.InterfaceIPs
	r.hostDetailsMinute.RUnlock()

	r.hostDetailsMetrics.RLock()
	metrics := r.hostDetailsMetrics.Metrics
	r.hostDetailsMetrics.RUnlock()

	rep.CloudProvider = rep.CloudProvider.WithMetadataTemplates(CloudProviderMetadataTemplates)
	cloudProviderId := report.MakeCloudProviderNodeID(cloudProvider)
	rep.CloudProvider.AddNode(
		report.MakeNodeWith(cloudProviderId, map[string]string{
			Name:  cloudProvider,
			Label: cloudProviderLabel,
		}).WithTopology(CloudProvider),
	)

	rep.CloudRegion = rep.CloudRegion.WithMetadataTemplates(CloudRegionMetadataTemplates)
	cloudRegionId := report.MakeCloudRegionNodeID(cloudRegion + "-" + cloudProvider)
	rep.CloudRegion.AddNode(
		report.MakeNodeWith(cloudRegionId, map[string]string{
			Name:          cloudRegion,
			CloudProvider: cloudProvider,
		}).WithTopology(CloudRegion).WithParent(CloudProvider, cloudProviderId),
	)

	rep.Host.AddNode(
		report.MakeNodeWith(report.MakeHostNodeID(r.hostID), map[string]string{
			report.ControlProbeID: r.probeID,
			Timestamp:             mtime.Now().UTC().Format(time.RFC3339Nano),
			HostName:              r.hostName,
			OS:                    r.OSVersion,
			KernelVersion:         r.KernelVersion,
			Uptime:                uptime,
			InterfaceNames:        interfaceNames,
			InterfaceIPs:          interfaceIPs,
			ProbeId:               r.probeID,
			CloudProvider:         cloudProvider,
			CloudRegion:           cloudRegion,
			CloudMetadata:         cloudMetadata,
			k8sClusterId:          r.k8sClusterId,
			k8sClusterName:        r.k8sClusterName,
			UserDfndTags:          strings.Join(userDefinedTags, ","),
			AgentVersion:          r.AgentVersion,
			IsUiVm:                r.IsUiVm,
			AgentRunning:          agentRunning,
		}).
			WithSets(report.MakeSets().
				Add(LocalNetworks, report.MakeStringSet(localCIDRs...)),
			).
			WithMetrics(metrics).
			WithParent(report.KubernetesCluster, r.k8sClusterNodeId),
	)

	return rep, nil
}

// Stop stops the reporter.
func (r *Reporter) Stop() {
	r.deregisterControls()
}

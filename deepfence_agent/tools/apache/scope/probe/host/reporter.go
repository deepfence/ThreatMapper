package host

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	dfUtils "github.com/deepfence/df-utils"
	"github.com/deepfence/df-utils/cloud_metadata"
	"github.com/weaveworks/scope/report"
)

// Agent version to display in metadata
var (
	agentCommitID            = "Unknown"
	agentBuildTime           = "0"
	DockerSocketPath         = os.Getenv("DOCKER_SOCKET_PATH")
	ContainerdSocketPath     = os.Getenv("CONTAINERD_SOCKET_PATH")
	CrioSocketPath           = os.Getenv("CRIO_SOCKET_PATH")
	foundContainerSocketPath = false
)

func init() {
	if DockerSocketPath != "" && dfUtils.FileExists(DockerSocketPath) {
		foundContainerSocketPath = true
	}
	if ContainerdSocketPath != "" && dfUtils.FileExists(ContainerdSocketPath) {
		foundContainerSocketPath = true
	}
	if CrioSocketPath != "" && dfUtils.FileExists(CrioSocketPath) {
		foundContainerSocketPath = true
	}
}

// Keys for use in Node.Latest.
const (
	Load1 = report.Load1
)

// Exposed for testing.
const (
	ProcStat    = "/proc/stat"
	ProcMemInfo = "/proc/meminfo"

	DefaultCloud      = "private_cloud"
	DefaultCloudLabel = "Private Cloud"
	DefaultRegion     = "Zone"
)

type CloudMeta struct {
	cloudMetadata cloud_metadata.CloudMetadata
	cloudProvider string
	mtx           sync.RWMutex
}

func GetUserDefinedTags() []string {
	var agentTags []string
	// User defined tags can be set from agent side also
	agentTagsStr := os.Getenv("USER_DEFINED_TAGS")
	if agentTagsStr != "" {
		agentTags = strings.Split(agentTagsStr, ",")
	}
	return agentTags
}

func getCloudMetadata(cloudProvider string) (string, cloud_metadata.CloudMetadata) {
	var cloudMetadata cloud_metadata.CloudMetadata
	if cloudProvider == "aws" {
		cloudMetadata, _ = cloud_metadata.GetAWSMetadata(false)
	} else if cloudProvider == "gcp" {
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
		if err == nil && !foundContainerSocketPath {
			cloudProvider = report.CloudProviderServerless
			cloudMetadata.CloudProvider = report.CloudProviderServerless
			cloudMetadata.Region = report.CloudRegionServerless
		}
		if cloudProvider == "" {
			cloudProvider = DefaultCloud
			cloudMetadata = cloud_metadata.CloudMetadata{
				CloudProvider: cloudProvider,
				Label:         DefaultCloudLabel,
				Region:        DefaultRegion,
			}
		}
	}
	if cloudMetadata.Region == "" {
		cloudMetadata.Region = DefaultRegion
	}
	return cloudProvider, cloudMetadata
}

func (r *Reporter) updateCloudMetadata(cloudProvider string) {
	cloudProvider, cloudMetadata := getCloudMetadata(cloudProvider)
	log.Info().Msgf("Cloud metadata: %v", cloudMetadata)

	r.cloudMeta.mtx.Lock()
	r.cloudMeta.cloudProvider = cloudProvider
	r.cloudMeta.cloudMetadata = cloudMetadata
	r.cloudMeta.mtx.Unlock()
}

type UserDefinedTags struct {
	tags []string // Tags given by user. Eg: production, test
	sync.RWMutex
}

type HostDetailsEveryMinute struct {
	Uptime         int
	InterfaceNames []string
	InterfaceIPs   []string
	InterfaceIPMap string
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
	interfaceIPMap, interfaceIPs := getInterfaceIPs()
	var interfaceIPMapStr string
	interfaceIPMapJson, err := json.Marshal(interfaceIPMap)
	if err == nil {
		interfaceIPMapStr = string(interfaceIPMapJson)
	}
	var uptime int
	uptimeObj, err := GetUptime()
	if err != nil {
		uptime = 0
	} else {
		uptime = int(uptimeObj / time.Second)
	}
	r.hostDetailsMinute.Lock()
	r.hostDetailsMinute.Uptime = uptime
	r.hostDetailsMinute.InterfaceNames = interfaceNames
	r.hostDetailsMinute.LocalCIDRs = localCIDRs
	r.hostDetailsMinute.InterfaceIPs = interfaceIPs
	r.hostDetailsMinute.InterfaceIPMap = interfaceIPMapStr
	r.hostDetailsMinute.Unlock()
}

type HostDetailsMetrics struct {
	CpuMax      float64
	CpuUsage    float64
	MemoryMax   int64
	MemoryUsage int64
	sync.RWMutex
}

func (r *Reporter) updateHostDetailsMetrics() {
	cpuUsage, cpuMax := GetCPUUsagePercent()
	memoryUsage, memoryMax := GetMemoryUsageBytes()
	r.hostDetailsMetrics.Lock()
	r.hostDetailsMetrics.CpuMax = cpuMax
	r.hostDetailsMetrics.CpuUsage = cpuUsage
	r.hostDetailsMetrics.MemoryMax = int64(memoryMax)
	r.hostDetailsMetrics.MemoryUsage = int64(memoryUsage)
	r.hostDetailsMetrics.Unlock()
}

func (r *Reporter) updateHostDetails(cloudProvider string) {
	// Set for the first time
	r.updateHostDetailsMetrics()
	r.updateHostDetailsEveryMinute()

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
	hostName           string
	probeID            string
	version            string
	pipeIDToTTY        map[string]uintptr
	cloudMeta          CloudMeta
	k8sClusterId       string
	k8sClusterName     string
	hostDetailsMetrics HostDetailsMetrics
	hostDetailsMinute  HostDetailsEveryMinute
	OSVersion          string
	KernelVersion      string
	AgentVersion       string
	IsConsoleVm        bool
	UserDefinedTags    []string
}

// NewReporter returns a Reporter which produces a report containing host
// topology for this host.
func NewReporter(hostName, probeID, version string) (*Reporter, string, string) {
	kernelRelease, kernelVersion, _ := GetKernelReleaseAndVersion()
	kernel := fmt.Sprintf("%s %s", kernelRelease, kernelVersion)
	isConsoleVm := dfUtils.IsThisConsoleAgent()
	r := &Reporter{
		hostName:          hostName,
		probeID:           probeID,
		version:           version,
		pipeIDToTTY:       map[string]uintptr{},
		k8sClusterId:      os.Getenv(report.KubernetesClusterId),
		k8sClusterName:    os.Getenv(report.KubernetesClusterName),
		OSVersion:         runtime.GOOS,
		KernelVersion:     kernel,
		AgentVersion:      agentCommitID + "-" + agentBuildTime,
		IsConsoleVm:       isConsoleVm,
		hostDetailsMinute: HostDetailsEveryMinute{},
	}

	r.UserDefinedTags = GetUserDefinedTags()

	cloudProvider := cloud_metadata.DetectCloudServiceProvider()
	r.updateCloudMetadata(cloudProvider)
	r.cloudMeta.mtx.RLock()
	cloudRegion := r.cloudMeta.cloudMetadata.Region
	r.cloudMeta.mtx.RUnlock()
	go r.updateHostDetails(cloudProvider)
	return r, cloudProvider, cloudRegion
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "Host" }

// GetLocalNetworks is exported for mocking
var GetLocalNetworks = report.GetLocalNetworks

func getInterfaceIpMaskMap(systemInterfaces []net.Interface) (map[string]string, []string) {
	interfaceIpMaskMap := map[string]string{}
	interfaceIps := []string{}
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
			interfaceIps = append(interfaceIps, interfaceIP)
			interfaceIpMaskMap[interfaceIP] = interfaceMask
		}
	}
	return interfaceIpMaskMap, interfaceIps
}

// Report implements Reporter.

func getInterfaceIPs() (map[string]string, []string) {
	systemInterfaces, err := net.Interfaces()
	if err != nil {
		return map[string]string{}, []string{}
	}
	return getInterfaceIpMaskMap(systemInterfaces)
}

func getInterfaceNames() ([]string, error) {
	var interfaceNames []string
	interfaces, err := net.Interfaces()
	if err != nil {
		return interfaceNames, err
	}
	for _, i := range interfaces {
		interfaceNames = append(interfaceNames, i.Name)
	}
	return interfaceNames, nil
}

// Report implements Reporter.
func (r *Reporter) Report() (report.Report, error) {
	var (
		rep = report.MakeReport()
	)

	r.cloudMeta.mtx.RLock()
	cloudMetadata := r.cloudMeta.cloudMetadata
	cloudProvider := r.cloudMeta.cloudProvider
	r.cloudMeta.mtx.RUnlock()

	r.hostDetailsMinute.RLock()
	uptime := r.hostDetailsMinute.Uptime
	localCIDRs := r.hostDetailsMinute.LocalCIDRs
	interfaceNames := r.hostDetailsMinute.InterfaceNames
	interfaceIPs := r.hostDetailsMinute.InterfaceIPs
	interfaceIPMap := r.hostDetailsMinute.InterfaceIPMap
	r.hostDetailsMinute.RUnlock()

	r.hostDetailsMetrics.RLock()
	cpuMax := r.hostDetailsMetrics.CpuMax
	cpuUsage := r.hostDetailsMetrics.CpuUsage
	memoryMax := r.hostDetailsMetrics.MemoryMax
	memoryUsage := r.hostDetailsMetrics.MemoryUsage
	r.hostDetailsMetrics.RUnlock()

	if len(cloudMetadata.Tags) > 0 {
		cloudMetadata.Tags = append(cloudMetadata.Tags, r.UserDefinedTags...)
	} else {
		cloudMetadata.Tags = r.UserDefinedTags
	}

	rep.CloudProvider.AddNode(
		report.TopologyNode{
			Metadata: report.Metadata{
				Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
				NodeID:    cloudProvider,
				NodeName:  cloudMetadata.Label,
				NodeType:  report.CloudProvider,
			},
		},
	)
	cloudRegionId := cloudMetadata.Region + "-" + cloudProvider
	rep.CloudRegion.AddNode(
		report.TopologyNode{
			Metadata: report.Metadata{
				Timestamp:     time.Now().UTC().Format(time.RFC3339Nano),
				NodeID:        cloudRegionId,
				NodeName:      cloudMetadata.Region,
				NodeType:      report.CloudRegion,
				CloudProvider: cloudProvider,
			},
			Parents: &report.Parent{
				CloudProvider: cloudProvider,
			},
		},
	)

	rep.Host.AddNode(
		report.TopologyNode{
			Metadata: report.Metadata{
				Timestamp:           time.Now().UTC().Format(time.RFC3339Nano),
				NodeID:              r.hostName,
				NodeName:            r.hostName,
				NodeType:            report.Host,
				HostName:            r.hostName,
				Os:                  r.OSVersion,
				KernelVersion:       r.KernelVersion,
				Uptime:              uptime,
				InterfaceNames:      interfaceNames,
				InterfaceIps:        interfaceIPs,
				InterfaceIpMap:      interfaceIPMap,
				Version:             r.version,
				IsConsoleVm:         r.IsConsoleVm,
				AgentRunning:        true,
				LocalCIDRs:          localCIDRs,
				CloudAccountID:      cloudMetadata.AccountID,
				CloudProvider:       cloudProvider,
				CloudRegion:         cloudMetadata.Region,
				InstanceID:          cloudMetadata.InstanceID,
				InstanceType:        cloudMetadata.InstanceType,
				PublicIP:            cloudMetadata.PublicIP,
				PrivateIP:           cloudMetadata.PrivateIP,
				AvailabilityZone:    cloudMetadata.Zone,
				KernelId:            cloudMetadata.KernelId,
				ResourceGroup:       cloudMetadata.ResourceGroupName,
				CpuMax:              cpuMax,
				CpuUsage:            cpuUsage,
				MemoryMax:           memoryMax,
				MemoryUsage:         memoryUsage,
				KubernetesClusterId: r.k8sClusterId,
				Tags:                cloudMetadata.Tags,
			},
			Parents: &report.Parent{
				CloudProvider:     cloudProvider,
				CloudRegion:       cloudRegionId,
				KubernetesCluster: r.k8sClusterId,
			},
		},
	)

	return rep, nil
}

// Stop stops the reporter.
func (r *Reporter) Stop() {

}

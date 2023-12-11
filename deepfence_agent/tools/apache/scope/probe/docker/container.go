package docker

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	docker "github.com/fsouza/go-dockerclient"

	"github.com/weaveworks/scope/report"
)

// These constants are keys used in node metadata
const (
	ContainerPorts         = report.DockerContainerPorts
	ContainerNetworks      = report.DockerContainerNetworks
	ContainerIPs           = report.DockerContainerIPs
	ContainerIPsWithScopes = report.DockerContainerIPsWithScopes
)

// StatsGatherer gathers container stats
type StatsGatherer interface {
	Stats(docker.StatsOptions) error
}

// Container represents a Docker container
type Container interface {
	UpdateState(*docker.Container)

	ID() string
	Image() string
	PID() int
	Hostname() string
	GetNode() *report.TopologyNode
	GetParent() *report.Parent
	State() string
	StateString() string
	HasTTY() bool
	Container() *docker.Container
	StartGatheringStats(StatsGatherer) error
	StopGatheringStats()
	NetworkMode() (string, bool)
	NetworkInfo([]net.IP) *report.Sets
}

type container struct {
	sync.RWMutex
	container              *docker.Container
	stopStats              chan<- bool
	latestStats            docker.Stats
	pendingStats           [60]docker.Stats
	numPending             int
	hostID                 string
	baseNode               report.Metadata
	baseParent             report.Parent
	noCommandLineArguments bool
	noEnvironmentVariables bool
}

// NewContainer creates a new Container
func NewContainer(c *docker.Container, hostID string, noCommandLineArguments bool, noEnvironmentVariables bool) Container {
	result := &container{
		container:              c,
		hostID:                 hostID,
		noCommandLineArguments: noCommandLineArguments,
		noEnvironmentVariables: noEnvironmentVariables,
	}
	result.baseNode, result.baseParent = result.getBaseNode()
	return result
}

func (c *container) UpdateState(container *docker.Container) {
	c.Lock()
	defer c.Unlock()
	c.container = container
}

func (c *container) ID() string {
	return c.container.ID
}

func (c *container) Image() string {
	return trimImageID(c.container.Image)
}

func (c *container) PID() int {
	return c.container.State.Pid
}

func (c *container) Hostname() string {
	if c.container.Config.Domainname == "" {
		return c.container.Config.Hostname
	}

	return fmt.Sprintf("%s.%s", c.container.Config.Hostname,
		c.container.Config.Domainname)
}

func (c *container) HasTTY() bool {
	return c.container.Config.Tty
}

func (c *container) State() string {
	return c.container.State.String()
}

func (c *container) StateString() string {
	return c.container.State.StateString()
}

func (c *container) Container() *docker.Container {
	return c.container
}

func (c *container) StartGatheringStats(client StatsGatherer) error {
	c.Lock()
	defer c.Unlock()

	if c.stopStats != nil {
		return nil
	}
	done := make(chan bool)
	c.stopStats = done

	stats := make(chan *docker.Stats)
	opts := docker.StatsOptions{
		ID:     c.container.ID,
		Stats:  stats,
		Stream: true,
		Done:   done,
	}

	log.Debug().Msgf("docker container: collecting stats for %s", c.container.ID)

	go func() {
		if err := client.Stats(opts); err != nil && err != io.EOF && err != io.ErrClosedPipe {
			log.Error().Msgf("docker container: error collecting stats for %s: %v", c.container.ID, err)
		}
	}()

	go func() {
		for s := range stats {
			c.Lock()
			if c.numPending >= len(c.pendingStats) {
				log.Debug().Msgf("docker container: dropping stats for %s", c.container.ID)
			} else {
				c.latestStats = *s
				c.pendingStats[c.numPending] = *s
				c.numPending++
			}
			c.Unlock()
		}
		log.Debug().Msgf("docker container: stopped collecting stats for %s", c.container.ID)
		c.Lock()
		if c.stopStats == done {
			c.stopStats = nil
		}
		c.Unlock()
	}()

	return nil
}

func (c *container) StopGatheringStats() {
	c.Lock()
	defer c.Unlock()
	if c.stopStats != nil {
		close(c.stopStats)
		c.stopStats = nil
	}
}

func (c *container) ports(localAddrs []net.IP) report.StringSet {
	if c.container.NetworkSettings == nil {
		return report.MakeStringSet()
	}

	ports := []string{}
	for port, bindings := range c.container.NetworkSettings.Ports {
		if len(bindings) == 0 {
			ports = append(ports, fmt.Sprintf("%s", port))
			continue
		}
		for _, b := range bindings {
			if b.HostIP != "0.0.0.0" {
				ports = append(ports, fmt.Sprintf("%s:%s->%s", b.HostIP, b.HostPort, port))
				continue
			}

			for _, ip := range localAddrs {
				if ip.To4() != nil {
					ports = append(ports, fmt.Sprintf("%s:%s->%s", ip, b.HostPort, port))
				}
			}
		}
	}

	return report.MakeStringSet(ports...)
}

func (c *container) NetworkMode() (string, bool) {
	c.RLock()
	defer c.RUnlock()
	if c.container.HostConfig != nil {
		return c.container.HostConfig.NetworkMode, true
	}
	return "", false
}

func addScopeToIPs(hostID string, ips []net.IP) []string {
	ipsWithScopes := []string{}
	for _, ip := range ips {
		ipsWithScopes = append(ipsWithScopes, report.MakeAddressNodeIDB(hostID, ip))
	}
	return ipsWithScopes
}

func (c *container) NetworkInfo(localAddrs []net.IP) *report.Sets {
	c.RLock()
	defer c.RUnlock()

	ips := c.container.NetworkSettings.SecondaryIPAddresses
	if c.container.NetworkSettings.IPAddress != "" {
		ips = append(ips, c.container.NetworkSettings.IPAddress)
	}

	if c.container.State.Running && c.container.State.Pid != 0 {
		// Fetch IP addresses from the container's namespace
		cidrs, err := namespaceIPAddresses(c.container.State.Pid)
		if err != nil {
			log.Debug().Msgf("container %s: failed to get addresses: %s", c.container.ID, err)
		}
		for _, cidr := range cidrs {
			// This address can duplicate an address fetched from Docker earlier,
			// but we eventually turn the lists into sets which will remove duplicates.
			ips = append(ips, cidr.IP.String())
		}
	}

	// For now, for the proof-of-concept, we just add networks as a set of
	// names. For the next iteration, we will probably want to create a new
	// Network topology, populate the network nodes with all of the details
	// here, and provide foreign key links from nodes to networks.
	networks := make([]string, 0, len(c.container.NetworkSettings.Networks))
	for name, settings := range c.container.NetworkSettings.Networks {
		if name == "none" {
			continue
		}
		networks = append(networks, name)
		if settings.IPAddress != "" {
			ips = append(ips, settings.IPAddress)
		}
	}

	// Filter out IPv6 addresses; nothing works with IPv6 yet
	ipv4s := []string{}
	ipv4ips := []net.IP{}
	for _, ip := range ips {
		ipaddr := net.ParseIP(ip)
		if ipaddr != nil && ipaddr.To4() != nil {
			ipv4s = append(ipv4s, ip)
			ipv4ips = append(ipv4ips, ipaddr)
		}
	}
	// Treat all Docker IPs as local scoped.
	ipsWithScopes := addScopeToIPs(c.hostID, ipv4ips)

	s := report.MakeSets()
	if len(networks) > 0 {
		s = s.Add(ContainerNetworks, report.MakeStringSet(networks...))
	}
	if len(c.container.NetworkSettings.Ports) > 0 {
		s = s.Add(ContainerPorts, c.ports(localAddrs))
	}
	if len(ipv4s) > 0 {
		s = s.Add(ContainerIPs, report.MakeStringSet(ipv4s...))
	}
	if len(ipsWithScopes) > 0 {
		s = s.Add(ContainerIPsWithScopes, report.MakeStringSet(ipsWithScopes...))
	}
	return &s
}

func (c *container) memoryUsageMetric(stats []docker.Stats) (int64, int64) {
	var max uint64
	if len(stats) == 0 {
		return 0, 0
	}
	s := stats[len(stats)-1]
	if s.MemoryStats.Limit > max {
		max = s.MemoryStats.Limit
	}
	return int64(s.MemoryStats.Usage - s.MemoryStats.Stats.Cache), int64(max)
}

func (c *container) cpuPercentMetric(stats []docker.Stats) (float64, float64) {
	if len(stats) < 2 {
		return 0.0, 0.0
	}
	var recentCpuUsage float64
	previous := stats[0]
	for _, s := range stats[1:] {
		// Copies from docker/api/client/stats.go#L205
		cpuDelta := float64(s.CPUStats.CPUUsage.TotalUsage - previous.CPUStats.CPUUsage.TotalUsage)
		systemDelta := float64(s.CPUStats.SystemCPUUsage - previous.CPUStats.SystemCPUUsage)
		cpuPercent := 0.0
		if systemDelta > 0.0 && cpuDelta > 0.0 {
			cpuPercent = (cpuDelta / systemDelta) * 100.0
		}
		recentCpuUsage = cpuPercent
		previous = s
	}
	return recentCpuUsage, 100.0
}

func (c *container) metrics() (int64, int64, float64, float64) {
	if c.numPending == 0 {
		return 0, 0, 0.0, 0.0
	}
	pendingStats := c.pendingStats[:c.numPending]
	memoryUsage, memoryMax := c.memoryUsageMetric(pendingStats)
	cpuUsage, cpuMax := c.cpuPercentMetric(pendingStats)

	// leave one stat to help with relative metrics
	c.pendingStats[0] = c.pendingStats[c.numPending-1]
	c.numPending = 1
	return memoryUsage, memoryMax, cpuUsage, cpuMax
}

func (c *container) env() map[string]string {
	result := map[string]string{}
	for _, value := range c.container.Config.Env {
		v := strings.SplitN(value, "=", 2)
		if len(v) != 2 {
			continue
		}
		result[v[0]] = v[1]
	}
	return result
}

func (c *container) getSanitizedCommand() string {
	result := c.container.Path
	if !c.noCommandLineArguments {
		result = result + " " + strings.Join(c.container.Args, " ")
	}
	return result
}

func (c *container) getBaseNode() (report.Metadata, report.Parent) {
	containerName := strings.TrimPrefix(c.container.Name, "/")
	if containerName == "" {
		containerName = c.ID()
	}
	var dockerLabels string
	podName := c.container.Config.Labels["io.kubernetes.pod.name"]
	podUid := c.container.Config.Labels["io.kubernetes.pod.uid"]
	dockerLabelsJson, err := json.Marshal(c.container.Config.Labels)
	if err == nil {
		dockerLabels = string(dockerLabelsJson)
	}
	result := report.Metadata{
		Timestamp:              time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:                 c.ID(),
		NodeName:               containerName + " / " + c.hostID,
		NodeType:               report.Container,
		HostName:               c.hostID,
		DockerContainerName:    containerName,
		DockerContainerCreated: c.container.Created.Format(time.RFC3339Nano),
		DockerContainerCommand: c.getSanitizedCommand(),
		DockerImageID:          c.Image(),
		DockerLabels:           dockerLabels,
		PodName:                podName,
		PodID:                  podUid,
	}
	parents := report.Parent{
		Host:           c.hostID,
		ContainerImage: c.Image(),
		Pod:            podUid,
	}
	if !c.noEnvironmentVariables {
		dockerEnvJson, err := json.Marshal(c.env())
		if err == nil {
			result.DockerEnv = string(dockerEnvJson)
		}
	}
	return result, parents
}

func (c *container) GetParent() *report.Parent {
	return &c.baseParent
}

func (c *container) GetNode() *report.TopologyNode {
	c.Lock()
	defer c.Unlock()
	c.baseNode.DockerContainerState = c.StateString()
	if report.SkipReportContainerState[c.baseNode.DockerContainerState] {
		return nil
	}
	c.baseNode.DockerContainerStateHuman = c.State()
	c.baseNode.Timestamp = time.Now().UTC().Format(time.RFC3339Nano)

	if !c.container.State.Paused && c.container.State.Running {
		uptimeSeconds := int(time.Now().Sub(c.container.State.StartedAt) / time.Second)
		networkMode := ""
		if c.container.HostConfig != nil {
			networkMode = c.container.HostConfig.NetworkMode
		}
		c.baseNode.Uptime = uptimeSeconds
		c.baseNode.DockerContainerNetworkMode = networkMode
		c.baseNode.MemoryUsage, c.baseNode.MemoryMax, c.baseNode.CpuUsage, c.baseNode.CpuMax = c.metrics()
	} else {
		c.baseNode.MemoryUsage, c.baseNode.MemoryMax, c.baseNode.CpuUsage, c.baseNode.CpuMax = 0, 0, 0, 0
	}
	return &report.TopologyNode{
		Metadata: c.baseNode,
		Parents:  c.GetParent(),
	}
}

// ContainerIsStopped checks if the docker container is in one of our "stopped" states
func ContainerIsStopped(c Container) bool {
	state := c.StateString()
	return state != report.StateRunning && state != report.StateRestarting && state != report.StatePaused
}

// splitImageName returns parts of the full image name (image name, image tag).
func splitImageName(imageName string) []string {
	//parts := strings.SplitN(imageName, "/", 3)
	//if len(parts) == 3 {
	//	imageName = fmt.Sprintf("%s/%s", parts[1], parts[2])
	//}
	return strings.SplitN(imageName, ":", 2)
}

// ImageNameWithoutTag splits the image name apart, returning the name
// without the version, if possible
func ImageNameWithoutTag(imageName string) string {
	return splitImageName(imageName)[0]
}

func ParseImageDigest(imageDigest string) (string, string) {
	digestSplit := strings.Split(imageDigest, "@")
	return digestSplit[0], "<none>"
}

// ImageNameTag splits the image name apart, returning the version tag, if possible
func ImageNameTag(imageName string) string {
	imageNameParts := splitImageName(imageName)
	if len(imageNameParts) < 2 {
		return ""
	}
	return imageNameParts[1]
}

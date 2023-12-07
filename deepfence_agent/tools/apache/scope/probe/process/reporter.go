package process

import (
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/report"
)

// We use these keys in node metadata
const (
	CPUUsage       = "process_cpu_usage_percent"
	MemoryUsage    = "process_memory_usage_bytes"
	OpenFilesCount = "open_files_count"
)

type reportCache struct {
	reportData report.Topology
	sync.RWMutex
}

// Reporter generates Reports containing the Process topology.
type Reporter struct {
	hostID                 string
	walker                 Walker
	jiffies                Jiffies
	noCommandLineArguments bool
	reportCacheData        reportCache
	hostName               string
	ptracer                *InfoTracer
}

// Jiffies is the type for the function used to fetch the elapsed jiffies.
type Jiffies func() (uint64, float64, error)

// Setup & Start open files tracing
func StartOpenFilesTracing() *InfoTracer {
	ptracer, err := NewInfoTracer()
	if err != nil {
		log.Error().Msg("Failed to start eBPF process")
		return nil
	}
	log.Info().Msg("started eBPF process")
	return ptracer
}

// NewReporter makes a new Reporter.
func NewReporter(walker Walker, hostID string, jiffies Jiffies, noCommandLineArguments, trackProcDeploads bool) *Reporter {

	r := &Reporter{
		hostID:                 hostID,
		walker:                 walker,
		jiffies:                jiffies,
		noCommandLineArguments: noCommandLineArguments,
		reportCacheData:        reportCache{},
		hostName:               hostname.Get(),
		ptracer:                nil,
	}

	if trackProcDeploads {
		r.ptracer = StartOpenFilesTracing()
	}

	go r.updateProcessCache()

	return r
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "Process" }

func (r *Reporter) updateProcessCache() {

	processData, err := r.processTopology()
	if err == nil {
		r.reportCacheData.Lock()
		r.reportCacheData.reportData = processData
		r.reportCacheData.Unlock()
	}
	minuteTicker := time.NewTicker(1 * time.Minute)
	for {
		select {
		case <-minuteTicker.C:
			processData, err := r.processTopology()
			if err == nil {
				r.reportCacheData.Lock()
				r.reportCacheData.reportData = processData
				r.reportCacheData.Unlock()
			}
		}
	}
}

// Report implements Reporter.
func (r *Reporter) Report() (report.Report, error) {
	result := report.MakeReport()
	/*
		processes, err := r.processTopology()
		if err != nil {
			return result, err
		}
	*/
	r.reportCacheData.Lock()
	processes := r.reportCacheData.reportData
	r.reportCacheData.Unlock()
	result.Process.Merge(processes)
	return result, nil
}

func shortProcessName(processName string) string {
	return filepath.Base(processName)
}

func (r *Reporter) processTopology() (report.Topology, error) {
	t := report.MakeTopology()
	deltaTotal, maxCPU, err := r.jiffies()
	if err != nil {
		return t, err
	}

	err = r.walker.Walk(func(p, prev Process) {
		pidstr := strconv.Itoa(p.PID)
		nodeID := report.MakeProcessNodeID(r.hostID, pidstr)
		metadata := report.Metadata{
			Timestamp:      time.Now().UTC().Format(time.RFC3339Nano),
			NodeID:         nodeID,
			NodeName:       p.Name,
			ShortNodeName:  shortProcessName(p.Name),
			NodeType:       report.Process,
			HostName:       r.hostName,
			Pid:            p.PID,
			Ppid:           p.PPID,
			Threads:        p.Threads,
			MemoryMax:      int64(p.RSSBytesLimit),
			MemoryUsage:    int64(p.RSSBytes),
			OpenFilesCount: p.OpenFilesCount,
		}
		if r.ptracer != nil {
			paths, err := r.ptracer.GetOpenFileList(pidstr)
			if err == nil {
				metadata.OpenFiles = paths
			}
		}
		if p.Cmdline != "" {
			if r.noCommandLineArguments {
				metadata.Cmdline = report.StripCommandArgs(p.Cmdline)
			} else {
				metadata.Cmdline = p.Cmdline
			}
		}

		if p.PPID > 0 {
			metadata.Ppid = p.PPID
		} else {
			metadata.Ppid = -1
		}
		if deltaTotal > 0 {
			cpuUsage := float64(p.Jiffies-prev.Jiffies) / float64(deltaTotal) * 100.
			metadata.CpuMax = maxCPU
			metadata.CpuUsage = cpuUsage
		}

		t.AddNode(report.TopologyNode{
			Metadata: metadata,
			Parents: &report.Parent{
				Host: r.hostName,
			},
		})
	})

	return t, err
}

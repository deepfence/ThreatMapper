package process

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/weaveworks/common/mtime"
	"github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/report"
)

// We use these keys in node metadata
const (
	PID            = report.PID
	Name           = report.Name
	PPID           = report.PPID
	Cmdline        = report.Cmdline
	Threads        = report.Threads
	OpenFiles      = report.OpenFiles
	CPUUsage       = "process_cpu_usage_percent"
	MemoryUsage    = "process_memory_usage_bytes"
	OpenFilesCount = "open_files_count"
)

// Exposed for testing
var (
	MetadataTemplates = report.MetadataTemplates{
		PID:       {ID: PID, Label: "PID", From: report.FromLatest, Datatype: report.Number, Priority: 1},
		Cmdline:   {ID: Cmdline, Label: "Command", From: report.FromLatest, Priority: 2},
		PPID:      {ID: PPID, Label: "Parent PID", From: report.FromLatest, Datatype: report.Number, Priority: 3},
		Threads:   {ID: Threads, Label: "# Threads", From: report.FromLatest, Datatype: report.Number, Priority: 4},
		OpenFiles: {ID: OpenFiles, Label: "Open File Names", From: report.FromLatest, Priority: 5},
	}

	MetricTemplates = report.MetricTemplates{
		CPUUsage:       {ID: CPUUsage, Label: "CPU", Format: report.PercentFormat, Priority: 1},
		MemoryUsage:    {ID: MemoryUsage, Label: "Memory", Format: report.FilesizeFormat, Priority: 2},
		OpenFilesCount: {ID: OpenFilesCount, Label: "Open files", Format: report.IntegerFormat, Priority: 3},
	}
)

type reportCache struct {
	reportData report.Topology
	sync.RWMutex
}

// Reporter generates Reports containing the Process topology.
type Reporter struct {
	scope                  string
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
		logrus.Error("Failed to start eBPF process")
		return nil
	}
	logrus.Info("started eBPF process")
	return ptracer
}

// NewReporter makes a new Reporter.
func NewReporter(walker Walker, scope string, jiffies Jiffies, noCommandLineArguments, trackProcDeploads bool) *Reporter {

	r := &Reporter{
		scope:                  scope,
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
func (Reporter) Name() string { return "Process" }

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
	result.Process = result.Process.Merge(processes)
	return result, nil
}

func (r *Reporter) processTopology() (report.Topology, error) {
	t := report.MakeTopology().
		WithMetadataTemplates(MetadataTemplates).
		WithMetricTemplates(MetricTemplates)
	now := mtime.Now()
	deltaTotal, maxCPU, err := r.jiffies()
	if err != nil {
		return t, err
	}

	err = r.walker.Walk(func(p, prev Process) {
		pidstr := strconv.Itoa(p.PID)
		nodeID := report.MakeProcessNodeID(r.scope, pidstr)
		node := report.MakeNode(nodeID)
		node = node.WithLatest("host_name", now, r.hostName)
		node = node.WithLatest(PID, now, pidstr)
		node = node.WithLatest(Threads, now, strconv.Itoa(p.Threads))

		if r.ptracer != nil {
			paths, err := r.ptracer.GetOpenFileList(pidstr)
			if err == nil {
				node = node.WithLatest(OpenFiles, now, strings.Join(paths, ","))
			}
		}

		if p.Name != "" {
			node = node.WithLatest(Name, now, p.Name)
		}

		if p.Cmdline != "" {
			if r.noCommandLineArguments {
				node = node.WithLatest(Cmdline, now, report.StripCommandArgs(p.Cmdline))
			} else {
				node = node.WithLatest(Cmdline, now, p.Cmdline)
			}
		}

		if p.PPID > 0 {
			node = node.WithLatest(PPID, now, strconv.Itoa(p.PPID))
		}

		var metrics = report.Metrics{
			MemoryUsage:    report.MakeSingletonMetric(now, float64(p.RSSBytes)).WithMax(float64(p.RSSBytesLimit)),
			OpenFilesCount: report.MakeSingletonMetric(now, float64(p.OpenFilesCount)).WithMax(float64(p.OpenFilesLimit)),
		}
		if deltaTotal > 0 {
			cpuUsage := float64(p.Jiffies-prev.Jiffies) / float64(deltaTotal) * 100.
			metrics[CPUUsage] = report.MakeSingletonMetric(now, cpuUsage).WithMax(maxCPU)
		}

		node = node.WithMetrics(metrics)

		t.AddNode(node)
	})

	return t, err
}

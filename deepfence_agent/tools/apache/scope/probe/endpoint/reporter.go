package endpoint

import (
	"github.com/weaveworks/scope/probe/endpoint/procspy"
	"github.com/weaveworks/scope/probe/process"
)

// ReporterConfig are the config options for the endpoint reporter.
type ReporterConfig struct {
	HostName     string
	SpyProcs     bool
	UseConntrack bool
	WalkProc     bool
	UseEbpfConn  bool
	ProcRoot     string
	BufferSize   int
	ProcessCache *process.CachingWalker
	Scanner      procspy.ConnectionScanner
	DNSSnooper   *DNSSnooper
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "Endpoint" }

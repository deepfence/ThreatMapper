package report

// constants used in node metadata values
const (
	StateCreated    = "created"
	StateDead       = "dead"
	StateExited     = "exited"
	StatePaused     = "paused"
	StateRestarting = "restarting"
	StateRunning    = "running"
	StateUnknown    = "unknown"
)

var (
	// SkipReportContainerState Skip report based on container state
	SkipReportContainerState = map[string]bool{
		StateCreated:    true,
		StateDead:       true,
		StateExited:     true,
		StatePaused:     false,
		StateRestarting: true,
		StateRunning:    false,
		StateUnknown:    true,
	}
)

package host

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	linuxproc "github.com/c9s/goprocinfo/linux"

	"golang.org/x/sys/unix"
)

// agent is something
const (
	DockerSockPath = "/var/run/docker.sock"
	HostMountDir   = "/fenced/mnt/host/"
	kb             = 1024
)

// FileExists something
func FileExists(name string) bool {
	// Reports whether the named file or directory exists.
	if _, err := os.Stat(name); err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return true
}

// Uname is swappable for mocking in tests.
var Uname = unix.Uname

// GetKernelReleaseAndVersion returns the kernel version as reported by uname.
var GetKernelReleaseAndVersion = func() (string, string, error) {
	var utsname unix.Utsname
	if err := Uname(&utsname); err != nil {
		return "unknown", "unknown", err
	}
	release := utsname.Release[:bytes.IndexByte(utsname.Release[:], 0)]
	if !FileExists(HostMountDir) {
		versionBytes, err := exec.Command("grep", "^PRETTY_NAME=", `/etc/os-release`).CombinedOutput()
		if err != nil {
			return string(release), "unknown", err
		}
		version := strings.Trim(string(versionBytes), " \n")
		version = version[13 : len(version)-1]
		return string(release), version, nil
	}
	version := utsname.Version[:bytes.IndexByte(utsname.Version[:], 0)]
	return string(release), string(version), nil
}

// GetLoad returns the current load averages as metrics.
//var GetLoad = func(now time.Time) report.Metrics {
//	buf, err := os.ReadFile("/proc/loadavg")
//	if err != nil {
//		return nil
//	}
//	toks := strings.Fields(string(buf))
//	if len(toks) < 3 {
//		return nil
//	}
//	one, err := strconv.ParseFloat(toks[0], 64)
//	if err != nil {
//		return nil
//	}
//	return report.Metrics{
//		Load1: report.MakeSingletonMetric(now, one),
//	}
//}

// GetUptime returns the uptime of the host.
var GetUptime = func() (time.Duration, error) {
	buf, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0, err
	}

	fields := strings.Fields(string(buf))
	if len(fields) != 2 {
		return 0, fmt.Errorf("invalid format: %s", string(buf))
	}

	uptime, err := strconv.ParseFloat(fields[0], 64)
	if err != nil {
		return 0, err
	}

	return time.Duration(uptime) * time.Second, nil
}

var previousStat = linuxproc.CPUStat{}

// GetCPUUsagePercent returns the percent cpu usage and max (i.e. 100% or 0 if unavailable)
var GetCPUUsagePercent = func() (float64, float64) {
	stat, err := linuxproc.ReadStat(ProcStat)
	if err != nil {
		return 0.0, 0.0
	}

	// From http://stackoverflow.com/questions/23367857/accurate-calculation-of-cpu-usage-given-in-percentage-in-linux
	var (
		currentStat = stat.CPUStatAll
		prevIdle    = previousStat.Idle + previousStat.IOWait
		idle        = currentStat.Idle + currentStat.IOWait
		prevNonIdle = (previousStat.User + previousStat.Nice + previousStat.System +
			previousStat.IRQ + previousStat.SoftIRQ + previousStat.Steal)
		nonIdle = (currentStat.User + currentStat.Nice + currentStat.System +
			currentStat.IRQ + currentStat.SoftIRQ + currentStat.Steal)
		prevTotal = prevIdle + prevNonIdle
		total     = idle + nonIdle
		// differentiate: actual value minus the previous one
		totald = total - prevTotal
		idled  = idle - prevIdle
	)
	previousStat = currentStat
	return float64(totald-idled) * 100. / float64(totald), 100.
}

// GetMemoryUsageBytes returns the bytes memory usage and max
var GetMemoryUsageBytes = func() (int64, int64) {
	meminfo, err := linuxproc.ReadMemInfo(ProcMemInfo)
	if err != nil {
		return 0, 0
	}

	used := meminfo.MemTotal - meminfo.MemFree - meminfo.Buffers - meminfo.Cached
	return int64(used * kb), int64(meminfo.MemTotal * kb)
}

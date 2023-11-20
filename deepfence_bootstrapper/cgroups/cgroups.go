package cgroups

import (
	"errors"
	"fmt"
	"os"
	"runtime"

	"github.com/containerd/cgroups/v3"
	"github.com/containerd/cgroups/v3/cgroup1"
	"github.com/containerd/cgroups/v3/cgroup2"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/opencontainers/runtime-spec/specs-go"
)

var (
	cgroups1          = map[string]cgroup1.Cgroup{}
	cgroups2          = map[string]*cgroup2.Manager{}
	ErrFailUpdate     = errors.New("failed to update")
	ErrFailCreate     = errors.New("failed to create")
	ErrCgroupNotExist = errors.New("cgroup does not exist")
	cgroupV2          bool
)

func init() {
	if cgroups.Mode() == cgroups.Unified {
		cgroupV2 = true
	}
}

func LoadCgroup(name string, cpulimit int64, memlimit int64) error {
	if !cgroupV2 {
		shares := uint64(cpulimit)
		path := cgroup1.StaticPath(fmt.Sprintf("/%s", name))
		control, err := cgroup1.Load(path)
		if err == nil {
			if err := control.Update(&specs.LinuxResources{
				CPU: &specs.LinuxCPU{
					Shares: &shares,
				},
			}); err != nil {
				return ErrFailUpdate
			}
		} else {
			control, err = cgroup1.New(path, &specs.LinuxResources{
				CPU: &specs.LinuxCPU{
					Shares: &shares,
				},
				Memory: &specs.LinuxMemory{
					Limit: &memlimit,
				},
			})
			if err != nil {
				log.Error().Err(err).Msg("create")
				return ErrFailCreate
			}
		}
		cgroups1[name] = control
	} else {
		cpuperiod := uint64(100000) // 100 ms
		totalCPU := int64(1000000 * runtime.NumCPU())
		cpulimit *= totalCPU
		cpulimit /= 100

		res := cgroup2.Resources{
			CPU: &cgroup2.CPU{
				Max: cgroup2.NewCPUMax(&cpulimit, &cpuperiod),
			},
			Memory: &cgroup2.Memory{
				Max: &memlimit,
			},
		}
		m, err := cgroup2.LoadSystemd("/", name+".slice")
		if err != nil {
			return err
		}
		err = m.Update(&res)
		if err != nil {
			// This hack is needed inside containers
			if _, err := os.Stat("/sys/fs/cgroup/" + name + ".slice"); os.IsNotExist(err) {
				err := os.Mkdir("/sys/fs/cgroup/"+name+".slice", os.ModeDir)
				return err
			}
			m, err = cgroup2.NewSystemd("/", name+".slice", -1, &res)
			if err != nil {
				return err
			}
		}
		cgroups2[name] = m
	}
	return nil
}

func AttachProcessToCgroup(name string, pid int) error {
	if !cgroupV2 {
		control, has := cgroups1[name]
		if !has {
			return ErrCgroupNotExist
		}
		return control.Add(cgroup1.Process{Pid: pid})
	} else {
		m, has := cgroups2[name]
		if !has {
			return ErrCgroupNotExist
		}
		return m.AddProc(uint64(pid))
	}
}

func UnloadAll() {
	for _, v := range cgroups1 {
		_ = v.Delete()
	}
	for _, m := range cgroups2 {
		_ = m.DeleteSystemd()
	}
}

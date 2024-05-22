package config

import (
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"gopkg.in/ini.v1"
)

type ProcessEntry struct {
	Autorestart bool
	Autostart   bool
	Path        string
	Name        string
	Cgroup      string
	Env         string
	Command     string
}

type CgroupEntry struct {
	MaxCPU int
	MaxMem int
	Name   string
}

type Config struct {
	Processes []ProcessEntry
	Cgroups   []CgroupEntry
}

func NewIniConfig(input []byte) (Config, error) {
	res := Config{}
	cfg, err := ini.Load(input)
	if err != nil {
		return res, err
	}
	processEntries := []ProcessEntry{}
	cgroupEntries := []CgroupEntry{}
	for _, section := range cfg.Sections() {
		typeName := strings.Split(section.Name(), ":")
		if len(typeName) != 2 {
			log.Warn().Msgf("Illformed section name: %s", section.Name())
			continue
		}
		if typeName[0] == "process" {
			processEntries = append(processEntries, ProcessEntry{
				Autorestart: section.Key("autorestart").MustBool(),
				Autostart:   section.Key("autostart").MustBool(),
				Path:        section.Key("path").String(),
				Cgroup:      section.Key("cgroup").String(),
				Command:     section.Key("command").String(),
				Env:         section.Key("environment").String(),
				Name:        typeName[1],
			})
			log.Info().Msgf("Adding process: %v", processEntries[len(processEntries)-1])
		} else if typeName[0] == "cgroup" {
			cgroupEntries = append(cgroupEntries, CgroupEntry{
				MaxCPU: section.Key("maxcpu").MustInt(),
				MaxMem: section.Key("maxmem").MustInt(),
				Name:   typeName[1],
			})
		}
	}
	res.Processes = processEntries
	res.Cgroups = cgroupEntries
	return res, nil
}

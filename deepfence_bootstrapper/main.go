package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/cgroups"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/config"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/server"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"

	_ "embed"
)

//go:embed assets/config.ini
var config_file []byte

func main() {
	cfg, err := config.NewIniConfig(config_file)
	if err != nil {
		log.Fatal().Msgf("%v", err)
	}
	c := make(chan os.Signal, 2)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	cc := make(chan struct{})
	server.StartRPCServer("/tmp/deepfence_boot.sock", cc)

	for _, entry := range cfg.Cgroups {
		err := cgroups.LoadCgroup(entry.Name, int64(entry.MaxCPU), int64(entry.MaxMem))
		if err == cgroups.FailUpdateError {
			log.Error().Msgf("Failed to update %s", entry.Name)
		} else if err == cgroups.FailCreateError {
			log.Fatal().Msgf("Failed to create %s", entry.Name)
		} else if err != nil {
			log.Error().Err(err).Msg("Error on cgroup")
		}
	}

	autostart := []string{}
	for _, entry := range cfg.Processes {
		supervisor.LoadProcess(entry.Name, entry.Path, entry.Command, entry.Env, entry.Autorestart, entry.Cgroup)
		if entry.Autorestart {
			autostart = append(autostart, entry.Name)
		}
	}

	for _, name := range autostart {
		supervisor.StartProcess(name)
	}

loop:
	for {
		select {
		case <-c:
			select {
			case cc <- struct{}{}:
			default:
			}
			break loop
		}
	}

	cgroups.UnloadAll()
	os.Exit(0)

}

package main

import (
	"errors"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/cgroups"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/config"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/controls"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/router"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/server"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"

	dfUtils "github.com/deepfence/df-utils"

	_ "embed"
)

var authCheckPeriod = time.Second * 10

//go:embed assets/config.ini
var config_file []byte

var enable_cluster_discovery bool

var enable_debug bool

var hostname string

var Version string

func init() {
	var err error
	enable_cluster_discovery = os.Getenv("DF_ENABLE_CLUSTER_DISCOVERY") != ""
	if hostname = os.Getenv("SCOPE_HOSTNAME"); hostname == "" {
		hostname, err = os.Hostname()
		if err != nil {
			hostname = "(unknown)"
		}
	}

	verbosity := "info"
	enable_debug = os.Getenv("DF_ENABLE_DEBUG") != ""
	if enable_debug {
		verbosity = "debug"
	}
	log.Initialize(verbosity)
}

func main() {
	log.Info().Msg("Starting bootstrapper")
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
		err := supervisor.StartProcess(name)
		if err != nil {
			log.Error().Msgf("Autostart for %v had issue: %v", name, err)
		}
	}

	if enable_cluster_discovery {
		_, k8sClusterName, _, _, _ := dfUtils.GetKubernetesDetails()
		controls.SetClusterAgentControls(k8sClusterName)
	} else {
		controls.SetAgentControls()
	}

	var consoleClient *router.OpenapiClient
	for {
		consoleClient, err = router.NewOpenapiClient()
		if err == nil {
			break
		} else if errors.Is(err, router.ConnError) {
			log.Warn().Msg("Failed to authenticate. Retrying...")
			time.Sleep(authCheckPeriod)
		} else {
			log.Fatal().Msgf("Fatal: %v", err)
		}
	}
	for {
		if enable_cluster_discovery {
			k8sClusterId, _, _, _, _ := dfUtils.GetKubernetesDetails()
			err = consoleClient.StartControlsWatching(k8sClusterId, true, Version)
		} else {
			err = consoleClient.StartControlsWatching(hostname, false, Version)
		}
		if err == nil {
			break
		}
		log.Error().Msgf("Failed to get init controls %v. Retrying...\n", err)
		time.Sleep(authCheckPeriod)
	}

	log.Info().Msg("Everything is up")
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

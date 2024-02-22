package main

import (
	"context"
	_ "embed"
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
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	dfUtils "github.com/deepfence/df-utils"
)

var authCheckPeriod = time.Second * 10

//go:embed assets/config.ini
var configFile []byte

//go:embed assets/config-cluster.ini
var configClusterFile []byte

var enableClusterDiscovery bool

var binaryOnly bool

var enableDebug bool

var hostname string

var Version string

func init() {
	var err error
	enableClusterDiscovery = os.Getenv("DF_ENABLE_CLUSTER_DISCOVERY") != ""
	binaryOnly = os.Getenv("DF_SERVERLESS") != ""
	if hostname = os.Getenv("SCOPE_HOSTNAME"); hostname == "" {
		hostname, err = os.Hostname()
		if err != nil {
			hostname = "(unknown)"
		}
	}

	verbosity := "info"
	enableDebug = os.Getenv("DF_ENABLE_DEBUG") != ""
	if enableDebug {
		verbosity = "debug"
	}
	_ = log.Initialize(verbosity)
}

func main() {
	log.Info().Msgf("version: %s", Version)
	log.Info().Msg("Starting bootstrapper")

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	var cfg config.Config
	var err error
	if enableClusterDiscovery {
		cfg, err = config.NewIniConfig(configClusterFile)
	} else {
		cfg, err = config.NewIniConfig(configFile)
	}
	if err != nil {
		log.Panic().Msgf("%v", err)
	}

	err = server.StartRPCServer(ctx, "/tmp/deepfence_boot.sock")
	if err != nil {
		log.Panic().Msgf("%v", err)
	}

	if !enableClusterDiscovery && !binaryOnly {
		for _, entry := range cfg.Cgroups {
			err := cgroups.LoadCgroup(entry.Name, int64(entry.MaxCPU), int64(entry.MaxMem))
			if err != nil {
				log.Error().Err(err).Str("entry_name", entry.Name).Msg("Error on cgroup")
				if errors.Is(err, cgroups.ErrFailCreate) {
					panic(cgroups.ErrFailCreate)
				}
			}
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

	if enableClusterDiscovery {
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
		}
		if errors.Is(err, router.ErrConn) {
			log.Warn().Msg("Failed to authenticate. Retrying...")
			time.Sleep(authCheckPeriod)
		} else {
			log.Panic().Msgf("Fatal: %v", err)
		}
	}
	for {
		if enableClusterDiscovery {
			k8sClusterID, _, _, _, _ := dfUtils.GetKubernetesDetails()
			err = consoleClient.StartControlsWatching(k8sClusterID, true, Version)
			log.Info().Msgf("cluster agent mode: %s", k8sClusterID)
		} else {
			err = consoleClient.StartControlsWatching(hostname, false, Version)
			log.Info().Msgf("regular agent mode: %s", hostname)
		}
		if err == nil {
			break
		}
		log.Error().Msgf("Failed to get init controls %v. Retrying...\n", err)
		time.Sleep(authCheckPeriod)
	}

	log.Info().Msg("Everything is up")
	<-ctx.Done()
	log.Info().Msgf("Signal received, wrapping up: %v", ctx.Err())
	cgroups.UnloadAll()
}

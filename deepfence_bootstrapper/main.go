package main

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/cgroups"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/config"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/controls"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/router"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/server"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	dfUtils "github.com/deepfence/df-utils"
)

var authCheckPeriod = time.Second * 10

//go:embed assets/config.ini
var configFile []byte

//go:embed assets/config-cluster.ini
var configClusterFile []byte

//go:embed assets/config-cloud.ini
var configCloudFile []byte

var nodeMode string

var binaryOnly bool

var enableDebug bool

var hostname string

var Version string

func init() {
	var err error
	if os.Getenv("DF_ENABLE_CLUSTER_DISCOVERY") != "" {
		nodeMode = ctl.K8S
	} else if os.Getenv("DF_ENABLE_CLOUD_NODE") != "" {
		nodeMode = ctl.CLOUD_AGENT
	} else {
		nodeMode = ctl.HOST
	}
	binaryOnly = os.Getenv("DF_SERVERLESS") != ""
	if nodeMode == ctl.CLOUD_AGENT {
		hostname = fmt.Sprintf("cloud-node-%s-%s", os.Getenv("CLOUD_PROVIDER"), os.Getenv("CLOUD_ACCOUNT_ID"))
	} else {
		if hostname = os.Getenv("SCOPE_HOSTNAME"); hostname == "" {
			hostname, err = os.Hostname()
			if err != nil {
				hostname = "(unknown)"
			}
		}
	}
	err = os.Setenv("DF_HOST_ID", hostname)
	if err != nil {
		log.Error().Msgf("Failed to set DF_HOST_ID: %v", err)
	}

	verbosity := "info"
	enableDebug = os.Getenv("DF_ENABLE_DEBUG") != ""
	if enableDebug {
		verbosity = "debug"
	}
	err = log.Initialize(verbosity)
	if err != nil {
		fmt.Println("Error in log.Initialize:", err)
	}
}

func main() {
	log.Info().Msgf("Starting bootstrapper, version: %s", Version)

	var err error
	var cfg config.Config
	switch nodeMode {
	case ctl.K8S:
		cfg, err = config.NewIniConfig(configClusterFile)
	case ctl.CLOUD_AGENT:
		cfg, err = config.NewIniConfig(configCloudFile)
	case ctl.HOST:
		cfg, err = config.NewIniConfig(configFile)
	}

	if err != nil {
		log.Fatal().Msgf("%v", err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	err = server.StartRPCServer(ctx, "/tmp/deepfence_boot.sock")
	if err != nil {
		log.Panic().Msgf("%v", err)
	}

	for _, entry := range cfg.Cgroups {
		err := cgroups.LoadCgroup(entry.Name, int64(entry.MaxCPU), int64(entry.MaxMem))
		if err != nil {
			log.Error().Err(err).Str("entry_name", entry.Name).Msg("Error on cgroup")
			if errors.Is(err, cgroups.ErrFailCreate) {
				panic(cgroups.ErrFailCreate)
			}
		}
	}

	autostart := []string{}
	for _, entry := range cfg.Processes {
		supervisor.LoadProcess(entry.Name, entry.Path, entry.Command,
			entry.Env, entry.Autorestart, entry.Cgroup)
		if entry.Autorestart {
			autostart = append(autostart, entry.Name)
		}
	}

	//Start the plugin processes
	startedProcesses := []string{}
	failedProcess := []string{}
	for _, name := range autostart {
		log.Info().Msgf("Starting process: %s", name)
		err := supervisor.StartProcess(name)
		if err != nil {
			log.Error().Msgf("Autostart for %v had issue: %v", name, err)
			failedProcess = append(failedProcess, name)
		} else {
			startedProcesses = append(startedProcesses, name)
		}
	}
	log.Info().Msgf("Started processes:%s", strings.Join(startedProcesses, ","))
	log.Info().Msgf("Failed processes:%s", strings.Join(failedProcess, ","))

	//Setup the controls for respective agent mode
	switch nodeMode {
	case ctl.K8S:
		k8sClusterID, k8sClusterName, _, _, _ := dfUtils.GetKubernetesDetails()
		controls.SetClusterAgentControls(k8sClusterName)
		hostname = k8sClusterID
		log.Info().Msgf("cluster agent mode: %s", hostname)
	case ctl.CLOUD_AGENT:
		controls.SetCloudScannerControls()
		time.Sleep(1 * time.Minute)
	case ctl.HOST:
		log.Info().Msgf("regular agent mode: %s", hostname)
		controls.SetAgentControls()
	}

	//Initiate the console api client
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
			supervisor.StopAllProcesses()
			log.Panic().Msgf("Fatal: %v", err)
		}
	}

	//Start the controls watching.....
	for {
		err = consoleClient.StartControlsWatching(hostname, nodeMode == ctl.K8S, Version, nodeMode)
		if err == nil {
			log.Info().Msgf("Controls watching started, node type: %s", nodeMode)
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

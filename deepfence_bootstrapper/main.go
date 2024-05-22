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

var enableClusterDiscovery bool

var enableCloudNode bool

var binaryOnly bool

var enableDebug bool

var hostname string

var Version string

func init() {
	var err error
	enableClusterDiscovery = os.Getenv("DF_ENABLE_CLUSTER_DISCOVERY") != ""
	enableCloudNode = os.Getenv("DF_ENABLE_CLOUD_NODE") != ""
	binaryOnly = os.Getenv("DF_SERVERLESS") != ""
	if hostname = os.Getenv("SCOPE_HOSTNAME"); hostname == "" {
		hostname, err = os.Hostname()
		if err != nil {
			hostname = "(unknown)"
		}
	}

	if enableCloudNode {
		hostname = "cloud-agent-" + hostname
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

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	var err error
	var cfg config.Config
	var nodeType string
	if enableClusterDiscovery {
		nodeType = ctl.K8S
		cfg, err = config.NewIniConfig(configClusterFile)
	} else if enableCloudNode {
		nodeType = ctl.CLOUD_AGENT
		cfg, err = config.NewIniConfig(configCloudFile)
	} else {
		nodeType = ctl.HOST
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
	if enableClusterDiscovery {
		k8sClusterID, k8sClusterName, _, _, _ := dfUtils.GetKubernetesDetails()
		controls.SetClusterAgentControls(k8sClusterName)
		hostname = k8sClusterID
		log.Info().Msgf("cluster agent mode: %s", hostname)
	} else if enableCloudNode {
		controls.SetCloudScannerControls()
		time.Sleep(1 * time.Minute)
	} else {
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

	//If cloud agent, Get the node id from the cloudscanner
	cloudNodeID := ""
	if enableCloudNode {
		for i := 0; i < 10; i++ {
			log.Info().Msgf("Getting the GetCloudNodeID")
			cloudNodeID, err = router.GetCloudNodeID()
			if err != nil {
				log.Error().Msgf("Error getting CloudNode ID, RetryCount: %d, error: %v", i, err)
			} else if len(cloudNodeID) == 0 {
				err = fmt.Errorf("Empty CloudNode ID received")
				log.Error().Msgf("Error: %s, RetryCount: %d", err.Error(), i)
			} else {
				err = nil
				hostname = cloudNodeID
				log.Info().Msgf("Cloud mode, setting hostname as: %s", cloudNodeID)
				break
			}
			time.Sleep(10 * time.Second)
		}
		if err != nil {
			//Fatal Failed to get the CloudNodeID
			supervisor.StopAllProcesses()
			log.Fatal().Msgf("Failed to get CloudNode, error: %s", err.Error())
		}
		log.Info().Msgf("cloud agent mode: %s", hostname)
	}

	//Start the controls watching.....
	for {
		err = consoleClient.StartControlsWatching(hostname, enableClusterDiscovery, Version, nodeType)
		if err == nil {
			log.Info().Msgf("Controls watching started, node type: %s", nodeType)
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

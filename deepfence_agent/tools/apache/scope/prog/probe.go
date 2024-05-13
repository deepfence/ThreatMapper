package main

import (
	"errors"
	"math/rand"
	_ "net/http/pprof"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/weaveworks/scope/probe/common"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	dfUtils "github.com/deepfence/df-utils"
	docker_client "github.com/fsouza/go-dockerclient"
	"github.com/weaveworks/common/tracing"
	"github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/probe"
	"github.com/weaveworks/scope/probe/appclient"
	"github.com/weaveworks/scope/probe/cri"
	"github.com/weaveworks/scope/probe/docker"
	"github.com/weaveworks/scope/probe/endpoint"
	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/probe/kubernetes"
	"github.com/weaveworks/scope/probe/podman"
	"github.com/weaveworks/scope/probe/process"
	"github.com/weaveworks/scope/report"
)

const (
	versionCheckPeriod = 6 * time.Hour

	kubernetesRoleHost    = "host"
	kubernetesRoleCluster = "cluster"

	authCheckPeriod = time.Second * 10
)

func checkFlagsRequiringRoot(flags probeFlags) {
	if os.Getegid() != 0 {
		if flags.spyProcs {
			log.Warn().Msg("--probe.proc.spy=true, but that requires root to find everything")
		}

		if flags.trackProcDeploads {
			log.Warn().Msg("--probe.proc.track-deploads=true, but that requires root to find everything")
		}
	}
}

// Main runs the probe
func probeMain(flags probeFlags) {
	setLogLevel(flags.logLevel)

	if flags.basicAuth {
		log.Info().Msgf("Basic authentication enabled")
	} else {
		log.Info().Msgf("Basic authentication disabled")
	}

	traceCloser, err := tracing.NewFromEnv("deepfence-discovery")
	if err != nil {
		log.Info().Msgf("Tracing not initialized: %s", err)
	} else {
		defer traceCloser.Close()
	}

	logCensoredArgs()
	defer log.Info().Msg("probe exiting")

	switch flags.kubernetesRole {
	case "": // nothing special
	case kubernetesRoleHost:
		flags.kubernetesEnabled = true
	case kubernetesRoleCluster:
		flags.kubernetesEnabled = true
		flags.spyProcs = false
		flags.procEnabled = false
		flags.useConntrack = false
		flags.useEbpfConn = false
	default:
		log.Warn().Msgf("unrecognized --probe.kubernetes.role: %s", flags.kubernetesRole)
	}

	checkFlagsRequiringRoot(flags)

	var (
		probeID  = strconv.FormatInt(rand.Int63(), 16)
		hostName = hostname.Get()
	)
	log.Info().Msgf("probe starting, version %s, ID %s", version, probeID)

	if flags.kubernetesEnabled && os.Getenv("KUBERNETES_SERVICE_HOST") == "" {
		// If KUBERNETES_SERVICE_HOST env is not there, get it from kube-proxy container in this host
		// KUBERNETES_PORT_443_TCP_PROTO="tcp"
		// KUBERNETES_PORT_443_TCP_PORT="443"
		// KUBERNETES_PORT_443_TCP_ADDR="10.96.0.1"
		// KUBERNETES_SERVICE_HOST="10.96.0.1"
		// KUBERNETES_SERVICE_PORT="443"
		// KUBERNETES_SERVICE_PORT_HTTPS="443"
		// KUBERNETES_PORT=tcp://10.96.0.1:443
		// KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443
		client, err := docker_client.NewClientFromEnv()
		if err != nil {
			log.Error().Msg(err.Error())
			goto endNestedIf
		}
		containerFilters := make(map[string][]string, 2)
		containerFilters["label"] = []string{"io.kubernetes.container.name=kube-proxy"}
		containers, err := client.ListContainers(docker_client.ListContainersOptions{Filters: containerFilters})
		if err != nil {
			log.Error().Msg(err.Error())
			goto endNestedIf
		}
		for _, container := range containers {
			containerDetails, err := client.InspectContainerWithOptions(docker_client.InspectContainerOptions{
				ID: container.ID,
			})
			if err != nil {
				log.Error().Msg(err.Error())
				break
			}
			for _, env := range containerDetails.Config.Env {
				if strings.HasPrefix(env, "KUBERNETES_SERVICE_HOST=") {
					os.Setenv("KUBERNETES_SERVICE_HOST", strings.Split(env, "=")[1])
				}
				if strings.HasPrefix(env, "KUBERNETES_SERVICE_PORT=") {
					os.Setenv("KUBERNETES_SERVICE_PORT", strings.Split(env, "=")[1])
				}
			}
		}
	}
endNestedIf:
	// https://groups.google.com/d/msg/kubernetes-sig-architecture/mVGobfD4TpY/Pa7n5t2qAAAJ
	k8sClusterId, k8sClusterName, k8sVersion, nodeRole, _ := dfUtils.GetKubernetesDetails()
	if flags.kubernetesEnabled && flags.kubernetesRole != kubernetesRoleHost {
		if k8sClusterId == "" {
			log.Error().Msg("could not get kubernetes_cluster_id, retrying...")
			time.Sleep(30 * time.Second)
			os.Exit(1)
		}
	}
	err = os.Setenv(report.KubernetesClusterId, k8sClusterId)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	err = os.Setenv(report.KubernetesClusterName, k8sClusterName)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	// Set DF_KUBERNETES_VERSION, DF_KUBERNETES_NODE_ROLE
	err = os.Setenv("DF_KUBERNETES_VERSION", k8sVersion)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = os.Setenv("DF_KUBERNETES_NODE_ROLE", nodeRole)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	var clients interface {
		probe.ReportPublisher
	}
	var multiClients *appclient.OpenapiClient
	for {
		multiClients, err = appclient.NewOpenapiClient()
		if err == nil {
			break
		} else if errors.Is(err, common.ConnError) {
			log.Warn().Msg("Failed to authenticate. Retrying...")
			time.Sleep(authCheckPeriod)
		} else {
			log.Fatal().Msgf("Fatal: %v", err)
		}
	}
	clients = multiClients

	p := probe.New(flags.spyInterval, flags.publishInterval, clients, flags.ticksPerFullReport, flags.noControls)
	if os.Getenv("DF_USE_DUMMY_SCOPE") == "" {
		p.AddTagger(probe.NewTopologyTagger())
		var processCache *process.CachingWalker

		if flags.kubernetesRole != kubernetesRoleCluster {
			hostReporter, cloudProvider, cloudRegion := host.NewReporter(hostName, probeID, version)
			defer hostReporter.Stop()
			p.AddReporter(hostReporter)
			p.AddTagger(host.NewTagger(hostName, cloudProvider, cloudRegion))
			log.Debug().Msg("Attached host reporter")

			if flags.procEnabled {
				processCache = process.NewCachingWalker(process.NewWalker(flags.procRoot, false))
				p.AddTicker(processCache)
				p.AddReporter(process.NewReporter(processCache, hostName, process.GetDeltaTotalJiffies, flags.noCommandLineArguments, flags.trackProcDeploads))
				log.Debug().Msg("Attached proc reporter")
			}

			if flags.endpointEnabled {
				dnsSnooper, err := endpoint.NewDNSSnooper()
				if err != nil {
					log.Error().Msgf("Failed to start DNS snooper: nodes for external services will be less accurate: %s", err)
				} else {
					defer dnsSnooper.Stop()
				}

				endpointReporter := endpoint.NewReporter(endpoint.ReporterConfig{
					HostName:     hostName,
					SpyProcs:     flags.spyProcs,
					UseConntrack: flags.useConntrack,
					WalkProc:     flags.procEnabled,
					UseEbpfConn:  flags.useEbpfConn,
					ProcRoot:     flags.procRoot,
					BufferSize:   flags.conntrackBufferSize,
					ProcessCache: processCache,
					DNSSnooper:   dnsSnooper,
				})
				defer endpointReporter.Stop()
				p.AddReporter(endpointReporter)
				log.Debug().Msg("Attached endpoint reporter")
			}

		}

		if flags.dockerEnabled {
			// Don't add the bridge in Kubernetes since container IPs are global and
			// shouldn't be scoped
			if flags.dockerBridge != "" && !flags.kubernetesEnabled {
				if err := report.AddLocalBridge(flags.dockerBridge); err != nil {
					log.Error().Msgf("Docker: problem with bridge %s: %v", flags.dockerBridge, err)
				}
			}
			options := docker.RegistryOptions{
				Interval:               flags.dockerInterval,
				CollectStats:           true,
				HostID:                 hostName,
				DockerEndpoint:         os.Getenv("DOCKER_SOCKET_PATH"),
				NoCommandLineArguments: flags.noCommandLineArguments,
				NoEnvironmentVariables: flags.noEnvironmentVariables,
			}
			if registry, err := docker.NewRegistry(options); err == nil {
				defer registry.Stop()
				if flags.procEnabled {
					p.AddTagger(docker.NewTagger(registry, hostName, processCache))
				}
				p.AddReporter(docker.NewReporter(registry, hostName, probeID, p))
				log.Debug().Msg("Attached docker report")
			} else {
				log.Error().Msgf("Docker: failed to start registry: %v", err)
			}
		}

		if flags.criEnabled {
			runtimeClient, imageClient, err := cri.NewCRIClient(flags.criEndpoint)
			if err != nil {
				log.Error().Msgf("CRI: failed to start registry: %v", err)
			} else {
				p.AddReporter(cri.NewReporter(runtimeClient, hostName, imageClient))
				log.Debug().Msg("Attached cri report")
			}
		}

		if flags.podmanEnabled {
			podmanClient, err := podman.NewPodmanClient(flags.podmanEndpoint)
			if err != nil {
				log.Error().Msgf("CRI: failed to start registry: %v", err)
			} else {
				p.AddReporter(podman.NewReporter(podmanClient, hostName))
				log.Debug().Msg("Attached cri report")
			}
		}

		if flags.kubernetesEnabled && flags.kubernetesRole != kubernetesRoleHost {
			if client, err := kubernetes.NewClient(flags.kubernetesClientConfig); err == nil {
				defer client.Stop()
				reporter := kubernetes.NewReporter(client, probeID, hostName, p, flags.kubernetesNodeName)
				defer reporter.Stop()
				p.AddReporter(reporter)
				log.Debug().Msg("Attached k8s report")
				go client.InitCNIPlugin()
				if flags.kubernetesRole != kubernetesRoleCluster && flags.kubernetesNodeName == "" {
					log.Warn().Msg("No value for --probe.kubernetes.node-name, reporting all pods from every probe (which may impact performance).")
				}
			} else {
				log.Error().Msgf("Kubernetes: failed to start client: %v", err)
				log.Error().Msgf("Kubernetes: make sure to run Scope inside a POD with a service account or provide valid probe.kubernetes.* flags")
			}
		}

		if flags.kubernetesEnabled {
			p.AddTagger(&kubernetes.Tagger{})
			log.Debug().Msg("Attached k8s tagger")
		}

	}

	p.Start()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGQUIT, syscall.SIGTERM)
	defer signal.Stop(sigs)
	for {
		select {
		case sig := <-sigs:
			switch sig {
			case syscall.SIGINT, syscall.SIGTERM:
				log.Info().Msg("=== received SIGINT/SIGTERM ===\n*** exiting")
				return
			case syscall.SIGQUIT:
				buf := make([]byte, 1<<20)
				stacklen := runtime.Stack(buf, true)
				log.Info().Msgf("=== received SIGQUIT ===\n*** goroutine dump...\n%s\n*** end", buf[:stacklen])
				return
			}
		}
	}
}

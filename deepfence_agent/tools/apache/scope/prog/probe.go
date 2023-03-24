package main

import (
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	_ "net/http/pprof"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/armon/go-metrics"
	"github.com/weaveworks/scope/probe/common"

	metrics_prom "github.com/armon/go-metrics/prometheus"
	linuxScanner "github.com/deepfence/compliance/scanner"
	linuxScannerUtil "github.com/deepfence/compliance/util"
	dfUtils "github.com/deepfence/df-utils"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	docker_client "github.com/fsouza/go-dockerclient"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"
	"github.com/weaveworks/common/logging"
	"github.com/weaveworks/common/signals"
	"github.com/weaveworks/common/tracing"
	"github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/probe"
	"github.com/weaveworks/scope/probe/appclient"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/probe/cri"
	"github.com/weaveworks/scope/probe/docker"
	"github.com/weaveworks/scope/probe/endpoint"
	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/probe/kubernetes"
	"github.com/weaveworks/scope/probe/process"
	"github.com/weaveworks/scope/report"
)

const (
	versionCheckPeriod = 6 * time.Hour

	kubernetesRoleHost    = "host"
	kubernetesRoleCluster = "cluster"

	authCheckPeriod = time.Second * 10
)

func maybeExportProfileData(flags probeFlags) {
	if flags.httpListen != "" {
		go func() {
			http.Handle("/metrics", promhttp.Handler())
			if os.Getenv("DEBUG") == "true" {
				log.Infof("Profiling data being exported to %s", flags.httpListen)
				log.Infof("go tool pprof http://%s/debug/pprof/{profile,heap,block}", flags.httpListen)
				log.Infof("Profiling endpoint %s terminated: %v", flags.httpListen, http.ListenAndServe(flags.httpListen, nil))
			}
		}()
	}
}

func checkFlagsRequiringRoot(flags probeFlags) {
	if os.Getegid() != 0 {
		if flags.spyProcs {
			log.Warn("--probe.proc.spy=true, but that requires root to find everything")
		}

		if flags.trackProcDeploads {
			log.Warn("--probe.proc.track-deploads=true, but that requires root to find everything")
		}
	}
}

func setClusterAgentControls(k8sClusterName string) {
	err := controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			return kubernetes.StartComplianceScan(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	_, err = exec.Command("/bin/sh", "/home/deepfence/token.sh").CombinedOutput()
	if err != nil {
		log.Errorf("generate token: %v", err)
	} else {
		log.Debug("Token generated successfully")
	}
	err = controls.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info("Start Cluster Agent Upgrade")
			appclient.SetUpgrade()
			return kubernetes.StartClusterAgentUpgrade(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Cluster Agent Diagnostic Logs")
			return controls.SendAgentDiagnosticLogs(req,
				[]string{"/var/log/compliance/compliance-status"},
				[]string{})
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
}

func setAgentControls() {
	err := controls.RegisterControl(ctl.StartVulnerabilityScan,
		func(req ctl.StartVulnerabilityScanRequest) error {
			return host.StartVulnerabilityScan(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartSecretScan,
		func(req ctl.StartSecretScanRequest) error {
			return host.StartSecretsScan(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			scanner, err := linuxScanner.NewComplianceScanner(
				linuxScannerUtil.Config{
					ComplianceCheckType:       req.BinArgs["benchmark_types"],
					ScanId:                    req.BinArgs["scan_id"],
					NodeId:                    req.NodeId,
					NodeName:                  req.NodeId,
					ComplianceResultsFilePath: fmt.Sprintf("/var/log/fenced/compliance/%s.log", req.BinArgs["scan_id"]),
					ComplianceStatusFilePath:  "/var/log/fenced/compliance-scan-logs/status.log",
				})
			if err != nil {
				return err
			}
			err = scanner.RunComplianceScan()
			if err != nil {
				log.Errorf("Error from scan: %+v", err)
				return err
			}
			return nil
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartMalwareScan,
		func(req ctl.StartMalwareScanRequest) error {
			return host.StartMalwareScan(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info("Start Agent Upgrade")
			appclient.SetUpgrade()
			return host.StartAgentUpgrade(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Agent Diagnostic Logs")
			return controls.SendAgentDiagnosticLogs(req,
				[]string{"/var/log/supervisor", "/var/log/fenced"},
				[]string{"/var/log/fenced/compliance/", "/var/log/fenced/malware-scan/", "/var/log/fenced/secret-scan/"})
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
}

// Main runs the probe
func probeMain(flags probeFlags, targets []appclient.Target) {
	setLogLevel(flags.logLevel)
	setLogFormatter(flags.logPrefix)

	if flags.basicAuth {
		log.Infof("Basic authentication enabled")
	} else {
		log.Infof("Basic authentication disabled")
	}

	traceCloser, err := tracing.NewFromEnv("deepfence-discovery")
	if err != nil {
		log.Infof("Tracing not initialized: %s", err)
	} else {
		defer traceCloser.Close()
	}

	cfg := &metrics.Config{
		ServiceName:      "deepfence-discovery",
		TimerGranularity: time.Second,
		FilterDefault:    true, // Don't filter metrics by default
	}
	if flags.httpListen == "" {
		// Setup in memory metrics sink
		inm := metrics.NewInmemSink(time.Minute, 2*time.Minute)
		sig := metrics.DefaultInmemSignal(inm)
		defer sig.Stop()
		metrics.NewGlobal(cfg, inm)
	} else {
		sink, err := metrics_prom.NewPrometheusSink()
		if err != nil {
			log.Fatalf("Failed to create Prometheus metrics sink: %v", err)
		}
		metrics.NewGlobal(cfg, sink)
	}
	logCensoredArgs()
	defer log.Info("probe exiting")

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
		log.Warnf("unrecognized --probe.kubernetes.role: %s", flags.kubernetesRole)
	}

	checkFlagsRequiringRoot(flags)

	rand.Seed(time.Now().UnixNano())
	var (
		probeID  = strconv.FormatInt(rand.Int63(), 16)
		hostName = hostname.Get()
		hostID   = hostName // TODO(pb): we should sanitize the hostname
	)
	log.Infof("probe starting, version %s, ID %s", version, probeID)

	if flags.kubernetesEnabled {
		// If KUBERNETES_SERVICE_HOST env is not there, get it from kube-proxy container in this host
		// KUBERNETES_PORT_443_TCP_PROTO="tcp"
		// KUBERNETES_PORT_443_TCP_PORT="443"
		// KUBERNETES_PORT_443_TCP_ADDR="10.96.0.1"
		// KUBERNETES_SERVICE_HOST="10.96.0.1"
		// KUBERNETES_SERVICE_PORT="443"
		// KUBERNETES_SERVICE_PORT_HTTPS="443"
		// KUBERNETES_PORT=tcp://10.96.0.1:443
		// KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443
		if os.Getenv("KUBERNETES_SERVICE_HOST") == "" {
			client, err := docker_client.NewClientFromEnv()
			if err == nil {
				containerFilters := make(map[string][]string, 2)
				containerFilters["label"] = []string{"io.kubernetes.container.name=kube-proxy"}
				containers, err := client.ListContainers(docker_client.ListContainersOptions{Filters: containerFilters})
				if err == nil {
					for _, container := range containers {
						containerDetails, err := client.InspectContainer(container.ID)
						if err == nil {
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
				}
			}
		}
	}

	// https://groups.google.com/d/msg/kubernetes-sig-architecture/mVGobfD4TpY/Pa7n5t2qAAAJ
	k8sClusterId, k8sClusterName, k8sVersion, nodeRole, _ := dfUtils.GetKubernetesDetails()
	err = os.Setenv(report.KubernetesClusterId, k8sClusterId)
	if err != nil {
		log.Error(err.Error())
	}

	if flags.kubernetesRole == kubernetesRoleCluster {
		setClusterAgentControls(k8sClusterName)
	} else {
		setAgentControls()
	}

	err = os.Setenv(report.KubernetesClusterName, k8sClusterName)
	if err != nil {
		log.Error(err.Error())
	}
	// Set DF_KUBERNETES_VERSION, DF_KUBERNETES_NODE_ROLE
	err = os.Setenv("DF_KUBERNETES_VERSION", k8sVersion)
	if err != nil {
		log.Error(err.Error())
	}
	err = os.Setenv("DF_KUBERNETES_NODE_ROLE", nodeRole)
	if err != nil {
		log.Error(err.Error())
	}

	var clients interface {
		probe.ReportPublisher
	}
	if flags.printOnStdout {
		if len(targets) > 0 {
			log.Warnf("Dumping to stdout only: targets %v will be ignored", targets)
		}
		log.Fatal("Print on Stdout not supported")
	} else {
		var multiClients *appclient.OpenapiClient
		for {
			multiClients, err = appclient.NewOpenapiClient()
			if err == nil {
				break
			} else if errors.Is(err, common.ConnError) {
				log.Warnln("Failed to authenticate. Retrying...")
				time.Sleep(authCheckPeriod)
			} else {
				log.Fatalf("Fatal: %v", err)
			}
		}
		for {
			if flags.kubernetesRole == kubernetesRoleCluster {
				err = multiClients.StartControlsWatching(k8sClusterId, true)
			} else {
				err = multiClients.StartControlsWatching(hostname.Get(), false)
			}
			if err == nil {
				break
			}
			log.Errorf("Failed to get init controls %v. Retrying...\n", err)
			time.Sleep(authCheckPeriod)
		}
		defer multiClients.Stop()

		//dnsLookupFn := net.LookupIP
		//if flags.resolver != "" {
		//	dnsLookupFn = appclient.LookupUsing(flags.resolver)
		//}
		//resolver, err := appclient.NewResolver(appclient.ResolverConfig{
		//	Targets:       targets,
		//	ResolveDomain: flags.resolveDomain,
		//	Lookup:        dnsLookupFn,
		//	Set:           multiClients.Set,
		//})
		//if err != nil {
		//	log.Fatalf("Failed to create resolver: %v", err)
		//	return
		//}
		//defer resolver.Stop()

		clients = multiClients
	}

	p := probe.New(flags.spyInterval, flags.publishInterval, clients, flags.ticksPerFullReport, flags.noControls)
	p.AddTagger(probe.NewTopologyTagger())
	var processCache *process.CachingWalker

	if flags.kubernetesRole != kubernetesRoleCluster {
		hostReporter, cloudProvider, cloudRegion := host.NewReporter(hostID, hostName, probeID, version)
		defer hostReporter.Stop()
		p.AddReporter(hostReporter)
		p.AddTagger(host.NewTagger(hostID, cloudProvider, cloudRegion))

		if flags.procEnabled {
			processCache = process.NewCachingWalker(process.NewWalker(flags.procRoot, false))
			p.AddTicker(processCache)
			p.AddReporter(process.NewReporter(processCache, hostID, process.GetDeltaTotalJiffies, flags.noCommandLineArguments, flags.trackProcDeploads))
		}

		if flags.endpointEnabled {
			dnsSnooper, err := endpoint.NewDNSSnooper()
			if err != nil {
				log.Errorf("Failed to start DNS snooper: nodes for external services will be less accurate: %s", err)
			} else {
				defer dnsSnooper.Stop()
			}

			endpointReporter := endpoint.NewReporter(endpoint.ReporterConfig{
				HostID:       hostID,
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
		}

	}

	if flags.dockerEnabled {
		// Don't add the bridge in Kubernetes since container IPs are global and
		// shouldn't be scoped
		if flags.dockerBridge != "" && !flags.kubernetesEnabled {
			if err := report.AddLocalBridge(flags.dockerBridge); err != nil {
				log.Errorf("Docker: problem with bridge %s: %v", flags.dockerBridge, err)
			}
		}
		options := docker.RegistryOptions{
			Interval:               flags.dockerInterval,
			CollectStats:           true,
			HostID:                 hostID,
			DockerEndpoint:         os.Getenv("DOCKER_SOCKET_PATH"),
			NoCommandLineArguments: flags.noCommandLineArguments,
			NoEnvironmentVariables: flags.noEnvironmentVariables,
		}
		if registry, err := docker.NewRegistry(options); err == nil {
			defer registry.Stop()
			if flags.procEnabled {
				p.AddTagger(docker.NewTagger(registry, hostID, processCache))
			}
			p.AddReporter(docker.NewReporter(registry, hostID, probeID, p))
		} else {
			log.Errorf("Docker: failed to start registry: %v", err)
		}
	}

	if flags.criEnabled {
		runtimeClient, imageClient, err := cri.NewCRIClient(flags.criEndpoint)
		if err != nil {
			log.Errorf("CRI: failed to start registry: %v", err)
		} else {
			p.AddReporter(cri.NewReporter(runtimeClient, hostID, imageClient))
		}
	}

	if flags.kubernetesEnabled && flags.kubernetesRole != kubernetesRoleHost {
		if client, err := kubernetes.NewClient(flags.kubernetesClientConfig); err == nil {
			defer client.Stop()
			reporter := kubernetes.NewReporter(client, probeID, hostID, p, flags.kubernetesNodeName)
			defer reporter.Stop()
			p.AddReporter(reporter)
			go client.InitCNIPlugin()
			if flags.kubernetesRole != kubernetesRoleCluster && flags.kubernetesNodeName == "" {
				log.Warnf("No value for --probe.kubernetes.node-name, reporting all pods from every probe (which may impact performance).")
			}
		} else {
			log.Errorf("Kubernetes: failed to start client: %v", err)
			log.Errorf("Kubernetes: make sure to run Scope inside a POD with a service account or provide valid probe.kubernetes.* flags")
		}
	}

	if flags.kubernetesEnabled {
		p.AddTagger(&kubernetes.Tagger{})
	}

	maybeExportProfileData(flags)

	p.Start()
	signals.SignalHandlerLoop(
		logging.Logrus(log.StandardLogger()),
		p,
	)
}

package main

import (
	"flag"
	"fmt"
	"net"
	"os"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/probe/kubernetes"
)

var (
	// set at build time
	version = "dev"
	// tokens to be elided when logging
	serviceTokenFlag       = "service-token"
	probeTokenFlag         = "probe.token"
	kubernetesPasswordFlag = "probe.kubernetes.password"
	kubernetesTokenFlag    = "probe.kubernetes.token"
	sensitiveFlags         = []string{
		serviceTokenFlag,
		probeTokenFlag,
		kubernetesPasswordFlag,
		kubernetesTokenFlag,
	}
	elideURLCredentials = regexp.MustCompile(`//.+@`)
)

func setLogLevel(levelname string) {
	err := log.Initialize(levelname)
	if err != nil {
		log.Error().Msgf("Initializing with %s failed with: %v", levelname, err)
	}
}

type flags struct {
	probe probeFlags

	mode      string
	debug     bool
	dryRun    bool
	probeOnly bool
}

type probeFlags struct {
	basicAuth              bool
	username               string
	password               string
	token                  string
	httpListen             string
	publishInterval        time.Duration
	ticksPerFullReport     int
	spyInterval            time.Duration
	insecure               bool
	logPrefix              string
	logLevel               string
	resolver               string
	resolveDomain          bool
	noApp                  bool
	noControls             bool
	noCommandLineArguments bool
	noEnvironmentVariables bool
	endpointEnabled        bool // Enable endpoint report
	useConntrack           bool // Use conntrack for endpoint topo
	conntrackBufferSize    int  // Sie of kernel buffer for conntrack

	spyProcs          bool // Associate endpoints with processes (must be root)
	procEnabled       bool // Produce process topology & process nodes in endpoint
	useEbpfConn       bool // Enable connection tracking with eBPF
	procRoot          string
	trackProcDeploads bool // Track process dependency loading at runtime

	dockerEnabled  bool
	dockerInterval time.Duration
	dockerBridge   string

	criEnabled  bool
	criEndpoint string

	podmanEnabled  bool
	podmanEndpoint string

	kubernetesEnabled      bool
	kubernetesRole         string
	kubernetesNodeName     string
	kubernetesClientConfig kubernetes.ClientConfig
}

func getCensoredArgs() string {
	var prettyPrintedArgs string
	// We show the flags followed by the args. This may change the original
	// ordering. However the flag parser doesn't keep positioning
	// information, not allowing for a more accurate reconstruction.
	flag.Visit(func(f *flag.Flag) {
		value := f.Value.String()
		// omit sensitive information
		for _, sensitiveFlag := range sensitiveFlags {
			if f.Name == sensitiveFlag {
				value = "<elided>"
				break
			}
		}
		prettyPrintedArgs += fmt.Sprintf(" --%s=%s", f.Name, value)
	})
	for _, arg := range flag.Args() {
		prettyPrintedArgs += " " + elideURLCredentials.ReplaceAllString(arg, "//<elided>@")
	}
	return prettyPrintedArgs
}

func logCensoredArgs() {
	log.Info().Msgf("command line args:%s", getCensoredArgs())
}

func makeBaseCheckpointFlags() map[string]string {
	release, _, err := host.GetKernelReleaseAndVersion()
	if err != nil {
		release = "unknown"
	}
	return map[string]string{
		// Inconsistent key (using a dash) to match Weave Net
		"kernel-version": release,
		"os":             runtime.GOOS,
	}
}

func setupFlags(flags *flags) {
	// Flags that apply to both probe and app
	flag.StringVar(&flags.mode, "mode", "help", "For internal use.")
	flag.BoolVar(&flags.debug, "debug", false, "Force debug logging.")
	flag.BoolVar(&flags.dryRun, "dry-run", false, "Don't start scope, just parse the arguments.  For internal use only.")

	// We need to know how to parse them, but they are mainly interpreted by the entrypoint script.
	// They are also here so they are included in usage, and the probe uses them to decide if to
	// publish to localhost.
	flag.BoolVar(&flags.probeOnly, "probe-only", true, "Only run the probe.")
	flag.Bool("no-probe", false, "Don't run the probe.")
	flag.Bool("app-only", false, "Only run the app.")

	// Probe flags
	flag.BoolVar(&flags.probe.basicAuth, "probe.basicAuth", false, "Use basic authentication to authenticate with app")
	flag.StringVar(&flags.probe.username, "probe.basicAuth.username", "", "Username for basic authentication")
	flag.StringVar(&flags.probe.password, "probe.basicAuth.password", "", "Password for basic authentication")
	flag.StringVar(&flags.probe.token, serviceTokenFlag, "", "Token to authenticate with cloud.weave.works")
	flag.StringVar(&flags.probe.token, probeTokenFlag, "", "Token to authenticate with cloud.weave.works")
	flag.StringVar(&flags.probe.httpListen, "probe.http.listen", "", "listen address for HTTP profiling and instrumentation server")
	flag.DurationVar(&flags.probe.publishInterval, "probe.publish.interval", 3*time.Second, "publish (output) interval")
	flag.DurationVar(&flags.probe.spyInterval, "probe.spy.interval", 3*time.Second, "spy (scan) interval")
	flag.IntVar(&flags.probe.ticksPerFullReport, "probe.full-report-every", 1, "publish full report every N times, deltas in between. Make sure N < (app.window / probe.publish.interval)")
	flag.BoolVar(&flags.probe.noControls, "probe.no-controls", false, "Disable controls (e.g. start/stop containers, terminals, logs ...)")
	flag.BoolVar(&flags.probe.noCommandLineArguments, "probe.omit.cmd-args", false, "Disable collection of command-line arguments")
	flag.BoolVar(&flags.probe.noEnvironmentVariables, "probe.omit.env-vars", true, "Disable collection of environment variables")

	flag.BoolVar(&flags.probe.insecure, "probe.insecure", false, "(SSL) explicitly allow \"insecure\" SSL connections and transfers")
	flag.StringVar(&flags.probe.resolver, "probe.resolver", "", "IP address & port of resolver to use.  Default is to use system resolver.")
	flag.BoolVar(&flags.probe.resolveDomain, "probe.resolve-domain", false, "")
	flag.StringVar(&flags.probe.logPrefix, "probe.log.prefix", "<probe>", "prefix for each log line")
	flag.StringVar(&flags.probe.logLevel, "probe.log.level", "info", "logging threshold level: debug|info|warn|error|fatal|panic")

	// Proc & endpoint
	flag.BoolVar(&flags.probe.endpointEnabled, "probe.endpoint.report", true, "enable endpoint report")
	flag.BoolVar(&flags.probe.useConntrack, "probe.conntrack", true, "also use conntrack to track connections")
	flag.IntVar(&flags.probe.conntrackBufferSize, "probe.conntrack.buffersize", 4096*1024, "conntrack buffer size")
	flag.BoolVar(&flags.probe.spyProcs, "probe.proc.spy", true, "associate endpoints with processes (needs root)")
	flag.StringVar(&flags.probe.procRoot, "probe.proc.root", "/proc", "location of the proc filesystem")
	flag.BoolVar(&flags.probe.procEnabled, "probe.processes", true, "produce process topology & include procspied connections")
	flag.BoolVar(&flags.probe.trackProcDeploads, "probe.track.deploads", false, "Enable dependency open runtime tracing")
	flag.BoolVar(&flags.probe.useEbpfConn, "probe.ebpf.connections", true, "enable connection tracking with eBPF")

	// Docker
	flag.BoolVar(&flags.probe.dockerEnabled, "probe.docker", false, "collect Docker-related attributes for processes")
	flag.DurationVar(&flags.probe.dockerInterval, "probe.docker.interval", 10*time.Second, "how often to update Docker attributes")
	flag.StringVar(&flags.probe.dockerBridge, "probe.docker.bridge", "docker0", "the docker bridge name")

	// CRI
	flag.BoolVar(&flags.probe.criEnabled, "probe.cri", false, "collect CRI-related attributes for processes")
	flag.StringVar(&flags.probe.criEndpoint, "probe.cri.endpoint", "unix///var/run/dockershim.sock", "The endpoint to connect to the CRI")

	// Podman
	flag.BoolVar(&flags.probe.podmanEnabled, "probe.podman", false, "collect Podman-related attributes for processes")
	flag.StringVar(&flags.probe.podmanEndpoint, "probe.podman.endpoint", "unix:///run/podman/podman.sock", "The endpoint to connect to the Podman")

	// K8s
	flag.BoolVar(&flags.probe.kubernetesEnabled, "probe.kubernetes", false, "collect kubernetes-related attributes for containers")
	flag.StringVar(&flags.probe.kubernetesRole, "probe.kubernetes.role", "", "host, cluster or blank for everything")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Server, "probe.kubernetes.api", "", "The address and port of the Kubernetes API server (deprecated in favor of equivalent probe.kubernetes.server)")
	flag.StringVar(&flags.probe.kubernetesClientConfig.CertificateAuthority, "probe.kubernetes.certificate-authority", "", "Path to a cert. file for the certificate authority")
	flag.StringVar(&flags.probe.kubernetesClientConfig.ClientCertificate, "probe.kubernetes.client-certificate", "", "Path to a client certificate file for TLS")
	flag.StringVar(&flags.probe.kubernetesClientConfig.ClientKey, "probe.kubernetes.client-key", "", "Path to a client key file for TLS")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Cluster, "probe.kubernetes.cluster", "", "The name of the kubeconfig cluster to use")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Context, "probe.kubernetes.context", "", "The name of the kubeconfig context to use")
	flag.BoolVar(&flags.probe.kubernetesClientConfig.Insecure, "probe.kubernetes.insecure-skip-tls-verify", false, "If true, the server's certificate will not be checked for validity. This will make your HTTPS connections insecure")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Kubeconfig, "probe.kubernetes.kubeconfig", "", "Path to the kubeconfig file to use")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Password, kubernetesPasswordFlag, "", "Password for basic authentication to the API server")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Server, "probe.kubernetes.server", "", "The address and port of the Kubernetes API server")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Token, kubernetesTokenFlag, "", "Bearer token for authentication to the API server")
	flag.StringVar(&flags.probe.kubernetesClientConfig.User, "probe.kubernetes.user", "", "The name of the kubeconfig user to use")
	flag.StringVar(&flags.probe.kubernetesClientConfig.Username, "probe.kubernetes.username", "", "Username for basic authentication to the API server")
	flag.StringVar(&flags.probe.kubernetesNodeName, "probe.kubernetes.node-name", "", "Name of this node, for filtering pods")
}

func main() {
	flags := flags{}
	setupFlags(&flags)
	flag.Parse()

	// Deal with common args
	if flags.debug {
		flags.probe.logLevel = "debug"
	}
	flags.probe.noApp = flags.probeOnly

	if flags.probe.httpListen != "" {
		_, _, err := net.SplitHostPort(flags.probe.httpListen)
		if err != nil {
			log.Fatal().Msgf("Invalid value for -probe.http.address: %v", err)
		}
	}

	// Node name may be set by environment variable, e.g. from the Kubernetes downward API
	if flags.probe.kubernetesNodeName == "" {
		flags.probe.kubernetesNodeName = os.Getenv("KUBERNETES_NODENAME")
	}

	if strings.ToLower(os.Getenv("ENABLE_BASIC_AUTH")) == "true" {
		flags.probe.basicAuth = true
	} else if strings.ToLower(os.Getenv("ENABLE_BASIC_AUTH")) == "false" {
		flags.probe.basicAuth = false
	}

	username := os.Getenv("BASIC_AUTH_USERNAME")
	if username != "" {
		flags.probe.username = username
	}
	password := os.Getenv("BASIC_AUTH_PASSWORD")
	if password != "" {
		flags.probe.password = password
	}

	if flags.dryRun {
		return
	}

	switch flags.mode {
	case "probe":
		probeMain(flags.probe)
	case "version":
		fmt.Println("Weave Scope version", version)
	case "help":
		flag.PrintDefaults()
	default:
		fmt.Printf("command '%s' not recognized", flags.mode)
		os.Exit(1)
	}
}

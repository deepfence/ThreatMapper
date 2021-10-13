package main

import (
	"flag"
	"fmt"
	"github.com/docker/docker/client"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	metricsv "k8s.io/metrics/pkg/client/clientset/versioned"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

var (
	dockerCli              *client.Client
	kubeCli                *kubernetes.Clientset
	kubeConfig             *rest.Config
	kubeMetricsCli         *metricsv.Clientset
	dockerOrchestrator     = "docker"
	kubernetesOrchestrator = "kubernetes"
	orchestrator           string
)

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}

func main() {
	if len(os.Args) > 1 {
		orchestrator = os.Args[1]
	} else {
		orchestrator = dockerOrchestrator
	}

	logger := log.New(os.Stdout, "http: ", log.LstdFlags)
	logger.Println("Server is starting at 8009")

	if orchestrator == dockerOrchestrator {
		var err error
		dockerCli, err = client.NewClientWithOpts(client.WithVersion("1.37"))
		if err != nil {
			time.Sleep(1 * time.Minute)
			panic(err)
		}
		defer dockerCli.Close()
	} else if orchestrator == kubernetesOrchestrator {
		// For production use
		var err error
		kubeConfig, err = rest.InClusterConfig()
		if err != nil {
			fmt.Println(err.Error())
			fmt.Println("Falling back to out of cluster config")
			// Out of cluster configuration for dev use
			var kubeconfig *string
			if home := homeDir(); home != "" {
				kubeconfig = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
			} else {
				kubeconfig = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
			}
			flag.Parse()

			// use the current context in kubeconfig
			kubeConfig, err = clientcmd.BuildConfigFromFlags("", *kubeconfig)
			if err != nil {
				time.Sleep(1 * time.Minute)
				panic(err.Error())
			}
		}
		// creates the clientset
		kubeCli, err = kubernetes.NewForConfig(kubeConfig)
		if err != nil {
			time.Sleep(1 * time.Minute)
			panic(err.Error())
		}
		kubeMetricsCli, err = metricsv.NewForConfig(kubeConfig)
		if err != nil {
			logger.Println("metrics server not set up in kubernetes")
		}
	} else {
		fmt.Println("Unknown argument: " + orchestrator)
	}
	// using standard mux. We can shift to Gorilla mux once more APIs with
	// different HTTP method support is needed
	mux := http.NewServeMux()

	// type diagnosisT implements ServeHTTP method
	diagnosisI := new(diagnosisT)
	mux.Handle("/diagnosis/logs", diagnosisI)
	mux.HandleFunc("/diagnosis/container_state", containerState)
	mux.HandleFunc("/diagnosis/cpu_memory_stats", getCpuMemoryStats)

	server := &http.Server{
		Addr:    ":8009",
		Handler: logging(logger)(mux),
	}
	defer server.Close()
	server.ReadTimeout = 60 * time.Second
	server.WriteTimeout = 60 * time.Second

	log.Fatal(server.ListenAndServe())
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func NewLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func logging(logger *log.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			lrw := NewLoggingResponseWriter(w)
			next.ServeHTTP(w, r)
			if lrw.statusCode != 200 {
				defer func() {
					logger.Println(r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), lrw.statusCode)
				}()
			}
		})
	}
}

// currently not being used since the APIs doesn't support external calls
// func corsHandler(h http.Handler) http.HandlerFunc {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		w.Header().Set("Access-Control-Allow-Origin", "*")
// 		w.Header().Set("Access-Control-Allow-Headers", "X-Requested-With, content-type, Authorization")
// 		if r.Method == "OPTIONS" {
// 			return
// 		}
// 		h.ServeHTTP(w, r)
// 	}
// }

// currently not being used since all containers are not attached to a single
//  docker network and can only talk to each other
//func internalServiceOnly(h http.Handler) http.HandlerFunc {
//	return func(w http.ResponseWriter, r *http.Request) {
//		hostPort := r.RemoteAddr
//		host, _, err := net.SplitHostPort(hostPort)
//		if err != nil {
//			http.Error(w, "Malformed Request.", 400)
//			return
//		}
//		// NOTE: requires net=host when run as container to allow requests originating from host
//		// TODO: see if we can get the host IP address and get to whitelist it
//		if host != "127.0.0.1" && host != "::1" { // ::1 (IPv6)
//			http.Error(w, "Unauthorized.", 401)
//			return
//		}
//		h.ServeHTTP(w, r)
//	}
//}

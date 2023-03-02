package console_diagnosis

import (
	"flag"
	"os"
	"path/filepath"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	metricsv "k8s.io/metrics/pkg/client/clientset/versioned"
)

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}

type KubernetesConsoleDiagnosisHandler struct {
	kubeCli        *kubernetes.Clientset
	kubeConfig     *rest.Config
	kubeMetricsCli *metricsv.Clientset
}

func NewKubernetesConsoleDiagnosisHandler() (*KubernetesConsoleDiagnosisHandler, error) {
	var err error
	kubeConfig, err := rest.InClusterConfig()
	if err != nil {
		log.Warn().Msg(err.Error())
		log.Warn().Msg("Falling back to out of cluster config")
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
			return nil, err
		}
	}
	// creates the clientset
	kubeCli, err := kubernetes.NewForConfig(kubeConfig)
	if err != nil {
		return nil, err
	}
	kubeMetricsCli, err := metricsv.NewForConfig(kubeConfig)
	if err != nil {
		log.Warn().Msg("metrics server not set up in kubernetes")
	}
	return &KubernetesConsoleDiagnosisHandler{
		kubeCli:        kubeCli,
		kubeConfig:     kubeConfig,
		kubeMetricsCli: kubeMetricsCli,
	}, nil
}

func (d *KubernetesConsoleDiagnosisHandler) GenerateDiagnosticLogs(tail string) error {
	return nil
}

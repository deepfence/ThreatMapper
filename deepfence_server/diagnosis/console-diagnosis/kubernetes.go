package console_diagnosis //nolint:stylecheck

import (
	"archive/zip"
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
	coreV1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	kubeCli          *kubernetes.Clientset
	kubeConfig       *rest.Config
	kubeMetricsCli   *metricsv.Clientset
	consoleNamespace string
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
	consoleNamespace := os.Getenv("CONSOLE_NAMESPACE")
	if consoleNamespace == "" {
		consoleNamespace = "default"
	}
	return &KubernetesConsoleDiagnosisHandler{
		kubeCli:          kubeCli,
		kubeConfig:       kubeConfig,
		kubeMetricsCli:   kubeMetricsCli,
		consoleNamespace: consoleNamespace,
	}, nil
}

func (k *KubernetesConsoleDiagnosisHandler) GenerateDiagnosticLogs(ctx context.Context, tail string) error {

	ctx, span := telemetry.NewSpan(ctx, "diagnosis", "generate-diagnostic-logs-kubernetes")
	defer span.End()

	zipFile, err := os.Create(fmt.Sprintf("/tmp/deepfence-console-logs-%s.zip", time.Now().Format("2006-01-02-15-04-05")))
	if err != nil {
		return err
	}
	defer func() {
		zipFile.Close()
		os.RemoveAll(zipFile.Name())
	}()
	zipWriter := zip.NewWriter(zipFile)

	labelSelector := "app=deepfence-console"
	options := metaV1.ListOptions{LabelSelector: labelSelector}
	pods, err := k.GetPods(ctx, options)
	if err != nil {
		return err
	}

	tailLimit, err := strconv.ParseInt(tail, 10, 64)
	if err != nil {
		return err
	}
	podLogOptions := coreV1.PodLogOptions{TailLines: &tailLimit}

	for _, pod := range pods {
		err = k.addPodLogs(ctx, &pod, &podLogOptions, zipWriter)
		if err != nil {
			log.Warn().Msg(err.Error())
		}
	}
	err = zipWriter.Close()
	if err != nil {
		return err
	}
	zipWriter.Flush()

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return err
	}
	_, err = mc.UploadLocalFile(ctx,
		filepath.Join(diagnosis.ConsoleDiagnosisFileServerPrefix, filepath.Base(zipFile.Name())),
		zipFile.Name(),
		true,
		minio.PutObjectOptions{ContentType: "application/zip"})
	if err != nil {
		return err
	}
	return nil
}

func (k *KubernetesConsoleDiagnosisHandler) addPodLogs(ctx context.Context, pod *coreV1.Pod, podLogOptions *coreV1.PodLogOptions, zipWriter *zip.Writer) error {
	ctx, span := telemetry.NewSpan(ctx, "diagnosis", "add-pod-logs")
	defer span.End()

	req := k.kubeCli.CoreV1().Pods(pod.Namespace).GetLogs(pod.Name, podLogOptions)
	podLogs, err := req.Stream(ctx)
	if err != nil {
		return err
	}
	logBytes, err := io.ReadAll(podLogs)
	if err != nil {
		podLogs.Close()
		return err
	}
	podLogs.Close()

	zipFileWriter, err := zipWriter.Create(fmt.Sprintf("%s.log", pod.Name))
	if err != nil {
		return err
	}
	if _, err := zipFileWriter.Write(utils.StripAnsi(logBytes)); err != nil {
		return err
	}

	if strings.Contains(pod.Name, "router") {
		err = k.CopyFromPod(ctx, pod, HaproxyLogsPath, zipWriter)
		if err != nil {
			return err
		}
	}
	return nil
}

func (k *KubernetesConsoleDiagnosisHandler) GetPods(ctx context.Context, options metaV1.ListOptions) ([]coreV1.Pod, error) {
	ctx, span := telemetry.NewSpan(ctx, "diagnosis", "get-pods")
	defer span.End()

	pods, err := k.kubeCli.CoreV1().Pods(k.consoleNamespace).List(ctx, options)
	if err != nil {
		return nil, err
	}
	return pods.Items, nil
}

func (k *KubernetesConsoleDiagnosisHandler) CopyFromPod(ctx context.Context, pod *coreV1.Pod, srcPath string, zipWriter *zip.Writer) error {
	ctx, span := telemetry.NewSpan(ctx, "diagnosis", "copy-from-pod")
	defer span.End()

	randID := utils.NewUUIDString()
	tmpFolder := "/tmp/" + randID + "/" + pod.Name
	var err error
	if err = os.MkdirAll(tmpFolder, os.ModePerm); err != nil {
		return err
	}
	defer os.RemoveAll("/tmp/" + randID)
	command := fmt.Sprintf("kubectl cp %s/%s:%s %s", pod.Namespace, pod.Name, srcPath, tmpFolder)
	_, err = utils.ExecuteCommand(command, map[string]string{})
	if err != nil {
		return err
	}
	return filepath.Walk(tmpFolder,
		func(file string, fi os.FileInfo, err error) error {
			if err != nil {
				log.Error().Msg(err.Error())
				return nil
			}
			if !fi.IsDir() {
				// here number 3 has been used to cut some nested path values in tar writer
				// like if path is /tmp/some1/some2/some3 then dir structure in tar will be /some2/some3
				fileName := strings.Join(strings.Split(filepath.ToSlash(file), "/")[3:], "/")
				if fileName == "" {
					return nil
				}

				// create directories
				var tmpFilePath string
				dirs := strings.Split(fileName, "/")
				if len(dirs) > 1 {
					dirs = dirs[:len(dirs)-1]
					for _, dir := range dirs {
						tmpFilePath += dir + "/"
						if tmpFilePath != "/" {
							_, err = zipWriter.Create(tmpFilePath)
							if err != nil {
								return err
							}
						}
					}
				}

				// create file
				zipFileWriter, err := zipWriter.Create(fileName)
				if err != nil {
					return err
				}
				data, err := os.Open(file)
				if err != nil {
					return err
				}
				if _, err := io.Copy(zipFileWriter, data); err != nil {
					return err
				}
			}
			return nil
		},
	)
}

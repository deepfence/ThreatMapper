package main

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"github.com/google/uuid"
	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type diagnosisT struct{}

var (
	supervisorContainers []string
	supervisorLogsFolder = "/var/log/supervisor"
)

const (
	CELERY_CONTAINER                 = "deepfence-celery"
	VULNERABILITY_CONTAINER_LOG_PATH = "/var/log/vulnerability_scan_logs/"
)

func init() {
	supervisorContainers = []string{"deepfence-analyzer-0", "deepfence-analyzer-1", "deepfence-analyzer-2", "deepfence-celery", "deepfence-backend", "deepfence-api"}
}

func addSupervisorLogsKubernetes(pod v1.Pod, tarWriter *tar.Writer) error {
	logsNeeded := false
	for _, supervisorContainer := range supervisorContainers {
		if strings.Contains(pod.Name, supervisorContainer) {
			logsNeeded = true
			break
		}
	}
	if logsNeeded == false {
		return nil
	}
	randID := uuid.New().String()
	tmpFolder := "/tmp/" + randID + "/supervisor-logs/" + pod.Name
	_ = os.MkdirAll(tmpFolder, os.ModePerm)
	command := fmt.Sprintf("kubectl cp %s/%s:%s %s", pod.Namespace, pod.Name, supervisorLogsFolder, tmpFolder)
	_, err := ExecuteCommand(command)
	if err != nil {
		return err
	}
	filepath.Walk(tmpFolder, func(file string, fi os.FileInfo, err error) error {
		// generate tar header
		header, err := tar.FileInfoHeader(fi, file)
		if err != nil {
			return err
		}

		// here number 3 has been used to cut some nested path values in tar writer
		// like if path is /tmp/some1/some2/some3 then dir structure in tar will be /some2/some3
		header.Name = strings.Join(strings.Split(filepath.ToSlash(file), "/")[3:], "/")

		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}
		// if not a dir, write file content
		if !fi.IsDir() {
			data, err := os.Open(file)
			if err != nil {
				return err
			}
			if _, err := io.Copy(tarWriter, data); err != nil {
				return err
			}
		}
		return nil
	})
	os.RemoveAll("/tmp/" + randID)
	return nil
}

func addVulnerabilityLogsKubernetes(pod v1.Pod, tarWriter *tar.Writer) error {
	logsNeeded := false
	for _, supervisorContainer := range supervisorContainers {
		if strings.Contains(pod.Name, supervisorContainer) {
			logsNeeded = true
			break
		}
	}
	if logsNeeded == false {
		return nil
	}
	randID := uuid.New().String()
	tmpFolder := "/tmp/" + randID + "/" + pod.Name + "/vulnerability_scan_logs"
	_ = os.MkdirAll(tmpFolder, os.ModePerm)
	command := fmt.Sprintf("kubectl cp %s/%s:%s %s", pod.Namespace, pod.Name, VULNERABILITY_CONTAINER_LOG_PATH, tmpFolder)
	_, err := ExecuteCommand(command)
	if err != nil {
		return err
	}
	filepath.Walk(tmpFolder, func(file string, fi os.FileInfo, err error) error {
		// generate tar header
		header, err := tar.FileInfoHeader(fi, file)
		if err != nil {
			return err
		}

		// here number 3 has been used to cut some nested path values in tar writer
		// like if path is /tmp/some1/some2/some3 then dir structure in tar will be /some2/some3
		header.Name = strings.Join(strings.Split(filepath.ToSlash(file), "/")[3:], "/")

		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}
		// if not a dir, write file content
		if !fi.IsDir() {
			data, err := os.Open(file)
			if err != nil {
				return err
			}
			if _, err := io.Copy(tarWriter, data); err != nil {
				return err
			}
		}
		return nil
	})
	os.RemoveAll("/tmp/" + randID)
	return nil
}

func addVulnerabilityLogsDocker(container types.Container, tarWriter *tar.Writer) error {
	containerName := strings.Trim(container.Names[0], "/")
	if !InArray(containerName, supervisorContainers) {
		return nil
	}
	tarStream, err := copyFromContainer(container.ID, VULNERABILITY_CONTAINER_LOG_PATH)
	if err != nil {
		return nil
	}

	tr := tar.NewReader(tarStream)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break // end of tar archive
		}
		if err != nil {
			break
		}
		logBytes, err := ioutil.ReadAll(tr)
		if err != nil {
			break
		}
		if hdr.FileInfo().IsDir() {
			hdr.Name = containerName
		} else {
			hdr.Name = containerName + "/" + hdr.Name
		}
		if err := tarWriter.WriteHeader(hdr); err != nil {
			break
		}
		if _, err := tarWriter.Write(logBytes); err != nil {
			break
		}
	}
	return nil
}

func addSupervisorLogsDocker(container types.Container, tarWriter *tar.Writer) error {
	containerName := strings.Trim(container.Names[0], "/")
	logsNeeded := false
	for _, supervisorContainer := range supervisorContainers {
		if strings.Contains(containerName, supervisorContainer) {
			logsNeeded = true
			break
		}
	}
	if logsNeeded == false {
		return nil
	}
	tarStream, err := copyFromContainer(container.ID, supervisorLogsFolder)
	if err != nil {
		return nil
	}

	tr := tar.NewReader(tarStream)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break // end of tar archive
		}
		if err != nil {
			break
		}
		logBytes, err := ioutil.ReadAll(tr)
		if err != nil {
			break
		}
		if hdr.FileInfo().IsDir() {
			hdr.Name = containerName
		} else {
			hdr.Name = containerName + "/" + hdr.Name
		}
		if err := tarWriter.WriteHeader(hdr); err != nil {
			break
		}
		if _, err := tarWriter.Write(logBytes); err != nil {
			break
		}
	}
	return nil
}

func (t *diagnosisT) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	filename := "deepfence-logs"
	// w.Header().Set("Content-Encoding", "gzip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.tar.gz\"", filename))
	// var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(w)
	gzipWriter.Name = "deepfence-logs.tar"
	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()
	defer gzipWriter.Close()
	ctx := context.Background()

	if orchestrator == kubernetesOrchestrator {
		labelSelector := "app=deepfence-console"
		values := r.URL.Query()
		containerName := values.Get("container_name")
		if len(containerName) > 0 {
			labelSelector += fmt.Sprintf(",name=%s", containerName)
		}
		options := metaV1.ListOptions{
			LabelSelector: labelSelector,
		}
		pods, err := getPods(options)
		if err != nil {
			errMsg := "Error while getting pods data - " + err.Error()
			http.Error(w, errMsg, http.StatusInternalServerError)
			return
		}
		celeryPod, err := getPodWithLabel(CELERY_CONTAINER, pods)
		if err != nil {
			errMsg := "Error while getting pods data - " + err.Error()
			http.Error(w, errMsg, http.StatusInternalServerError)
			return
		}
		podOptions := v1.PodLogOptions{}
		tailLimitStr := values.Get("tail")
		if len(tailLimitStr) > 0 {
			tailLimit, err := strconv.ParseInt(tailLimitStr, 10, 64)
			if err != nil {
				errMsg := "Error while getting pods data - " + err.Error()
				http.Error(w, errMsg, http.StatusInternalServerError)
				return
			}
			podOptions.TailLines = &tailLimit
		}
		err = addVulnerabilityLogsKubernetes(celeryPod, tarWriter)
		if err != nil {
			fmt.Println(err)
		}

		for _, pod := range pods {
			req := kubeCli.CoreV1().Pods(pod.Namespace).GetLogs(pod.Name, &podOptions)
			podLogs, err := req.Stream(ctx)
			if err != nil {
				fmt.Println("error in opening stream", err)
				continue
			}
			logBytes, err := ioutil.ReadAll(podLogs)
			if err != nil {
				continue
			}
			podLogs.Close()
			hdr := &tar.Header{
				Name: fmt.Sprintf("%s.log", pod.Name),
				Mode: 0600,
				Size: int64(utf8.RuneCount(logBytes)),
			}
			if err := tarWriter.WriteHeader(hdr); err != nil {
				continue
			}
			if _, err := tarWriter.Write(logBytes); err != nil {
				continue
			}
			err = addSupervisorLogsKubernetes(pod, tarWriter)
			if err != nil {
				fmt.Println(err)
			}
		}
	} else {
		values := r.URL.Query()
		containerName := values.Get("container_name")
		tail := values.Get("tail")

		containerFilters := filters.NewArgs()
		if len(containerName) > 0 {
			containerFilters.Add("name", containerName)
		}
		containers := getContainers(types.ContainerListOptions{
			Filters: containerFilters,
			All:     true,
		})
		celeryContainer, _ := getContainer(CELERY_CONTAINER, containers)

		logOptions := types.ContainerLogsOptions{
			ShowStdout: true,
			ShowStderr: true,
			Tail:       tail,
		}

		// get vulnerability mapper logs
		if celeryContainer.Names != nil {
			err := addVulnerabilityLogsDocker(celeryContainer, tarWriter)
			if err != nil {
				fmt.Println(err)
			}
		}

		for _, container := range containers {
			if len(container.Names) == 0 {
				continue
			}
			containerName := strings.Trim(container.Names[0], "/")
			logs, err := getContainerLogs(container.ID, logOptions)
			if err != nil {
				continue
			}
			logBytes, err := ioutil.ReadAll(logs)
			if err != nil {
				continue
			}
			// if len(logBytes) == 0 {
			//   continue
			// }
			hdr := &tar.Header{
				Name: fmt.Sprintf("%s.log", containerName),
				Mode: 0600,
				Size: int64(utf8.RuneCount(logBytes)),
			}
			if err := tarWriter.WriteHeader(hdr); err != nil {
				continue
			}
			if _, err := tarWriter.Write(logBytes); err != nil {
				continue
			}
			err = addSupervisorLogsDocker(container, tarWriter)
			if err != nil {
				fmt.Println(err)
			}
		}
	}
	tarWriter.Flush()
	gzipWriter.Flush()
}

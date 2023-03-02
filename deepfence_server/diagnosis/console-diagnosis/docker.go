package console_diagnosis

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"strings"
	"unicode/utf8"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	dockerClient "github.com/docker/docker/client"
	"github.com/rs/zerolog/log"
)

const (
	HaproxyLogsPath = "/var/log/haproxy"
)

type DockerConsoleDiagnosisHandler struct {
	dockerCli *dockerClient.Client
}

func NewDockerConsoleDiagnosisHandler() (*DockerConsoleDiagnosisHandler, error) {
	var err error
	dockerCli, err := dockerClient.NewClientWithOpts(dockerClient.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return &DockerConsoleDiagnosisHandler{dockerCli: dockerCli}, nil
}

func (d *DockerConsoleDiagnosisHandler) GenerateDiagnosticLogs(tail string) error {
	file, err := CreateTempFile()
	if err != nil {
		return err
	}
	gzipWriter := gzip.NewWriter(file)
	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()
	defer gzipWriter.Close()
	ctx := context.Background()

	containerFilters := filters.NewArgs()
	containers := d.getContainers(ctx, types.ContainerListOptions{
		Filters: containerFilters,
		All:     true,
	})

	logOptions := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
	}

	for _, container := range containers {
		if len(container.Names) == 0 {
			continue
		}
		containerName := strings.Trim(container.Names[0], "/")
		logs, err := d.getContainerLogs(ctx, container.ID, logOptions)
		if err != nil {
			log.Warn().Msg(err.Error())
			continue
		}
		logBytes, err := io.ReadAll(logs)
		if err != nil {
			log.Warn().Msg(err.Error())
			continue
		}
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
		if strings.Contains(containerName, "router") {
			err = d.copyFromContainer(ctx, container.ID, containerName, HaproxyLogsPath, tarWriter)
			if err != nil {
				log.Warn().Msg(err.Error())
			}
		}
	}
	tarWriter.Flush()
	gzipWriter.Flush()
	return nil
}

func (d *DockerConsoleDiagnosisHandler) getContainerLogs(ctx context.Context, containerID string, options types.ContainerLogsOptions) (io.ReadCloser, error) {
	logs, err := d.dockerCli.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return nil, err
	}
	return logs, nil
}

func (d *DockerConsoleDiagnosisHandler) getContainers(ctx context.Context, options types.ContainerListOptions) []types.Container {
	containers, err := d.dockerCli.ContainerList(ctx, options)
	if err != nil {
		panic(err)
	}
	return containers
}

func (d *DockerConsoleDiagnosisHandler) copyFromContainer(ctx context.Context, containerId string, containerName string,
	srcPath string, tarWriter *tar.Writer) error {

	tarStream, _, err := d.dockerCli.CopyFromContainer(ctx, containerId, srcPath)
	if err != nil {
		return err
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
		logBytes, err := io.ReadAll(tr)
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

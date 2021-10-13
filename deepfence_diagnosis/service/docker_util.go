package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/docker/docker/api/types"
)

func getContainers(options types.ContainerListOptions) []types.Container {
	ctx := context.Background()
	containers, err := dockerCli.ContainerList(ctx, options)
	if err != nil {
		panic(err)
	}
	return containers
}

func getContainer(name string, containers []types.Container) (types.Container, error) {
	for _, container := range containers {
		containerName := strings.Trim(container.Names[0], "/")
		if containerName == name {
			return container, nil
		}
	}
	return types.Container{}, errors.New("cannot find container")
}

func copyFromContainer(containerId string, srcPath string) (io.ReadCloser, error) {
	ctx := context.Background()
	tarStream, _, err := dockerCli.CopyFromContainer(ctx, containerId, srcPath)
	if err != nil {
		return nil, err
	}
	return tarStream, nil
}

func getContainerInspect(containerId string) (*types.ContainerJSON, error) {
	ctx := context.Background()
	details, inspectErr := dockerCli.ContainerInspect(ctx, containerId)
	if inspectErr != nil {
		err := fmt.Errorf("Error while containerInspect; Err: %s", inspectErr)
		return nil, err
	}

	return &details, nil
}

func getContainerLogs(containerID string, options types.ContainerLogsOptions) (io.ReadCloser, error) {
	ctx := context.Background()
	logs, err := dockerCli.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return nil, err
	}
	return logs, nil
}

// for stand-alone testing rename to main
func inspectMain() {
	containers := getContainers(types.ContainerListOptions{})
	for _, container := range containers {
		details, _ := getContainerInspect(container.ID)
		fmt.Printf("%+v\n", details.State)
	}
}

// for stand-alone testing
//func main() {
//	containerFilters := filters.NewArgs()
//	containerFilters.Add("name", "deepfence*")
//	containers := getContainers(types.ContainerListOptions{
//		Filters: containerFilters,
//	})
//
//	logOptions := types.ContainerLogsOptions{
//		ShowStdout: true,
//	}
//
//	var buf bytes.Buffer
//	tarWriter := tar.NewWriter(&buf)
//
//	for _, container := range containers {
//		containerID := container.ID
//		containerName := container.Names[0]
//		logs, err := getContainerLogs(containerID, logOptions)
//		if err != nil {
//			panic(err)
//		}
//		logBytes, err := ioutil.ReadAll(logs)
//		if err != nil {
//			panic(err)
//		}
//
//		hdr := &tar.Header{
//			Name: fmt.Sprint("%s.log", containerName),
//			Size: int64(utf8.RuneCount(logBytes)),
//		}
//
//		if err := tarWriter.WriteHeader(hdr); err != nil {
//			panic(err)
//		}
//
//		if _, err := tarWriter.Write(logBytes); err != nil {
//			panic(err)
//		}
//	}
//	if err := tarWriter.Close(); err != nil {
//		panic(err)
//	}
//
//	fmt.Printf("%+v", buf)
//}

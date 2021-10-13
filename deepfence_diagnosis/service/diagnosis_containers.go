package main

import (
	"encoding/json"
	"fmt"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"net/http"
)

func containerState(w http.ResponseWriter, r *http.Request) {

	output := map[string]*types.ContainerState{}
	if orchestrator == dockerOrchestrator {
		options := types.ContainerListOptions{}
		containerFilters := filters.NewArgs()
		containerFilters.Add("name", "deepfence*")
		options.Filters = containerFilters
		options.All = true
		containers := getContainers(options)
		for _, container := range containers {
			details, err := getContainerInspect(container.ID)
			if err != nil {
				fmt.Printf("Error while inspecting container; containerID: %s; err: %s", container.ID, err)
				continue
			}
			output[container.ID] = details.State
		}
	}
	json.NewEncoder(w).Encode(output)
}

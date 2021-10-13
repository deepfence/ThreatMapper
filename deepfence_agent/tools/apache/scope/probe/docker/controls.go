package docker

import (
	"fmt"
	dfUtils "github.com/deepfence/df-utils"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/report"
	"strings"
)

// Control IDs used by the docker integration.
const (
	ContainerAddUserDefinedTags    = "container_add_user_defined_tags"
	ContainerDeleteUserDefinedTags = "container_delete_user_defined_tags"
	ImageAddUserDefinedTags        = "image_add_user_defined_tags"
	ImageDeleteUserDefinedTags     = "image_delete_user_defined_tags"
	waitTime = 10
)

func (r *registry) addContainerUserDefinedTags(containerID string, req xfer.Request) xfer.Response {
	tags := strings.Split(fmt.Sprintf("%s", req.ControlArgs["user_defined_tags"]), ",")
	r.userDefinedContainerTags.Lock()
	defer r.userDefinedContainerTags.Unlock()
	tagsList, ok := r.userDefinedContainerTags.tags[containerID]
	if !ok {
		tagsList = []string{}
	}
	for _, tag := range tags {
		if tag != "" {
			exists, _ := dfUtils.InArray(tag, tagsList)
			if !exists {
				tagsList = append(tagsList, tag)
			}
		}
	}
	r.userDefinedContainerTags.tags[containerID] = tagsList
	return xfer.Response{TagsInfo: "Tags added"}
}

func (r *registry) addImageUserDefinedTags(imageID string, req xfer.Request) xfer.Response {
	tags := strings.Split(fmt.Sprintf("%s", req.ControlArgs["user_defined_tags"]), ",")
	r.userDefinedImageTags.Lock()
	defer r.userDefinedImageTags.Unlock()
	tagsList, ok := r.userDefinedImageTags.tags[imageID]
	if !ok {
		tagsList = []string{}
	}
	for _, tag := range tags {
		if tag != "" {
			exists, _ := dfUtils.InArray(tag, tagsList)
			if !exists {
				tagsList = append(tagsList, tag)
			}
		}
	}
	r.userDefinedImageTags.tags[imageID] = tagsList
	return xfer.Response{TagsInfo: "Tags added"}
}

func (r *registry) deleteContainerUserDefinedTags(containerID string, req xfer.Request) xfer.Response {
	tags := strings.Split(fmt.Sprintf("%s", req.ControlArgs["user_defined_tags"]), ",")
	r.userDefinedContainerTags.Lock()
	defer r.userDefinedContainerTags.Unlock()
	tagsList, ok := r.userDefinedContainerTags.tags[containerID]
	if !ok {
		return xfer.Response{TagsInfo: "Tags deleted"}
	}
	for _, tag := range tags {
		tagsList = dfUtils.RemoveFromArray(tagsList, tag)
	}
	if len(tagsList) == 0 {
		delete(r.userDefinedContainerTags.tags, containerID)
	} else {
		r.userDefinedContainerTags.tags[containerID] = tagsList
	}
	return xfer.Response{TagsInfo: "Tags deleted"}
}

func (r *registry) deleteImageUserDefinedTags(imageID string, req xfer.Request) xfer.Response {
	tags := strings.Split(fmt.Sprintf("%s", req.ControlArgs["user_defined_tags"]), ",")
	r.userDefinedImageTags.Lock()
	defer r.userDefinedImageTags.Unlock()
	tagsList, ok := r.userDefinedImageTags.tags[imageID]
	if !ok {
		return xfer.Response{TagsInfo: "Tags deleted"}
	}
	for _, tag := range tags {
		tagsList = dfUtils.RemoveFromArray(tagsList, tag)
	}
	if len(tagsList) == 0 {
		delete(r.userDefinedImageTags.tags, imageID)
	} else {
		r.userDefinedImageTags.tags[imageID] = tagsList
	}
	return xfer.Response{TagsInfo: "Tags deleted"}
}

func captureContainerID(f func(string, xfer.Request) xfer.Response) func(xfer.Request) xfer.Response {
	return func(req xfer.Request) xfer.Response {
		containerID, ok := report.ParseContainerNodeID(req.NodeID)
		req_type := fmt.Sprintf("%s", req.ControlArgs["type"])
		if (!ok) && (string(req_type) != "host") {
			return xfer.ResponseErrorf("Invalid ID: %s", req.NodeID)
		}
		return f(containerID, req)
	}
}

func captureImageName(f func(string, xfer.Request) xfer.Response) func(xfer.Request) xfer.Response {
	return func(req xfer.Request) xfer.Response {
		imageID, ok := report.ParseContainerImageNodeID(req.NodeID)
		reqType := fmt.Sprintf("%s", req.ControlArgs["type"])
		if (!ok) && (string(reqType) != "host") {
			return xfer.ResponseErrorf("Invalid ID: %s", req.NodeID)
		}
		return f(imageID, req)
	}
}

func (r *registry) registerControls() {
	controls := map[string]xfer.ControlHandlerFunc{
		ContainerAddUserDefinedTags:    captureContainerID(r.addContainerUserDefinedTags),
		ContainerDeleteUserDefinedTags: captureContainerID(r.deleteContainerUserDefinedTags),
		ImageAddUserDefinedTags:        captureImageName(r.addImageUserDefinedTags),
		ImageDeleteUserDefinedTags:     captureImageName(r.deleteImageUserDefinedTags),
	}
	r.handlerRegistry.Batch(nil, controls)
}

func (r *registry) deregisterControls() {
	controls := []string{
		ContainerAddUserDefinedTags,
		ContainerDeleteUserDefinedTags,
		ImageAddUserDefinedTags,
		ImageDeleteUserDefinedTags,
	}
	r.handlerRegistry.Batch(controls, nil)
}

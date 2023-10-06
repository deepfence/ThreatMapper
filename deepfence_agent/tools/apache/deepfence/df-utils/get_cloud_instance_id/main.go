package main

import (
	"fmt"

	"github.com/deepfence/df-utils/cloud_metadata"
)

func main() {
	cloudMetadata := cloud_metadata.GetCloudMetadata()
	if cloudMetadata.InstanceID != "" {
		fmt.Print(cloudMetadata.InstanceID)
	}
}

package main

import (
	"fmt"
	"github.com/deepfence/df-utils/cloud_metadata"
)

func GetCloudMetadata() cloud_metadata.CloudMetadata {
	// Check if AWS
	cloudMetadata, err := cloud_metadata.GetAWSMetadata(false)
	if err == nil {
		return cloudMetadata
	}
	// Check if Google Cloud
	cloudMetadata, err = cloud_metadata.GetGoogleCloudMetadata(false)
	if err == nil {
		return cloudMetadata
	}
	// Check if Azure
	cloudMetadata, err = cloud_metadata.GetAzureMetadata(false)
	if err == nil {
		return cloudMetadata
	}
	// Check if Digital Ocean
	cloudMetadata, err = cloud_metadata.GetDigitalOceanMetadata(false)
	if err == nil {
		return cloudMetadata
	}
	// Check if AWS ECS / Fargate
	cloudMetadata, err = cloud_metadata.GetAWSFargateMetadata(false)
	if err == nil {
		return cloudMetadata
	}
	// Check if Softlayer
	cloudMetadata, err = cloud_metadata.GetSoftlayerMetadata(false)
	if err == nil {
		return cloudMetadata
	}
	return cloud_metadata.CloudMetadata{InstanceID: "", CloudProvider: "private_cloud"}
}

func main() {
	cloudMetadata := GetCloudMetadata()
	if cloudMetadata.InstanceID != "" {
		fmt.Print(cloudMetadata.InstanceID)
	} else if cloudMetadata.VmID != "" {
		fmt.Print(cloudMetadata.VmID)
	}
}

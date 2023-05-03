package ecr

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

func listImages(awsAccessKey, awsSecretKey, awsRegion string) ([]model.ContainerImage, error) {
	// Set up AWS session with access key ID and secret access key
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(awsRegion),
		Credentials: credentials.NewStaticCredentials(awsAccessKey, awsSecretKey, ""),
	})
	if err != nil {
		return nil, fmt.Errorf("error creating session: %v", err)
	}

	// Create ECR client
	svc := ecr.New(sess)

	// Call DescribeRepositories API
	result, err := svc.DescribeRepositories(nil)
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	// Create slice of ContainerImage structs
	var containerImages []model.ContainerImage

	// List images for each repository
	for _, repo := range result.Repositories {
		// Set up input parameters
		input := &ecr.ListImagesInput{
			RepositoryName: aws.String(*repo.RepositoryName),
		}

		// Call ListImages API
		result, err := svc.ListImages(input)
		if err != nil {
			return nil, fmt.Errorf("error listing images for repository %s: %v", *repo.RepositoryName, err)
		}

		// Add containers to ContainerImage struct
		for _, image := range result.ImageIds {
			var containerImage model.ContainerImage
			containerImage.Name = *repo.RepositoryName
			containerImage.Tag = *image.ImageTag
			containerImage.DockerImageID = *image.ImageDigest
			containerImages = append(containerImages, containerImage)
		}
	}

	log.Info().Msgf("ecr containerImages: %+v", containerImages)

	return containerImages, nil
}
func listImagesCrossAccount(awsRegion, awsAccountID, targetAccountRoleARN string) ([]model.ContainerImage, error) {
	// Create session with default credentials provider chain
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(awsRegion),
	})
	if err != nil {
		return nil, fmt.Errorf("error creating session: %v", err)
	}

	// Assume role in target account
	creds := stscreds.NewCredentials(sess, targetAccountRoleARN)

	// Create ECR client
	svc := ecr.New(sess, &aws.Config{
		Region:      aws.String(awsRegion),
		Credentials: creds,
	})

	// Call DescribeRepositories API
	result, err := svc.DescribeRepositories(&ecr.DescribeRepositoriesInput{
		RegistryId: aws.String(awsAccountID),
	})
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	// Create slice of ContainerImage structs
	var containerImages []model.ContainerImage

	// List images for each repository
	for _, repo := range result.Repositories {
		// Set up input parameters
		input := &ecr.ListImagesInput{
			RepositoryName: aws.String(*repo.RepositoryName),
		}

		// Call ListImages API
		result, err := svc.ListImages(input)
		if err != nil {
			return nil, fmt.Errorf("error listing images for repository %s: %v", *repo.RepositoryName, err)
		}

		// Add containers to ContainerImage struct
		for _, image := range result.ImageIds {
			var containerImage model.ContainerImage
			containerImage.Name = *repo.RepositoryName
			containerImage.Tag = *image.ImageTag
			containerImage.DockerImageID = *image.ImageDigest
			containerImages = append(containerImages, containerImage)
		}
	}

	return containerImages, nil
}

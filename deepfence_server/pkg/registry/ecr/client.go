package ecr

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func listImages(awsAccessKey, awsSecretKey, awsRegion string) ([]model.IngestedContainerImage, error) {
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

	// Create slice of IngestedContainerImage structs
	var containerImages []model.IngestedContainerImage

	var imageResult []*ecr.ListImagesOutput
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
		imageResult = append(imageResult, result)
		// Add containers to IngestedContainerImage struct
		for _, image := range result.ImageIds {
			if image.ImageTag != nil {
				var containerImage model.IngestedContainerImage
				containerImage.Name = *repo.RepositoryUri
				containerImage.ID = model.DigestToID(*image.ImageDigest)
				containerImage.Tag = *image.ImageTag
				containerImage.DockerImageID = *image.ImageDigest
				containerImage.Metadata = model.Metadata{
					"digest":       *image.ImageDigest,
					"last_updated": time.Now().Unix(),
				}
				containerImages = append(containerImages, containerImage)
			}
		}
	}

	return containerImages, nil
}
func listImagesCrossAccount(awsRegion, awsAccountID, targetAccountRoleARN string) ([]model.IngestedContainerImage, error) {
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

	// Create slice of IngestedContainerImage structs
	var containerImages []model.IngestedContainerImage

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

		// Add containers to IngestedContainerImage struct
		for _, image := range result.ImageIds {
			var containerImage model.IngestedContainerImage
			containerImage.Name = *repo.RepositoryUri
			containerImage.Tag = *image.ImageTag
			containerImage.ID = model.DigestToID(*image.ImageDigest)
			containerImage.DockerImageID = *image.ImageDigest
			containerImage.Metadata = model.Metadata{
				"digest":       *image.ImageDigest,
				"last_updated": time.Now().Unix(),
			}
			containerImages = append(containerImages, containerImage)
		}
	}

	return containerImages, nil
}

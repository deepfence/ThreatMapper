package ecr

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func listPrivateImagesWithTags(result *ecr.DescribeRepositoriesOutput, svc *ecr.ECR) ([]model.IngestedContainerImage, error) {
	var containerImages []model.IngestedContainerImage

	for _, repo := range result.Repositories {

		input := &ecr.ListImagesInput{
			RepositoryName: aws.String(*repo.RepositoryName),
		}

		result, err := svc.ListImages(input)
		if err != nil {
			return nil, fmt.Errorf("error listing images for repository %s: %v", *repo.RepositoryName, err)
		}

		for _, image := range result.ImageIds {
			if image.ImageTag != nil {
				imageID, shortImageID := model.DigestToID(*image.ImageDigest)
				containerImage := model.IngestedContainerImage{
					ID:            imageID,
					DockerImageID: imageID,
					ShortImageID:  shortImageID,
					Name:          *repo.RepositoryUri,
					Tag:           *image.ImageTag,
					Size:          "",
					Metadata: model.Metadata{
						"digest":       *image.ImageDigest,
						"last_updated": time.Now().Unix(),
					},
				}
				containerImages = append(containerImages, containerImage)
			}
		}
	}

	return containerImages, nil
}

package ecr

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/ecrpublic"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func listPublicImagesWithTags(result *ecrpublic.DescribeRepositoriesOutput, svc *ecrpublic.ECRPublic) ([]model.IngestedContainerImage, error) {
	var containerImages []model.IngestedContainerImage

	for _, repo := range result.Repositories {
		tags, err := svc.DescribeImageTags(&ecrpublic.DescribeImageTagsInput{
			RepositoryName: repo.RepositoryName,
		})
		if err != nil {
			return nil, fmt.Errorf("error describing image tags for repository %s: %v", *repo.RepositoryName, err)
		}

		for _, tag := range tags.ImageTagDetails {
			imageID, shortImageID := model.DigestToID(*tag.ImageDetail.ImageDigest)
			containerImage := model.IngestedContainerImage{
				ID:            imageID,
				DockerImageID: imageID,
				ShortImageID:  shortImageID,
				Name:          *repo.RepositoryUri,
				Tag:           *tag.ImageTag,
				Size:          fmt.Sprint(*tag.ImageDetail.ImageSizeInBytes),
				Metadata: model.Metadata{
					"created_time": *repo.CreatedAt,
					"digest":       *tag.ImageDetail.ImageDigest,
					"last_updated": tag.ImageDetail.ImagePushedAt.Unix(),
					"last_pushed":  tag.ImageDetail.ImagePushedAt.Unix(),
				},
			}
			containerImages = append(containerImages, containerImage)
		}

	}
	return containerImages, nil
}

func listPublicImages(svc *ecrpublic.ECRPublic, awsAccountID string) ([]model.IngestedContainerImage, error) {
	describeRepositoriesInput := ecrpublic.DescribeRepositoriesInput{}
	if awsAccountID != "" {
		describeRepositoriesInput.RegistryId = aws.String(awsAccountID)
	}
	result, err := svc.DescribeRepositories(&describeRepositoriesInput)
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	return listPublicImagesWithTags(result, svc)
}

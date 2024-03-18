package ecr

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/aws/aws-sdk-go/service/ecrpublic"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func listIAMPrivateImages(sess *session.Session, awsConfig aws.Config, awsAccountID string) ([]model.IngestedContainerImage, error) {
	svc := ecr.New(sess, &awsConfig)

	var images []model.IngestedContainerImage
	err := svc.DescribeRepositoriesPages(&ecr.DescribeRepositoriesInput{
		RegistryId: aws.String(awsAccountID),
	}, func(result *ecr.DescribeRepositoriesOutput, lastPage bool) bool {
		repoImages, err := listPrivateImagesWithTags(result, svc)
		if err != nil {
			return false
		}
		if len(result.Repositories) == 0 {
			return false
		}
		images = append(images, repoImages...)
		return true
	})
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	return images, nil
}

func listIAMPublicImages(sess *session.Session, awsConfig aws.Config, awsAccountID string) ([]model.IngestedContainerImage, error) {
	svc := ecrpublic.New(sess, &awsConfig)
	var images []model.IngestedContainerImage
	err := svc.DescribeRepositoriesPages(&ecrpublic.DescribeRepositoriesInput{
		RegistryId: aws.String(awsAccountID),
	}, func(result *ecrpublic.DescribeRepositoriesOutput, lastPage bool) bool {
		repoImages, err := listPublicImagesWithTags(result, svc)
		if err != nil {
			return false
		}
		if len(result.Repositories) == 0 {
			return false
		}
		images = append(images, repoImages...)
		return true
	})
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	return images, nil
}

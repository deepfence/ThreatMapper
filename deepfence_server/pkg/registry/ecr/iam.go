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

	result, err := svc.DescribeRepositories(&ecr.DescribeRepositoriesInput{
		RegistryId: aws.String(awsAccountID),
	})
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	return listPrivateImagesWithTags(result, svc)
}

func listIAMPublicImages(sess *session.Session, awsConfig aws.Config, awsAccountID string) ([]model.IngestedContainerImage, error) {
	svc := ecrpublic.New(sess, &awsConfig)
	result, err := svc.DescribeRepositories(&ecrpublic.DescribeRepositoriesInput{
		RegistryId: aws.String(awsAccountID),
	})
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	return listPublicImagesWithTags(result, svc)
}

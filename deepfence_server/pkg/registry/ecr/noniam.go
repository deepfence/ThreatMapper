package ecr

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/aws/aws-sdk-go/service/ecrpublic"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func listNonIAMPrivateImages(sess *session.Session) ([]model.IngestedContainerImage, error) {
	svc := ecr.New(sess)

	// Call DescribeRepositories API
	result, err := svc.DescribeRepositories(nil)
	if err != nil {
		return nil, fmt.Errorf("error describing repositories: %v", err)
	}

	return listPrivateImagesWithTags(result, svc)
}

func listNonIAMPublicImages(sess *session.Session) ([]model.IngestedContainerImage, error) {
	// Create ECR Public client
	svc := ecrpublic.New(sess)
	return listPublicImages(svc)

}

package ecr

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func listIAMImages(awsRegion, awsAccountID, targetAccountRoleARN string, isPublic bool) ([]model.IngestedContainerImage, error) {
	// Create session with default credentials provider chain
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(awsRegion),
	})
	if err != nil {
		return nil, fmt.Errorf("error creating session: %v", err)
	}

	awsConfig := aws.Config{
		Region: aws.String(awsRegion),
	}

	// if targetRoleARN is empty, that means
	// it is not a crossaccount ecr, no need to use stscreds
	if targetAccountRoleARN != "" {
		creds := stscreds.NewCredentials(sess, targetAccountRoleARN)
		awsConfig.Credentials = creds
	}

	if isPublic {
		return listIAMPublicImages(sess, awsConfig, awsAccountID)
	}
	return listIAMPrivateImages(sess, awsConfig, awsAccountID)
}

func listNonIAMImages(awsAccessKey, awsSecretKey, awsAccountID, awsRegion string, isPublic bool) ([]model.IngestedContainerImage, error) {
	// Set up AWS session with access key ID and secret access key
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(awsRegion),
		Credentials: credentials.NewStaticCredentials(awsAccessKey, awsSecretKey, ""),
	})
	if err != nil {
		return nil, fmt.Errorf("error creating session: %v", err)
	}

	if isPublic {
		return listNonIAMPublicImages(sess, awsAccountID)
	}
	return listNonIAMPrivateImages(sess, awsAccountID)
}

func getAWSAccountID() (string, error) {
	// Send a GET request to the instance metadata service to retrieve the AWS Account ID
	resp, err := http.Get("http://169.254.169.254/latest/dynamic/instance-identity/document")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var awsSelfQuery AWSSelfQuery
	err = json.Unmarshal(body, &awsSelfQuery)
	if err != nil {
		return "", err
	}

	return awsSelfQuery.AccountID, nil
}

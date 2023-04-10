package awssecurityhub

import (
	"encoding/json"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/securityhub"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

func New(b []byte) (*AwsSecurityHub, error) {
	s := AwsSecurityHub{}
	err := json.Unmarshal(b, &s)
	if err != nil {
		return &s, err
	}
	return &s, nil
}

func (s AwsSecurityHub) SendNotification(message string) error {

	// Create an AWS session with your credentials and region
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(s.Config.AWSRegion),
		Credentials: credentials.NewStaticCredentials(s.Config.AWSAccessKey, s.Config.AWSSecretKey, ""),
	})
	if err != nil {
		fmt.Println("Failed to create AWS session", err)
		return err
	}

	svc := securityhub.New(sess)
	var jsonb map[string]interface{}
	err = json.Unmarshal([]byte(message), &jsonb)
	importFindings, err := svc.BatchImportFindings(s.mapPayloadToFindings(jsonb))
	if err != nil {
		fmt.Println("Failed to upload JSON data to Security Hub", err)
		return err
	}

	fmt.Println("JSON data uploaded successfully to aws security hub with", importFindings.SuccessCount, "success count")
	return nil
}

func (s AwsSecurityHub) mapPayloadToFindings(jsonb map[string]interface{}) *securityhub.BatchImportFindingsInput {
	findings := securityhub.BatchImportFindingsInput{}
	if s.Resource == utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN] {

	} else if s.Resource == utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN] {

	}
	return &findings
}

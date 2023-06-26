package awssecurityhub

import (
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/securityhub"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

func New(b []byte) (*AwsSecurityHub, error) {
	s := AwsSecurityHub{}
	err := json.Unmarshal(b, &s)
	if err != nil {
		return &s, err
	}
	return &s, nil
}

func (a AwsSecurityHub) SendNotification(message string) error {

	// Create an AWS session with your credentials and region
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(a.Config.AWSRegion),
		Credentials: credentials.NewStaticCredentials(a.Config.AWSAccessKey, a.Config.AWSSecretKey, ""),
	})
	if err != nil {
		fmt.Println("Failed to create AWS session", err)
		return err
	}

	svc := securityhub.New(sess)
	var jsonb map[string]interface{}
	err = json.Unmarshal([]byte(message), &jsonb)
	importFindings, err := svc.BatchImportFindings(a.mapPayloadToFindings(jsonb))
	if err != nil {
		fmt.Println("Failed to upload JSON data to Security Hub", err)
		return err
	}

	fmt.Println("JSON data uploaded successfully to aws security hub with", importFindings.SuccessCount, "success count")
	return nil
}

func (a AwsSecurityHub) mapPayloadToFindings(jsonb map[string]interface{}) *securityhub.BatchImportFindingsInput {
	findings := securityhub.BatchImportFindingsInput{}
	if a.Resource == utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN] {

	} else if a.Resource == utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN] {

	}
	return &findings
}

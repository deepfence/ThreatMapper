package s3

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

func New(ctx context.Context, b []byte) (*S3, error) {
	s := S3{}
	err := json.Unmarshal(b, &s)
	if err != nil {
		return &s, err
	}
	return &s, nil
}

func (s S3) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	// Create an AWS session with your credentials and region
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(s.Config.AWSRegion),
		Credentials: credentials.NewStaticCredentials(s.Config.AWSAccessKey, s.Config.AWSSecretKey, ""),
	})
	if err != nil {
		fmt.Println("Failed to create AWS session", err)
		return err
	}

	// Marshal your JSON data into a byte slice
	jsonBytes := []byte(message)
	if err != nil {
		fmt.Println("Failed to marshal JSON data", err)
		return err
	}

	// Upload the JSON data to S3
	svc := s3.New(sess)
	_, err = svc.PutObject(&s3.PutObjectInput{
		Body:   bytes.NewReader(jsonBytes),
		Bucket: aws.String(s.Config.S3FolderName + "example.json"),
	})
	if err != nil {
		fmt.Println("Failed to upload JSON data to S3", err)
		return err
	}

	fmt.Println("JSON data uploaded successfully")
	return nil
}

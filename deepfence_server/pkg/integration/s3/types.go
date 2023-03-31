package s3

type S3 struct {
	Config           Config              `json:"config"`
	IntegrationType  string              `json:"integration_type"`
	NotificationType string              `json:"notification_type"`
	Filters          map[string][]string `json:"filters"`
	Message          string              `json:"message"`
}

type Config struct {
	S3BucketName string `json:"s3_bucket_name"`
	AWSAccessKey string `json:"aws_access_key"`
	AWSSecretKey string `json:"aws_secret_key"`
	S3FolderName string `json:"s3_folder_name"`
	AWSRegion    string `json:"aws_region"`
}

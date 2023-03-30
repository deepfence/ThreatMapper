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

type Payload struct {
	Parse       string `json:"parse,omitempty"`
	Username    string `json:"username,omitempty"`
	IconUrl     string `json:"icon_url,omitempty"`
	IconEmoji   string `json:"icon_emoji,omitempty"`
	Channel     string `json:"channel,omitempty"`
	Text        string `json:"text,omitempty"`
	LinkNames   string `json:"link_names,omitempty"`
	UnfurlLinks bool   `json:"unfurl_links,omitempty"`
	UnfurlMedia bool   `json:"unfurl_media,omitempty"`
	Markdown    bool   `json:"mrkdwn,omitempty"`
}

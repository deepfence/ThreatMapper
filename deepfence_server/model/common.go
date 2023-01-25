package model

const (
	DefaultUserGroup = "default"
)

type ErrorResponse struct {
	Message     string            `json:"message" required:"true"`
	ErrorFields map[string]string `json:"error_fields"`
}

type ResponseAccessToken struct {
	AccessToken  string `json:"access_token" required:"true"`
	RefreshToken string `json:"refresh_token" required:"true"`
}

type FetchWindow struct {
	Offset int `json:"offset" required:"true"`
	Size   int `json:"size" required:"true"`
}

package model

const (
	DefaultUserGroup = "default"
)

type Response struct {
	Success     bool               `json:"success"`
	Message     string             `json:"message"`
	ErrorFields *map[string]string `json:"error_fields"`
	Data        interface{}        `json:"data"`
}

type ResponseAccessToken struct {
	AccessToken  string `json:"access_token" required:"true"`
	RefreshToken string `json:"refresh_token" required:"true"`
}

type FetchWindow struct {
	Offset int `json:"offset" required:"true"`
	Size   int `json:"size" required:"true"`
}

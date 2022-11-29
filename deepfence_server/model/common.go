package model

const (
	DefaultUserGroup = "default"
)

type InvalidFields map[string]string

type Response struct {
	Success     bool           `json:"success"`
	Message     string         `json:"message"`
	ErrorFields *InvalidFields `json:"error_fields"`
	Data        interface{}    `json:"data"`
}

type ResponseAccessToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

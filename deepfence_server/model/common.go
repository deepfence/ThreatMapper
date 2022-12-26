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
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type FetchWindow struct {
	Offset int `query:"offset" json:"offset" required:"true"`
	Size   int `query:"size" json:"size" required:"true"`
}

package model

import (
	"context"
	"strconv"
)

const (
	DefaultUserGroup = "default"
)

type ErrorResponse struct {
	Message     string            `json:"message" required:"true"`
	ErrorFields map[string]string `json:"error_fields"`
}

type LoginResponse struct {
	ResponseAccessToken
	OnboardingRequired  bool `json:"onboarding_required" required:"true"`
	PasswordInvalidated bool `json:"password_invalidated" required:"true"`
}

type ResponseAccessToken struct {
	AccessToken  string `json:"access_token" required:"true"`
	RefreshToken string `json:"refresh_token" required:"true"`
}

type FetchWindow struct {
	Offset int `json:"offset" required:"true"`
	Size   int `json:"size" required:"true"`
}

func (fw FetchWindow) FetchWindow2CypherQuery() string {
	if fw.Size == 0 {
		return ""
	}
	return ` SKIP ` + strconv.Itoa(fw.Offset) + ` LIMIT ` + strconv.Itoa(fw.Size)
}

func IsOnboardingRequired(ctx context.Context) bool {
	return false
}

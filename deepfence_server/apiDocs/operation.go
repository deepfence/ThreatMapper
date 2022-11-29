package apiDocs

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"net/http"
)

func (d *OpenApiDocs) AddUserAuthOperations() {
	d.AddOperation("registerUser", http.MethodPost, "/deepfence/user/register", "Register User", "First user registration. Further users needs to be invited.",
		[]string{tagAuthentication}, nil, nil, new(model.User), new(model.ResponseAccessToken))
}

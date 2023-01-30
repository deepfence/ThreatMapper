package apiDocs

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func (d *OpenApiDocs) AddInternalAuthOperations() {
	d.AddOperation("getConsoleApiToken", http.MethodGet, "/deepfence/internal/console-api-token",
		"Get api-token for console agent", "Get api-token for console agent",
		http.StatusOK, []string{tagInternal}, nil, nil, new(model.ApiAuthRequest))
}

package diagnosis

import (
	"context"
	"net/url"
	"path/filepath"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
)

const (
	DiagnosisLinkExpiry              = 5 * time.Minute
	ConsoleDiagnosisFileServerPrefix = "/diagnosis/console-diagnosis/"
	AgentDiagnosisFileServerPrefix   = "/diagnosis/agent-diagnosis/"
)

type DiagnosticNotification struct {
	Content             string      `json:"content"`
	ExpiryInSecs        interface{} `json:"expiry_in_secs"`
	FollowURL           interface{} `json:"follow_url"`
	SourceApplicationID string      `json:"source_application_id"`
	UpdatedAt           string      `json:"updated_at"`
}

type GenerateConsoleDiagnosticLogsRequest struct {
	Tail int `json:"tail" validate:"required,min=100,max=10000" required:"true"`
}

type NodeIdentifier struct {
	NodeId   string `json:"node_id" validate:"required,min=1" required:"true"`
	NodeType string `json:"node_type" required:"true" validate:"required,oneof=host cluster" enum:"host,cluster"`
}

type GenerateAgentDiagnosticLogsRequest struct {
	NodeIds []NodeIdentifier `json:"node_ids" validate:"required,gt=0" required:"true"`
	Tail    int              `json:"tail" validate:"required,min=100,max=10000" required:"true"`
}

type DiagnosticLogsStatus struct {
	NodeID  string `path:"node_id" validate:"required" required:"true"`
	Status  string `json:"status" validate:"required" required:"true"`
	Message string `json:"message"`
}

type DiagnosticLogsLink struct {
	UrlLink   string `json:"url_link"`
	Label     string `json:"label"`
	Message   string `json:"message"`
	CreatedAt string `json:"created_at"`
}

type GetDiagnosticLogsResponse struct {
	ConsoleLogs []DiagnosticLogsLink `json:"console_logs"`
	AgentLogs   []DiagnosticLogsLink `json:"agent_logs"`
}

func GetDiagnosticLogs(ctx context.Context) (*GetDiagnosticLogsResponse, error) {
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		return nil, err
	}
	diagnosticLogs := GetDiagnosticLogsResponse{
		ConsoleLogs: getDiagnosticLogsHelper(ctx, mc, ConsoleDiagnosisFileServerPrefix),
		AgentLogs:   getDiagnosticLogsHelper(ctx, mc, AgentDiagnosisFileServerPrefix),
	}
	return &diagnosticLogs, err
}

func getDiagnosticLogsHelper(ctx context.Context, mc directory.FileManager, pathPrefix string) []DiagnosticLogsLink {
	objects := mc.ListFiles(ctx, pathPrefix, false, 0, true)
	diagnosticLogsResponse := make([]DiagnosticLogsLink, len(objects))
	for i, obj := range objects {
		message := ""
		urlLink, err := mc.ExposeFile(ctx, obj.Key, false, DiagnosisLinkExpiry, url.Values{})
		if err != nil {
			message = err.Error()
		}
		diagnosticLogsResponse[i] = DiagnosticLogsLink{
			UrlLink:   urlLink,
			Label:     filepath.Base(obj.Key),
			Message:   message,
			CreatedAt: obj.LastModified.Format("2006-01-02 15:04:05"),
		}
	}
	return diagnosticLogsResponse
}

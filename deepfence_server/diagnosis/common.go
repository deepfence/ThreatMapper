package diagnosis

import (
	"context"
	"encoding/xml"
	"net/url"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	DiagnosisLinkExpiry              = 5 * time.Minute
	ConsoleDiagnosisFileServerPrefix = "diagnosis/console-diagnosis/"
	AgentDiagnosisFileServerPrefix   = "diagnosis/agent-diagnosis/"
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
	FileName  string `json:"-"`
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
		AgentLogs:   getAgentDiagnosticLogs(ctx, mc, AgentDiagnosisFileServerPrefix),
	}
	return &diagnosticLogs, err
}

func getDiagnosticLogsHelper(ctx context.Context, mc directory.FileManager, pathPrefix string) []DiagnosticLogsLink {
	// Get completed files from minio
	objects := mc.ListFiles(ctx, pathPrefix, false, 0, true)
	log.Debug().Msgf("diagnosis logs at %s: %v", pathPrefix, objects)
	diagnosticLogsResponse := make([]DiagnosticLogsLink, len(objects))
	for i, obj := range objects {
		message := ""
		urlLink, err := mc.ExposeFile(ctx, obj.Key, false, DiagnosisLinkExpiry, url.Values{})
		if err != nil {
			log.Error().Err(err).Msg("failed to list console diagnosis logs")
			var minioError utils.MinioError
			xmlErr := xml.Unmarshal([]byte(err.Error()), &minioError)
			if xmlErr != nil {
				message = err.Error()
			} else {
				message = minioError.Message
			}
		}
		fileName := filepath.Base(obj.Key)
		diagnosticLogsResponse[i] = DiagnosticLogsLink{
			UrlLink:   urlLink,
			FileName:  fileName,
			Label:     strings.TrimSuffix(strings.TrimPrefix(fileName, "deepfence-agent-logs-"), ".zip"),
			Message:   message,
			CreatedAt: obj.LastModified.Format("2006-01-02 15:04:05"),
		}
	}
	sort.Slice(diagnosticLogsResponse, func(i, j int) bool {
		return diagnosticLogsResponse[i].CreatedAt > diagnosticLogsResponse[j].CreatedAt
	})
	return diagnosticLogsResponse
}

func getAgentDiagnosticLogs(ctx context.Context, mc directory.FileManager, pathPrefix string) []DiagnosticLogsLink {
	diagnosticLogs := getDiagnosticLogsHelper(ctx, mc, AgentDiagnosisFileServerPrefix)
	minioAgentLogsKeys := make(map[string]int)
	for i, log := range diagnosticLogs {
		minioAgentLogsKeys[log.FileName] = i
	}

	// Get in progress ones from neo4j
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return diagnosticLogs
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return diagnosticLogs
	}
	defer session.Close()
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		return diagnosticLogs
	}
	defer tx.Close()

	r, err := tx.Run(`
		MATCH (n:AgentDiagnosticLogs)-[:SCHEDULEDLOGS]->(m)
		RETURN n.node_id, n.minio_file_name, n.message, n.status, n.updated_at, m.node_name`, map[string]interface{}{})
	if err != nil {
		return diagnosticLogs
	}

	nodeIdToName := make(map[string]string)
	records, err := r.Collect()
	if err != nil {
		log.Error().Msg(err.Error())
		return diagnosticLogs
	}
	for _, rec := range records {
		var nodeId, fileName, message, status, updatedAt, nodeName interface{}
		var ok bool
		if nodeId, ok = rec.Get("n.node_id"); !ok || nodeId == nil {
			nodeId = ""
		}
		if fileName, ok = rec.Get("n.minio_file_name"); !ok || fileName == nil {
			fileName = ""
		}
		if message, ok = rec.Get("n.message"); !ok || message == nil {
			message = ""
		}
		if status, ok = rec.Get("n.status"); !ok || status == nil {
			status = ""
		}
		if updatedAt, ok = rec.Get("n.updated_at"); !ok || updatedAt == nil {
			updatedAt = 0
		}
		if nodeName, ok = rec.Get("m.node_name"); !ok || nodeName == nil {
			nodeName = ""
		}
		updatedAtTime := time.UnixMilli(updatedAt.(int64))
		nodeIdToName[nodeId.(string)] = nodeName.(string)
		if message.(string) == "" && status.(string) != utils.SCAN_STATUS_SUCCESS {
			message = status.(string)
		}

		if pos, ok := minioAgentLogsKeys[fileName.(string)]; ok {
			diagnosticLogs[pos].Label = nodeName.(string)
			diagnosticLogs[pos].Message = message.(string)
		} else {
			diagnosticLogs = append(diagnosticLogs, DiagnosticLogsLink{
				UrlLink:   "",
				FileName:  fileName.(string),
				Label:     nodeName.(string),
				Message:   message.(string),
				CreatedAt: updatedAtTime.Format("2006-01-02 15:04:05"),
			})
		}
	}
	sort.Slice(diagnosticLogs, func(i, j int) bool {
		return diagnosticLogs[i].CreatedAt > diagnosticLogs[j].CreatedAt
	})
	return diagnosticLogs
}

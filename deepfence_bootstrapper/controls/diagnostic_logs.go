package controls

import (
	"context"
	"errors"
	"io"
	"net/http"
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/router"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/golang_deepfence_sdk/client"
)

func SendAgentDiagnosticLogs(req ctl.SendAgentDiagnosticLogsRequest, pathsToZip []string, excludePathPrefixes []string) error {
	httpsClient, err := router.NewClient()
	if err != nil {
		return err
	}
	ctx := context.Background()

	fileName := "/tmp/" + req.FileName
	err = utils.RecursiveZip(pathsToZip, excludePathPrefixes, fileName)
	if err != nil {
		_ = publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeID, utils.ScanStatusFailed, err.Error())
		return err
	}
	defer os.RemoveAll(fileName)

	resp, statusCode, err := utils.UploadFile(req.UploadURL, fileName)
	if err != nil {
		_ = publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeID, utils.ScanStatusFailed, err.Error())
		return err
	}
	if statusCode != http.StatusOK {
		_ = publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeID, utils.ScanStatusFailed, string(resp))
		return errors.New(string(resp))
	}

	return publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeID, utils.ScanStatusSuccess, "")
}

func publishDiagnosticLogsStatus(ctx context.Context, httpsClient *client.APIClient, nodeID string, status string, message string) error {
	httpReq := httpsClient.DiagnosisAPI.UpdateAgentDiagnosticLogsStatus(ctx, nodeID)
	httpReq = httpReq.DiagnosisDiagnosticLogsStatus(client.DiagnosisDiagnosticLogsStatus{
		Message: &message,
		Status:  status,
	})
	res, err := httpsClient.DiagnosisAPI.UpdateAgentDiagnosticLogsStatusExecute(httpReq)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusNoContent {
		defer res.Body.Close()
		body, err := io.ReadAll(res.Body)
		if err != nil {
			return err
		}
		return errors.New(string(body))
	}
	return nil
}

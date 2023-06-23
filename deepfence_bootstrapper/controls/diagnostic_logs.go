package controls

import (
	"context"
	"errors"
	"io"
	"net/http"
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/router"
	"github.com/deepfence/golang_deepfence_sdk/client"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
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
		publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeId, utils.SCAN_STATUS_FAILED, err.Error())
		return err
	}
	defer os.RemoveAll(fileName)

	resp, statusCode, err := utils.UploadFile(req.UploadURL, fileName)
	if err != nil {
		publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeId, utils.SCAN_STATUS_FAILED, err.Error())
		return err
	}
	if statusCode != http.StatusOK {
		publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeId, utils.SCAN_STATUS_FAILED, string(resp))
		return errors.New(string(resp))
	}

	return publishDiagnosticLogsStatus(ctx, httpsClient.Client(), req.NodeId, utils.SCAN_STATUS_SUCCESS, "")
}

func publishDiagnosticLogsStatus(ctx context.Context, httpsClient *client.APIClient, nodeId string, status string, message string) error {
	httpReq := httpsClient.DiagnosisAPI.UpdateAgentDiagnosticLogsStatus(ctx, nodeId)
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

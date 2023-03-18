package host

import (
	"errors"
	"net/http"

	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

func SendAgentDiagnosticLogs(req ctl.SendAgentDiagnosticLogsRequest) error {
	fileName := "/tmp/" + req.FileName
	err := utils.RecursiveZip(
		[]string{"/var/log/supervisor", "/var/log/fenced"},
		[]string{"/var/log/fenced/compliance/", "/var/log/fenced/malware-scan/", "/var/log/fenced/secret-scan/"},
		fileName,
	)
	if err != nil {
		return err
	}
	resp, statusCode, err := utils.UploadFile(req.UploadURL, fileName)
	if err != nil {
		return err
	}
	if statusCode != http.StatusOK {
		return errors.New(string(resp))
	}
	return nil
}

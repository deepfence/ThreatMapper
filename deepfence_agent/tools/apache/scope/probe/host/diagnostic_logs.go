package host

import (
	"fmt"
	"time"

	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/weaveworks/scope/common/hostname"
)

func SendAgentDiagnosticLogs(req ctl.SendAgentDiagnosticLogsRequest) error {
	err := utils.RecursiveZip(
		[]string{"/var/log/supervisor", "/var/log/fenced"},
		[]string{"/var/log/fenced/compliance/", "/var/log/fenced/malware-scan/", "/var/log/fenced/secret-scan/"},
		fmt.Sprintf("/tmp/deepfence-agent-%s-logs-%s.zip", hostname.Get(), time.Now().Format("2006-01-02-15-04-05")),
	)
	if err != nil {
		return err
	}
	return nil
}

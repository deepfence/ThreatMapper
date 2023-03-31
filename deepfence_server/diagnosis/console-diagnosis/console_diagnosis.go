package console_diagnosis

import (
	"context"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

const (
	DockerOrchestrator     = "docker"
	KubernetesOrchestrator = "kubernetes"
	HaproxyLogsPath        = "/var/log/haproxy"
)

type ConsoleDiagnosisHandler interface {
	GenerateDiagnosticLogs(ctx context.Context, tail string) error
}

func NewConsoleDiagnosisHandler(orchestrator string) (ConsoleDiagnosisHandler, error) {
	if orchestrator == DockerOrchestrator {
		return NewDockerConsoleDiagnosisHandler()
	} else if orchestrator == KubernetesOrchestrator {
		return NewKubernetesConsoleDiagnosisHandler()
	}
	log.Warn().Msgf("console diagnosis: orchestrator set to default %s", DockerOrchestrator)
	return NewDockerConsoleDiagnosisHandler()
}

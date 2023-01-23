package installer

import (
	"os/exec"

	"github.com/deepfence/deepfence_installer/agent"
)

type KubernetesInstaller struct {
	previous agent.AgentImage
	current  agent.AgentImage
}

func (ki *KubernetesInstaller) Delete() error {
	cmd := exec.Command("helm", "delete deepfence-agent")
	return cmd.Run()
}

func (ki *KubernetesInstaller) Install() error {
	cmd := exec.Command("helm", "install deepfence-agent")
	return cmd.Run()
}

func (ki *KubernetesInstaller) Save(agent.AgentImage) {
	//TODO
}

func (ki *KubernetesInstaller) Rollback() {
	//TODO
}

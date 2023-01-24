package installer

import (
	"os/exec"

	"github.com/deepfence/deepfence_installer/agent"
)

type KubernetesInstaller struct {
	previous agent.AgentImage
	current  agent.AgentImage
}

func NewKubernetesInstaller() *KubernetesInstaller {
	return &KubernetesInstaller{
		previous: agent.AgentImage{
			ImageName: "",
			ImageTag:  "",
		},
		current: agent.AgentImage{
			ImageName: "",
			ImageTag:  "",
		},
	}
}

func (ki *KubernetesInstaller) Delete() error {
	cmd := exec.Command("helm", "delete deepfence-agent")
	return cmd.Run()
}

func (ki *KubernetesInstaller) Install() error {
	cmd := exec.Command("helm", "install deepfence-agent")
	return cmd.Run()
}

func (ki *KubernetesInstaller) SaveNewConfig(agent.AgentImage) error {
	return nil
	//TODO
}

func (ki *KubernetesInstaller) RollBackConfig() {
	//TODO
}

package installer

import (
	"fmt"
	"os/exec"

	"github.com/deepfence/deepfence_installer/agent"
)

type KubernetesInstaller struct {
	previous  agent.AgentImage
	current   agent.AgentImage
	apikey    string
	consoleip string
}

func NewKubernetesInstaller(console_ip, api_token string) *KubernetesInstaller {
	return &KubernetesInstaller{
		previous: agent.AgentImage{
			ImageName: "",
			ImageTag:  "",
		},
		current: agent.AgentImage{
			ImageName: "",
			ImageTag:  "",
		},
		apikey:    api_token,
		consoleip: console_ip,
	}
}

func (ki *KubernetesInstaller) Delete() error {
	cmd := exec.Command("helm", "delete deepfence-agent")
	return cmd.Run()
}

func (ki *KubernetesInstaller) Install() error {
	cmd := exec.Command("helm", fmt.Sprintf(`install deepfence-agent
		--set image.tag=%s
		--set managementConsoleUrl=%s
		--set deepfenceKey=%s`, ki.previous.ImageTag, ki.consoleip, ki.apikey))
	return cmd.Run()
}

func (di *KubernetesInstaller) SaveNewConfig(new_conf agent.AgentImage) error {
	di.previous = di.current
	di.current = new_conf
	return nil
}

func (di *KubernetesInstaller) RollBackConfig() {
	di.current = di.previous
}

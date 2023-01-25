package installer

import (
	"fmt"
	"os/exec"

	"github.com/deepfence/deepfence_installer/agent"
)

type DockerInstaller struct {
	previous  agent.AgentImage
	current   agent.AgentImage
	apikey    string
	consoleip string
}

func NewDockerInstaller(console_ip, api_token string) *DockerInstaller {
	return &DockerInstaller{
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

func isAgentContainerPresent() bool {
	cmd := exec.Command("docker", "inspect deepfence-agent")
	err := cmd.Run()
	if exitError, ok := err.(*exec.ExitError); ok {
		return exitError.ExitCode() == 0
	}
	return false
}

func (di *DockerInstaller) Delete() error {
	if isAgentContainerPresent() {
		cmd := exec.Command("docker", "rm -v deepfence-agent")
		return cmd.Run()
	}
	return nil
}

func (di *DockerInstaller) Install() error {
	if di.current.ImageTag == "" {
		return nil
	}
	cmd := exec.Command("./start-agent.sh", fmt.Sprintf("-r %s", di.consoleip), fmt.Sprintf(`-k "%s"`, di.apikey))
	cmd.Env = []string{
		fmt.Sprintf("DF_IMG_TAG=%v", di.current.ImageTag),
	}
	return cmd.Run()
}

func (di *DockerInstaller) SaveNewConfig(new_conf agent.AgentImage) error {
	di.previous = di.current
	di.current = new_conf
	return nil
}

func (di *DockerInstaller) RollBackConfig() {
	di.current = di.previous
}

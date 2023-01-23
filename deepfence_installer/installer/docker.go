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

func (di *DockerInstaller) Delete() error {
	cmd := exec.Command("docker", "rm -v deepfence-agent")
	return cmd.Run()
}

func (di *DockerInstaller) Install() error {
	cmd := exec.Command("./start-agent.sh", fmt.Sprintf("-r %v", di.apikey), fmt.Sprintf("-k %v", di.consoleip))
	cmd.Env = []string{
		fmt.Sprintf("DF_IMG_TAG=%v", di.current.ImageTag),
		fmt.Sprintf("IMAGE_REPOSITORY=%v", di.current.ImageName),
	}
	return cmd.Run()
}

func (di *DockerInstaller) Save(agent.AgentImage) {
	//TODO
}

func (di *DockerInstaller) Rollback() {
	//TODO
}

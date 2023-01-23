package installer

import "github.com/deepfence/deepfence_installer/agent"

type Installer interface {
	Delete() error
	Install() error
	Save(agent.AgentImage)
	RollBack()
}

package installer

import "github.com/deepfence/deepfence_installer/agent"

type Installer interface {
	Delete() error
	Install() error
	SaveNewConfig(agent.AgentImage) error
	RollBackConfig()
}

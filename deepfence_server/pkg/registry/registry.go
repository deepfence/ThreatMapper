package registry

import "github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/dockerhub"

func GetRegistry(name string) Registry {
	var r Registry
	if name == "docker" {
		r = dockerhub.New()
	}
	return r
}

// Registry is the interface for all the supported registries
type Registry interface {
	IsValidCredential() bool
}

package registry

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/dockerhub"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/pkg/errors"
)

func GetRegistry(rType string, requestByte []byte) (Registry, error) {
	var r Registry
	err := errors.Errorf("registry type: %s, not supported", rType)
	// todo: move to constants
	if rType == "docker_hub" {
		r, err = dockerhub.New(requestByte)
	}
	return r, err
}

// Registry is the interface for all the supported registries
type Registry interface {
	IsValidCredential() bool
	EncryptSecret(aes encryption.AES) error
	DecryptSecret(aes encryption.AES) error
	GetSecret() map[string]interface{}
}

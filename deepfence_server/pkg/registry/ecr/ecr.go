package ecr

import (
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"github.com/go-playground/validator/v10"
)

func New(requestByte []byte) (*RegistryECR, error) {
	r := RegistryECR{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (d *RegistryECR) ValidateFields(v *validator.Validate) error {
	return v.Struct(d)
}

func (e *RegistryECR) IsValidCredential() bool {
	return true
}

func (e *RegistryECR) EncryptSecret(aes encryption.AES) error {
	var err error
	e.Secret.AWSSecretAccessKey, err = aes.Encrypt(e.Secret.AWSSecretAccessKey)
	return err
}

func (e *RegistryECR) DecryptSecret(aes encryption.AES) error {
	var err error
	e.Secret.AWSSecretAccessKey, err = aes.Decrypt(e.Secret.AWSSecretAccessKey)
	return err
}

func (e *RegistryECR) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (e *RegistryECR) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (e *RegistryECR) FetchImagesFromRegistry() ([]model.IngestedContainerImage, error) {
	// based on iamrole we need to fetch images
	if e.NonSecret.UseIAMRole == "true" {
		return listImagesCrossAccount(e.NonSecret.AWSRegionName, e.NonSecret.AWSAccountID, e.NonSecret.TargetAccountRoleARN)
	}
	return listImages(e.NonSecret.AWSAccessKeyID, e.Secret.AWSSecretAccessKey, e.NonSecret.AWSRegionName)
}

// getters
func (e *RegistryECR) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, _ := json.Marshal(e.Secret)
	json.Unmarshal(b, &secret)
	return secret
}

func (e *RegistryECR) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (e *RegistryECR) GetNamespace() string {
	if e.NonSecret.IsPublic == "true" {
		if e.NonSecret.UseIAMRole == "true" {
			return e.NonSecret.AWSAccountID
		}
		return e.NonSecret.AWSAccessKeyID
	} else {
		if e.NonSecret.UseIAMRole == "true" {
			return e.NonSecret.AWSRegionName + "_" + e.NonSecret.AWSAccountID
		}
	}
	return e.NonSecret.AWSRegionName + "_" + e.NonSecret.AWSAccessKeyID
}

func (e *RegistryECR) GetRegistryType() string {
	return e.RegistryType
}

func (e *RegistryECR) GetUsername() string {
	return ""
}

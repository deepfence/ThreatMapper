package ecr

import (
	"encoding/json"
	"errors"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog/log"
)

var (
	errAccessKeyMissing     = errors.New("access key and secret key are required")
	errPublicRegistryRegion = errors.New("region should be set to " + publicRegistryRegion + " for public registry")
)

func New(requestByte []byte) (*RegistryECR, error) {
	r := RegistryECR{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (e *RegistryECR) ValidateFields(v *validator.Validate) error {
	if e.NonSecret.IsPublic == trueStr {
		if e.NonSecret.AWSRegionName != publicRegistryRegion {
			return errPublicRegistryRegion
		}
	}
	if e.NonSecret.UseIAMRole == trueStr {
		// IAM role based authentication
		return v.Struct(e)
	} else {
		// Key based authentication
		if e.NonSecret.AWSAccessKeyID == "" || e.Secret.AWSSecretAccessKey == "" {
			return errAccessKeyMissing
		}
		return v.Struct(e)
	}
}

func (e *RegistryECR) IsValidCredential() bool {
	if e.NonSecret.UseIAMRole == trueStr {
		sess, err := session.NewSession(&aws.Config{
			Region: aws.String(e.NonSecret.AWSRegionName),
		})
		if err != nil {
			log.Error().Msgf("failed to authenticate: %v", err)
			return false
		}
		awsConfig := aws.Config{
			Region: aws.String(e.NonSecret.AWSRegionName),
		}
		if e.NonSecret.TargetAccountRoleARN != "" {
			if e.NonSecret.AWSAccountID == "" {
				return false
			}
			creds := stscreds.NewCredentials(sess, e.NonSecret.TargetAccountRoleARN)
			awsConfig.Credentials = creds
		}
		if e.NonSecret.IsPublic == trueStr {
			_, err = listIAMPublicImages(sess, awsConfig, e.NonSecret.AWSAccountID)
			if err != nil {
				log.Error().Msgf("failed to authenticate: %v", err)
				return false
			}
		} else {
			_, err = listIAMPublicImages(sess, awsConfig, e.NonSecret.AWSAccountID)
			if err != nil {
				log.Error().Msgf("failed to authenticate: %v", err)
				return false
			}
		}
		return true
	} else {
		sess, err := session.NewSession(&aws.Config{
			Region:      aws.String(e.NonSecret.AWSRegionName),
			Credentials: credentials.NewStaticCredentials(e.NonSecret.AWSAccessKeyID, e.Secret.AWSSecretAccessKey, ""),
		})
		if err != nil {
			log.Error().Msgf("failed to authenticate: %v", err)
			return false
		}
		if e.NonSecret.IsPublic == trueStr {
			_, err = listNonIAMPublicImages(sess, e.NonSecret.AWSAccountID)
			if err != nil {
				log.Error().Msgf("failed to authenticate: %v", err)
				return false
			}
		} else {
			_, err = listNonIAMPublicImages(sess, e.NonSecret.AWSAccountID)
			if err != nil {
				log.Error().Msgf("failed to authenticate: %v", err)
				return false
			}
		}
		return true
	}
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
	if e.NonSecret.UseIAMRole == trueStr {
		return listIAMImages(e.NonSecret.AWSRegionName, e.NonSecret.AWSAccountID, e.NonSecret.TargetAccountRoleARN, e.NonSecret.IsPublic == trueStr)
	}
	return listNonIAMImages(e.NonSecret.AWSAccessKeyID, e.Secret.AWSSecretAccessKey, e.NonSecret.AWSAccountID, e.NonSecret.AWSRegionName, e.NonSecret.IsPublic == trueStr)
}

// getters
func (e *RegistryECR) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, err := json.Marshal(e.Secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(b, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	return secret
}

func (e *RegistryECR) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (e *RegistryECR) GetNamespace() string {
	if e.NonSecret.IsPublic == trueStr {
		if e.NonSecret.UseIAMRole == trueStr {
			return e.NonSecret.AWSAccountID
		}
		return e.NonSecret.AWSAccessKeyID
	} else if e.NonSecret.UseIAMRole == trueStr {
		return e.NonSecret.AWSRegionName + "_" + e.NonSecret.AWSAccountID
	}
	return e.NonSecret.AWSRegionName + "_" + e.NonSecret.AWSAccessKeyID
}

func (e *RegistryECR) GetRegistryType() string {
	return e.RegistryType
}

func (e *RegistryECR) GetUsername() string {
	return ""
}

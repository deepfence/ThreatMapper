package utils

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/acr"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/dockerhub"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/dockerprivate"
	registryECR "github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/ecr"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/gcr"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/gitlab"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/harbor"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/jfrog"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/quay"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/package-scanner/utils"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecr"
)

type regCreds struct {
	URL           string
	UserName      string
	Password      string
	NameSpace     string
	ImagePrefix   string
	SkipTLSVerify bool
	UseHttp       bool
}

func useHttp(url string) bool {
	return !strings.HasPrefix(url, "https://")
}

func GetConfigFileFromRegistry(ctx context.Context, registryId string) (string, regCreds, error) {
	rc, err := GetCredentialsFromRegistry(ctx, registryId)
	if err != nil {
		return "", regCreds{}, err
	}
	if rc.UserName == "" {
		return "", rc, nil
	}
	authFile, err := createAuthFile(registryId, rc.URL, rc.UserName, rc.Password)
	if err != nil {
		return "", rc, fmt.Errorf("unable to create credential file for docker")
	}
	return authFile, rc, nil
}

func GetCredentialsFromRegistry(ctx context.Context, registryId string) (regCreds, error) {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf(err.Error())
		return regCreds{}, err
	}

	i, err := strconv.ParseInt(registryId, 10, 64)
	if err != nil {
		log.Error().Msgf(err.Error())
		return regCreds{}, err
	}

	reg, err := pgClient.GetContainerRegistry(ctx, int32(i))
	if err != nil {
		log.Error().Msgf(err.Error())
		return regCreds{}, err
	}

	key, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		return regCreds{}, err
	}
	aes := encryption.AES{}
	err = json.Unmarshal(key, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		return regCreds{}, err
	}

	switch reg.RegistryType {
	case constants.DOCKER_HUB:
		return dockerHubCreds(reg, aes)
	case constants.QUAY:
		return quayCreds(reg, aes)
	case constants.GCR:
		return gcrCreds(reg, aes)
	case constants.ACR:
		return acrCreds(reg, aes)
	case constants.HARBOR:
		return harborCreds(reg, aes)
	case constants.DOCKER_PRIVATE:
		return dockerprivateCreds(reg, aes)
	case constants.JFROG:
		return jfrogCreds(reg, aes)
	case constants.ECR:
		return ecrCreds(reg, aes)
	case constants.GITLAB:
		return gitlabCreds(reg, aes)
	default:
		return regCreds{}, nil
	}
}

func gitlabCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       gitlab.RegistryGitlab
		nonsecret gitlab.NonSecret
		secret    gitlab.Secret
	)

	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	hub = gitlab.RegistryGitlab{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	return regCreds{
		URL:           hub.NonSecret.GitlabRegistryURL,
		UserName:      "gitlab-ci-token",
		Password:      hub.Secret.GitlabToken,
		NameSpace:     "",
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.GitlabRegistryURL),
		SkipTLSVerify: false,
		UseHttp:       useHttp(hub.NonSecret.GitlabRegistryURL),
	}, nil

}
func ecrCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       registryECR.RegistryECR
		nonsecret registryECR.NonSecret
		secret    registryECR.Secret
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	hub = registryECR.RegistryECR{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	var awsConfig aws.Config
	var svc *ecr.ECR
	var creds *credentials.Credentials

	if hub.NonSecret.UseIAMRole == "false" {
		awsConfig.WithCredentials(credentials.NewStaticCredentials(hub.NonSecret.AWSAccessKeyID, hub.Secret.AWSSecretAccessKey, ""))
	}
	mySession := session.Must(session.NewSession(&awsConfig))

	if hub.NonSecret.UseIAMRole == "true" {
		creds = stscreds.NewCredentials(mySession, hub.NonSecret.TargetAccountRoleARN)
		svc = ecr.New(mySession, &aws.Config{
			Credentials: creds,
			Region:      aws.String(hub.NonSecret.AWSRegionName),
		})
	} else {
		svc = ecr.New(mySession, aws.NewConfig().WithRegion(hub.NonSecret.AWSRegionName))
	}

	var authorizationTokenRequestInput ecr.GetAuthorizationTokenInput
	if hub.NonSecret.AWSAccountID != "" {
		authorizationTokenRequestInput.SetRegistryIds([]*string{aws.String(hub.NonSecret.AWSAccountID)})
	}
	authorizationTokenResponse, err := svc.GetAuthorizationToken(&authorizationTokenRequestInput)
	if err != nil {
		return regCreds{}, err
	}
	authorizationData := authorizationTokenResponse.AuthorizationData
	if len(authorizationData) == 0 {
		return regCreds{}, errors.New("no authorization data found")
	}
	authData := *authorizationData[0]
	return regCreds{
		URL:           *authData.ProxyEndpoint,
		UserName:      *authData.AuthorizationToken,
		Password:      "",
		NameSpace:     "",
		ImagePrefix:   "",
		SkipTLSVerify: false,
		UseHttp:       useHttp(*authData.ProxyEndpoint),
	}, nil
}

func dockerHubCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       dockerhub.RegistryDockerHub
		nonsecret dockerhub.NonSecret
		secret    dockerhub.Secret
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	hub = dockerhub.RegistryDockerHub{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	return regCreds{
		URL:           "https://index.docker.io/v1/",
		UserName:      hub.NonSecret.DockerHubUsername,
		Password:      hub.Secret.DockerHubPassword,
		NameSpace:     hub.NonSecret.DockerHubNamespace,
		ImagePrefix:   hub.NonSecret.DockerHubNamespace,
		SkipTLSVerify: false,
		UseHttp:       false,
	}, nil
}

func quayCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       quay.RegistryQuay
		nonsecret quay.NonSecret
		secret    quay.Secret
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	hub = quay.RegistryQuay{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	return regCreds{
		URL:           hub.NonSecret.QuayRegistryURL,
		UserName:      "$oauthtoken",
		Password:      hub.Secret.QuayAccessToken,
		NameSpace:     hub.NonSecret.QuayNamespace,
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.QuayRegistryURL) + "/" + hub.NonSecret.QuayNamespace,
		SkipTLSVerify: false,
		UseHttp:       useHttp(hub.NonSecret.QuayRegistryURL),
	}, nil
}

func gcrCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       gcr.RegistryGCR
		nonsecret gcr.NonSecret
		secret    gcr.Secret
		extras    gcr.Extras
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.Extras, &extras)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	hub = gcr.RegistryGCR{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
		Extras:    extras,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	err = hub.DecryptExtras(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	return regCreds{
		URL:           hub.NonSecret.RegistryURL,
		UserName:      "_json_key",
		Password:      hub.Extras.ServiceAccountJson,
		NameSpace:     hub.NonSecret.ProjectId,
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.RegistryURL),
		SkipTLSVerify: false,
		UseHttp:       useHttp(hub.NonSecret.RegistryURL),
	}, nil
}

func acrCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       acr.RegistryACR
		nonsecret acr.NonSecret
		secret    acr.Secret
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	hub = acr.RegistryACR{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	return regCreds{
		URL:           hub.NonSecret.AzureRegistryURL,
		UserName:      hub.NonSecret.AzureRegistryUsername,
		Password:      hub.Secret.AzureRegistryPassword,
		NameSpace:     "",
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.AzureRegistryURL),
		SkipTLSVerify: false,
		UseHttp:       useHttp(hub.NonSecret.AzureRegistryURL),
	}, nil
}

func harborCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       harbor.RegistryHarbor
		nonsecret harbor.NonSecret
		secret    harbor.Secret
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	hub = harbor.RegistryHarbor{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	return regCreds{
		URL:           hub.NonSecret.HarborRegistryURL,
		UserName:      hub.NonSecret.HarborUsername,
		Password:      hub.Secret.HarborPassword,
		NameSpace:     "",
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.HarborRegistryURL),
		SkipTLSVerify: true,
		UseHttp:       useHttp(hub.NonSecret.HarborRegistryURL),
	}, nil
}

func dockerprivateCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       dockerprivate.RegistryDockerPrivate
		nonsecret dockerprivate.NonSecret
		secret    dockerprivate.Secret
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	hub = dockerprivate.RegistryDockerPrivate{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	return regCreds{
		URL:           hub.NonSecret.DockerRegistryURL,
		UserName:      hub.NonSecret.DockerUsername,
		Password:      hub.Secret.DockerPassword,
		NameSpace:     "",
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.DockerRegistryURL),
		SkipTLSVerify: true,
		UseHttp:       useHttp(hub.NonSecret.DockerRegistryURL),
	}, nil
}

func jfrogCreds(reg postgresql_db.GetContainerRegistryRow, aes encryption.AES) (regCreds, error) {
	var (
		err       error
		hub       jfrog.RegistryJfrog
		nonsecret jfrog.NonSecret
		secret    jfrog.Secret
	)
	err = json.Unmarshal(reg.NonSecret, &nonsecret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(reg.EncryptedSecret, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	hub = jfrog.RegistryJfrog{
		Name:      reg.Name,
		Secret:    secret,
		NonSecret: nonsecret,
	}

	err = hub.DecryptSecret(aes)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	return regCreds{
		URL:           hub.NonSecret.JfrogRegistryURL,
		UserName:      hub.NonSecret.JfrogUsername,
		Password:      hub.Secret.JfrogPassword,
		NameSpace:     hub.NonSecret.JfrogRepository,
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.JfrogRegistryURL) + "/" + hub.NonSecret.JfrogRepository,
		SkipTLSVerify: true,
		UseHttp:       useHttp(hub.NonSecret.JfrogRegistryURL),
	}, nil
}

// todo: unused
func GetDockerCredentials(registryData map[string]interface{}) (string, string, string) {
	var registryType string
	registryType, ok := registryData["registry_type"].(string)
	if !ok {
		return "", "", ""
	}
	switch registryType {
	case "ecr":
		var awsAccessKey, awsSecret, awsRegionName, registryId, targetAccountRoleARN string
		var useIAMRole bool
		if awsAccessKey, ok = registryData["aws_access_key_id"].(string); !ok {
			awsAccessKey = ""
		}
		if awsSecret, ok = registryData["aws_secret_access_key"].(string); !ok {
			awsSecret = ""
		}
		if awsRegionName, ok = registryData["aws_region_name"].(string); !ok {
			return "", "", ""
		}
		if registryId, ok = registryData["registry_id"].(string); !ok {
			registryId = ""
		}
		if useIAMRole, ok = registryData["use_iam_role"].(bool); !ok {
			useIAMRole = false
		}
		if targetAccountRoleARN, ok = registryData["target_account_role_arn"].(string); !ok {
			targetAccountRoleARN = ""
		}
		ecrProxyUrl, ecrAuth := getEcrCredentials(awsAccessKey, awsSecret, awsRegionName, registryId, useIAMRole, targetAccountRoleARN)
		return ecrProxyUrl, ecrAuth, ""
	case "docker_hub":
		var dockerUsername, dockerPassword string
		if dockerUsername, ok = registryData["docker_hub_username"].(string); !ok {
			return "", "", ""
		}
		if dockerPassword, ok = registryData["docker_hub_password"].(string); !ok {
			return "", "", ""
		}
		return "https://index.docker.io/v1/", dockerUsername, dockerPassword
	case "docker_private_registry":
		return getDefaultDockerCredentials(registryData, "docker_registry_url", "docker_username", "docker_password")
	case "azure_container_registry":
		return getDefaultDockerCredentials(registryData, "azure_registry_url", "azure_registry_username", "azure_registry_password")
	case "google_container_registry":
		var dockerPassword, registryUrl string
		if dockerPassword, ok = registryData["service_account_json"].(string); !ok {
			return "", "", ""
		}
		if registryUrl, ok = registryData["registry_hostname"].(string); !ok {
			return "", "", ""
		}
		return registryUrl, "_json_key", dockerPassword
	case "harbor":
		return getDefaultDockerCredentials(registryData, "harbor_registry_url", "harbor_username", "harbor_password")
	case "quay":
		var dockerPassword, registryUrl string
		if dockerPassword, ok = registryData["quay_access_token"].(string); !ok {
			return "", "", ""
		}
		if registryUrl, ok = registryData["quay_registry_url"].(string); !ok {
			return "", "", ""
		}
		return registryUrl, "$oauthtoken", dockerPassword
	case "gitlab":
		var dockerPassword, registryUrl string
		if dockerPassword, ok = registryData["gitlab_access_token"].(string); !ok {
			return "", "", ""
		}
		if registryUrl, ok = registryData["gitlab_registry_url"].(string); !ok {
			return "", "", ""
		}
		return registryUrl, "gitlab-ci-token", dockerPassword
	case "jfrog_container_registry":
		return getDefaultDockerCredentials(registryData, "jfrog_registry_url", "jfrog_username", "jfrog_password")
	default:
		return "", "", ""
	}
}

// todo: remove this!!!
func getDefaultDockerCredentials(registryData map[string]interface{}, registryUrlKey, registryUsernameKey, registryPasswordKey string) (string, string, string) {
	var dockerUsername, dockerPassword, dockerRegistryUrl string
	var ok bool
	if dockerUsername, ok = registryData[registryUsernameKey].(string); !ok {
		return "", "", ""
	}
	if dockerPassword, ok = registryData[registryPasswordKey].(string); !ok {
		return "", "", ""
	}
	if dockerRegistryUrl, ok = registryData[registryUrlKey].(string); !ok {
		return "", "", ""
	}
	return dockerRegistryUrl, dockerUsername, dockerPassword
}

func createAuthFile(registryId, registryUrl, username, password string) (string, error) {
	authFilePath := "/tmp/auth_" + registryId + "_" + utils.RandomString(12)
	if _, err := os.Stat(authFilePath); errors.Is(err, os.ErrNotExist) {
		err := os.MkdirAll(authFilePath, os.ModePerm)
		if err != nil {
			return "", err
		}
	}
	if password == "" {
		configJson := []byte("{\"auths\": {\"" + registryUrl + "\": {\"auth\": \"" + strings.ReplaceAll(username, "\"", "\\\"") + "\"} } }")
		err := os.WriteFile(authFilePath+"/config.json", configJson, 0644)
		if err != nil {
			return "", err
		}
	} else {
		configJson := []byte("{\"auths\": {\"" + registryUrl + "\": {\"auth\": \"" + base64.StdEncoding.EncodeToString([]byte(username+":"+password)) + "\"} } }")
		err := os.WriteFile(authFilePath+"/config.json", configJson, 0644)
		if err != nil {
			return "", err
		}
	}
	return authFilePath, nil
}

func getEcrCredentials(awsAccessKey, awsSecret, awsRegionName, registryId string, useIAMRole bool, targetAccountRoleARN string) (string, string) {
	var awsConfig aws.Config
	var svc *ecr.ECR
	var creds *credentials.Credentials

	if !useIAMRole {
		awsConfig.WithCredentials(credentials.NewStaticCredentials(awsAccessKey, awsSecret, ""))
	}
	mySession := session.Must(session.NewSession(&awsConfig))

	if useIAMRole {
		creds = stscreds.NewCredentials(mySession, targetAccountRoleARN)
		svc = ecr.New(mySession, &aws.Config{
			Credentials: creds,
			Region:      &awsRegionName,
		})
	} else {
		svc = ecr.New(mySession, aws.NewConfig().WithRegion(awsRegionName))
	}

	var authorizationTokenRequestInput ecr.GetAuthorizationTokenInput
	if registryId != "" {
		authorizationTokenRequestInput.SetRegistryIds([]*string{&registryId})
	}
	authorizationTokenResponse, err := svc.GetAuthorizationToken(&authorizationTokenRequestInput)
	if err != nil {
		return "", ""
	}
	authorizationData := authorizationTokenResponse.AuthorizationData
	if len(authorizationData) == 0 {
		return "", ""
	}
	authData := *authorizationData[0]
	return *authData.ProxyEndpoint, *authData.AuthorizationToken
}

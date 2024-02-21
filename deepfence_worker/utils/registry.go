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
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/package-scanner/utils"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecr"
)

const (
	quayUsername = "$oauthtoken"
	gcrUsername  = "_json_key"
)

type regCreds struct {
	URL           string
	UserName      string
	Password      string
	NameSpace     string
	ImagePrefix   string
	SkipTLSVerify bool
	UseHTTP       bool
	IsRegistry    bool
}

func useHTTP(url string) bool {
	return !strings.HasPrefix(url, "https://")
}

func GetConfigFileFromRegistry(ctx context.Context, registryID string) (string, regCreds, error) {
	ctx, span := telemetry.NewSpan(ctx, "scans", "get-registry-config")
	defer span.End()

	rc, err := GetCredentialsFromRegistry(ctx, registryID)
	if err != nil {
		return "", regCreds{}, err
	}
	if rc.UserName == "" {
		return "", rc, nil
	}
	if rc.UserName == "" && rc.Password == "" {
		return "", rc, nil
	}
	authFile, err := createAuthFile(registryID, rc.URL, rc.UserName, rc.Password)
	if err != nil {
		return "", rc, fmt.Errorf("unable to create credential file for docker")
	}
	return authFile, rc, nil
}

func GetCredentialsFromRegistry(ctx context.Context, registryID string) (regCreds, error) {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "scans", "get-registry-credentials")
	defer span.End()

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf(err.Error())
		return regCreds{}, err
	}

	i, err := strconv.ParseInt(registryID, 10, 64)
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
	case constants.DockerHub:
		return dockerHubCreds(reg, aes)
	case constants.Quay:
		return quayCreds(reg, aes)
	case constants.GCR:
		return gcrCreds(reg, aes)
	case constants.ACR:
		return acrCreds(reg, aes)
	case constants.Harbor:
		return harborCreds(reg, aes)
	case constants.DockerPrivate:
		return dockerprivateCreds(reg, aes)
	case constants.Jfrog:
		return jfrogCreds(reg, aes)
	case constants.ECR:
		return ecrCreds(reg, aes)
	case constants.Gitlab:
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

	imagePrefix, _, _ := strings.Cut(httpReplacer.Replace(hub.NonSecret.GitlabRegistryURL), "/")
	return regCreds{
		URL:           hub.NonSecret.GitlabRegistryURL,
		UserName:      "gitlab-ci-token",
		Password:      hub.Secret.GitlabToken,
		NameSpace:     "",
		ImagePrefix:   imagePrefix,
		SkipTLSVerify: true,
		UseHTTP:       useHTTP(hub.NonSecret.GitlabRegistryURL),
		IsRegistry:    true,
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

	if hub.NonSecret.UseIAMRole == "true" && len(hub.NonSecret.TargetAccountRoleARN) > 0 {
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
		UseHTTP:       useHTTP(*authData.ProxyEndpoint),
		IsRegistry:    true,
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
		UseHTTP:       false,
		IsRegistry:    true,
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

	quayUser := quayUsername
	if hub.Secret.QuayAccessToken == "" {
		quayUser = ""
	}

	return regCreds{
		URL:           hub.NonSecret.QuayRegistryURL,
		UserName:      quayUser,
		Password:      hub.Secret.QuayAccessToken,
		NameSpace:     hub.NonSecret.QuayNamespace,
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.QuayRegistryURL) + "/" + hub.NonSecret.QuayNamespace,
		SkipTLSVerify: true,
		UseHTTP:       useHTTP(hub.NonSecret.QuayRegistryURL),
		IsRegistry:    true,
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
		UserName:      gcrUsername,
		Password:      hub.Extras.ServiceAccountJSON,
		NameSpace:     hub.NonSecret.ProjectID,
		ImagePrefix:   httpReplacer.Replace(hub.NonSecret.RegistryURL),
		SkipTLSVerify: false,
		UseHTTP:       useHTTP(hub.NonSecret.RegistryURL),
		IsRegistry:    true,
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
		UseHTTP:       useHTTP(hub.NonSecret.AzureRegistryURL),
		IsRegistry:    true,
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
		UseHTTP:       useHTTP(hub.NonSecret.HarborRegistryURL),
		IsRegistry:    true,
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
		UseHTTP:       useHTTP(hub.NonSecret.DockerRegistryURL),
		IsRegistry:    true,
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
		UseHTTP:       useHTTP(hub.NonSecret.JfrogRegistryURL),
		IsRegistry:    true,
	}, nil
}

func createAuthFile(registryID, registryURL, username, password string) (string, error) {
	authFilePath := "/tmp/auth_" + registryID + "_" + utils.RandomString(12)
	if _, err := os.Stat(authFilePath); errors.Is(err, os.ErrNotExist) {
		err := os.MkdirAll(authFilePath, os.ModePerm)
		if err != nil {
			return "", err
		}
	}
	if password == "" {
		configJSON := []byte("{\"auths\": {\"" + registryURL + "\": {\"auth\": \"" + strings.ReplaceAll(username, "\"", "\\\"") + "\"} } }")
		err := os.WriteFile(authFilePath+"/config.json", configJSON, 0644)
		if err != nil {
			return "", err
		}
	} else {
		configJSON := []byte("{\"auths\": {\"" + registryURL + "\": {\"auth\": \"" + base64.StdEncoding.EncodeToString([]byte(username+":"+password)) + "\"} } }")
		err := os.WriteFile(authFilePath+"/config.json", configJSON, 0644)
		if err != nil {
			return "", err
		}
	}
	return authFilePath, nil
}

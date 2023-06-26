package model

import (
	"strings"
	"unicode"

	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-playground/validator/v10"
)

func ValidateUserName(fl validator.FieldLevel) bool {
	return UserNameRegex.MatchString(fl.Field().String())
}

func ValidateCompanyName(fl validator.FieldLevel) bool {
	return CompanyRegex.MatchString(fl.Field().String())
}

func ValidatePassword(fl validator.FieldLevel) bool {
	var (
		isUpper       bool
		isLower       bool
		isSpecialChar bool
		isDigit       bool
	)
	for _, char := range fl.Field().String() {
		switch {
		case unicode.IsUpper(char):
			isUpper = true
		case unicode.IsLower(char):
			isLower = true
		case unicode.IsNumber(char):
			isDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			isSpecialChar = true
		default:
			return false
		}
	}
	if !isUpper || !isLower || !isSpecialChar || !isDigit {
		return false
	}
	return true
}

var (
	ErrorMessage = map[string]string{
		"UserRegisterRequest.FirstName": "should only contain alphabets, numbers, space and hyphen",
		"UserRegisterRequest.LastName":  "should only contain alphabets, numbers, space and hyphen",
		"UserRegisterRequest.Company":   "should only contain alphabets, numbers and valid characters",
		"UserRegisterRequest.Password":  "should contain at least one upper case, lower case, digit and special character",

		"UpdateUserPasswordRequest.OldPassword": "incorrect old password",
		"UpdateUserPasswordRequest.NewPassword": "should contain at least one upper case, lower case, digit and special character",

		"LoginRequest.Password": "incorrect password",

		"RegisterInvitedUserRequest.Password": "should contain at least one upper case, lower case, digit and special character",

		"PasswordResetVerifyRequest.Password": "should contain at least one upper case, lower case, digit and special character",

		"RegistryDockerHub.Name":                            "should only contain alphabets, numbers, space and hyphen",
		"RegistryDockerHub.NonSecret.DockerHubUsername":     "should only contain alphabets, numbers, space and hyphen",
		"RegistryDockerHub.Secret.DockerHubPassword":        "should only contain alphabets, numbers, space and hyphen",
		"RegistryDockerPrivate.Name":                        "should only contain alphabets, numbers, space and hyphen",
		"RegistryDockerPrivate.NonSecret.DockerRegistryURL": "invalid docker registry url",
		"RegistryDockerPrivate.NonSecret.DockerUsername":    "should only contain alphabets, numbers, space and hyphen",
		"RegistryACR.Name":                                  "invalid name",
		"RegistryACR.NonSecret.AzureRegistryURL":            "invalid azure registry url",
		"RegistryACR.NonSecret.AzureRegistryUsername":       "invalid azure registry username",
		"RegistryECR.Name":                                  "should only contain alphabets, numbers, space and hyphen",
		"RegistryECR.NonSecret.UseIAMRole":                  "invalid use iam role",
		"RegistryECR.NonSecret.IsPublic":                    "invalid is public",
		"RegistryGitlab.Name":                               "should only contain alphabets, numbers, space and hyphen",
		"RegistryGitlab.NonSecret.GitlabRegistryURL":        "invalid gitlab registry url",
		"RegistryGitlab.NonSecret.GitlabServerURL":          "invalid gitlab server url",
		"RegistryHarbor.Name":                               "should only contain alphabets, numbers, space and hyphen",
		"RegistryHarbor.NonSecret.HarborRegistryURL":        "invalid harbor registry url",
		"RegistryHarbor.NonSecret.HarborUsername":           "invalid harbor username",
		"RegistryHarbor.Secret.HarborProjectName":           "invalid harbor project name",
		"RegistryQuay.Name":                                 "should only contain alphabets, numbers, space and hyphen",
		"RegistryQuay.NonSecret.QuayRegistryURL":            "invalid quay registry url",
		"RegistryQuay.NonSecret.QuayNamespace":              "invalid quay namespace",
		"RegistryJfrog.Name":                                "should only contain alphabets, numbers, space and hyphen",
		"RegistryJfrog.NonSecret.JfrogRegistryURL":          "invalid jfrog registry url",
		"RegistryJfrog.NonSecret.JfrogUsername":             "invalid jfrog username",
		"RegistryJfrog.NonSecret.JfrogProjectName":          "invalid jfrog project name",
		"RegistryGCR.Name":                                  "should only contain alphabets, numbers, space and hyphen",
		"RegistryGCR.NonSecret.RegistryURL":                 "invalid gcr registry url",
		"RegistryGCR.NonSecret.ProjectID":                   "invalid project id",
		"RegistryGCR.Secret.ProjectID":                      "invalid project id",
		"RegistryGCR.Secret.ProjectKeyId":                   "invalid project key id",

		"api_token": "api_token must be UUID",
		"email":     "invalid email address",

		"Config.AWSAccountId":   "invalid account id",
		"Config.AWSAccessKey":   "invalid access key",
		"Config.AWSSecretKey":   "invalid secret key",
		"Config.AWSRegion":      "invalid region",
		"Config.EndpointURL":    "invalid url",
		"Config.AuthHeader":     "invalid auth header value",
		"Config.Index":          "invalid",
		"Config.EmailId":        "invalid email id",
		"Config.URL":            "invalid url",
		"Config.AuthKey":        "invalid auth header value",
		"Config.JiraSiteUrl":    "invalid jira url",
		"Config.Username":       "invalid",
		"Config.Password":       "invalid",
		"Config.JiraProjectKey": "invalid",
		"Config.JiraAssignee":   "invalid",
		"Config.IssueType":      "invalid",
		"Config.IsAuthToken":    "invalid",
		"Config.APIToken":       "invalid",
		"Config.ServiceKey":     "invalid",
		"Config.APIKey":         "invalid",
		"Config.S3BucketName":   "invalid bucket name",
		"Config.S3FolderName":   "invalid folder name",
		"Config.WebhookURL":     "invalid webhook url",
		"Config.Channel":        "invalid",
		"Config.Token":          "invalid",
		"Config.HTTPEndpoint":   "invalid url",
	}
)

func ParseValidatorError(errMsg string, skipOverwriteErrorMessage bool) map[string]string {
	fields := make(map[string]string)
	validate := func(errMsg string) (string, string, string) {
		s := strings.SplitN(errMsg, "'", 3)
		sLen := len(s)
		errMessage := strings.TrimPrefix(strings.TrimSpace(s[sLen-1]), "Error:")
		if index := strings.LastIndex(errMessage, " on the '"); index > 0 {
			errMessage = errMessage[:index]
		}
		if sLen == 3 {
			structKey := strings.Split(s[1], ".")
			if len(structKey) == 2 {
				return utils.ToSnakeCase(structKey[1]), s[1], errMessage
			} else if len(structKey) == 3 {
				return utils.ToSnakeCase(structKey[2]), s[1], errMessage
			}
			return utils.ToSnakeCase(s[1]), s[1], errMessage
		}
		return strings.ToLower(errMsg), "", errMessage
	}
	var errKey, errFullKey, errMessage string
	for _, msg := range strings.Split(errMsg, "\n") {
		errKey, errFullKey, errMessage = validate(msg)
		if errKey == "" {
			continue
		}
		if skipOverwriteErrorMessage == true {
			fields[errKey] = errMessage
			continue
		}
		if errVal, ok := ErrorMessage[errFullKey]; ok {
			fields[errKey] = errVal
		} else if errVal, ok := ErrorMessage[errKey]; ok {
			fields[errKey] = errVal
		} else {
			fields[errKey] = errMessage
		}
	}
	return fields
}

func DigestToID(digest string) string {
	splits := strings.Split(digest, ":")
	if len(splits) >= 2 {
		return splits[1]
	}
	return digest
}

func GetRegistryID(registryType, ns string) string {
	return registryType + "_" + EscapeSlashToUnderscore(ns)
}

func EscapeSlashToUnderscore(s string) string {
	return strings.ReplaceAll(s, "/", "_")
}

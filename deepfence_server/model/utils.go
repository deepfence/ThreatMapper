package model

import (
	"strings"
	"unicode"

	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
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
		"UserRegisterRequest.FirstName":         "should only contain alphabets, numbers, space and hyphen",
		"UserRegisterRequest.LastName":          "should only contain alphabets, numbers, space and hyphen",
		"UserRegisterRequest.Company":           "should only contain alphabets, numbers and valid characters",
		"UserRegisterRequest.Password":          "should contain at least one upper case, lower case, digit and special character",
		"UpdateUserPasswordRequest.OldPassword": "incorrect old password",
		"UpdateUserPasswordRequest.NewPassword": "should contain at least one upper case, lower case, digit and special character",
		"LoginRequest.Password":                 "incorrect password",
		"RegisterInvitedUserRequest.Password":   "should contain at least one upper case, lower case, digit and special character",
		"PasswordResetVerifyRequest.Password":   "should contain at least one upper case, lower case, digit and special character",

		"api_token": "api_token must be UUID",
		"email":     "invalid email address",
	}
)

func ParseValidatorError(errMsg string) map[string]string {
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
	return registryType + "_" + ns
}

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

func ParseValidatorError(errMsg string) map[string]string {
	fields := make(map[string]string)
	validate := func(errMsg string) string {
		s := strings.SplitN(errMsg, "'", 3)
		if len(s) == 3 {
			s = strings.Split(s[1], ".")
			if len(s) == 2 {
				return utils.ToSnakeCase(s[1])
			}
			return utils.ToSnakeCase(s[1])
		}
		return strings.ToLower(errMsg)
	}
	for _, msg := range strings.Split(errMsg, "\n") {
		field := validate(msg)
		m, ok := ErrorMessage[field]
		if ok {
			fields[validate(msg)] = m
		} else {
			fields[validate(msg)] = "invalid"
		}
	}
	return fields
}

func DigestToID(digest string) string {
	return strings.Split(digest, ":")[1]
}

func GetRegistryID(registryType, ns string) string {
	return registryType + "_" + ns
}

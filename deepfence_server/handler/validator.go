package handler

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/jira"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-playground/locales/en"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	entranslations "github.com/go-playground/validator/v10/translations/en"
)

var (
	CompanyRegex       = regexp.MustCompile("^[A-Za-z][a-zA-Z0-9-\\s@\\.#&!]+$") //nolint:gosimple
	UserNameRegex      = regexp.MustCompile("^[A-Za-z][A-Za-z .'-]+$")           //nolint:gosimple
	MinNamespaceLength = 3
	MaxNamespaceLength = 32
	NamespaceRegex     = regexp.MustCompile(fmt.Sprintf("^[a-z][a-z0-9-]{%d,%d}$", MinNamespaceLength-1, MaxNamespaceLength-1))
	APITokenRegex      = regexp.MustCompile(fmt.Sprintf("^[a-z][a-z0-9-]{%d,%d}\\:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", MinNamespaceLength-1, MaxNamespaceLength-1))
)

func NewValidator() (*validator.Validate, ut.Translator, error) {
	apiValidator := validator.New()
	enTranslator := en.New()
	universalTranslator := ut.New(enTranslator, enTranslator)
	trans, _ := universalTranslator.GetTranslator("en")
	err := entranslations.RegisterDefaultTranslations(apiValidator, trans)
	if err != nil {
		return nil, nil, err
	}

	translations := []struct {
		tag             string
		translation     string
		override        bool
		customRegisFunc validator.RegisterTranslationsFunc
		customTransFunc validator.TranslationFunc
	}{
		{
			tag: "email",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("email", "{0}:invalid email", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("email", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "uuid4",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("uuid4", "{0}:must be a valid UUID4", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("uuid4", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "url",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("url", "{0}:must be a valid URL", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("url", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "number",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("number", "{0}:must be a number", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("number", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "gt",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("gt", "{0}:must be greater than {1}", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("gt", utils.ToSnakeCase(fe.Field()), fe.Param())
				return t
			},
		},
		{
			tag: "lt",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("lt", "{0}:must be less than {1}", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("lt", utils.ToSnakeCase(fe.Field()), fe.Param())
				return t
			},
		},
		{
			tag: "required",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("required", "{0}:required field", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("required", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "startswith",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("startswith", "{0}:should start with '{1}'", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("startswith", utils.ToSnakeCase(fe.Field()), fe.Param())
				return t
			},
		},
		{
			tag: "oneof",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("oneof", "{0}:must be one of {1}", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("oneof", utils.ToSnakeCase(fe.Field()), fe.Param())
				return t
			},
		},
		{
			tag: "min",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("min", "{0}:must be of minimum {1}", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				var t string
				switch fe.Value().(type) {
				case int, int32, int64, float32, float64:
					t, _ = ut.T("min", utils.ToSnakeCase(fe.Field()), fe.Param())
				default:
					t, _ = ut.T("min", utils.ToSnakeCase(fe.Field()), "size "+fe.Param())
				}
				return t
			},
		},
		{
			tag: "max",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("max", "{0}:must be of maximum {1}", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				var t string
				switch fe.Value().(type) {
				case int, int32, int64, float32, float64:
					t, _ = ut.T("max", utils.ToSnakeCase(fe.Field()), fe.Param())
				default:
					t, _ = ut.T("max", utils.ToSnakeCase(fe.Field()), "size "+fe.Param())
				}
				return t
			},
		},
		{
			tag: "user_name",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("user_name", "{0}:should only contain alphabets, numbers, space and hyphen", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("user_name", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "password",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("password", "{0}:should contain at least one upper case, lower case, digit and special character", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("password", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "company_name",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("company_name", "{0}:should only contain alphabets, numbers and valid characters", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("company_name", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "namespace",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("namespace", "{0}:should only contain alphabets, numbers and -", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("namespace", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "api_token",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("api_token", "{0}:should only contain alphabets, numbers and valid characters", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("api_token", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
		{
			tag: "jira_auth_key",
			customRegisFunc: func(ut ut.Translator) error {
				return ut.Add("jira_auth_key", "{0}:invalid jira api token or password", true)
			},
			customTransFunc: func(ut ut.Translator, fe validator.FieldError) string {
				t, _ := ut.T("jira_auth_key", utils.ToSnakeCase(fe.Field()))
				return t
			},
		},
	}

	for _, t := range translations {
		switch {
		case t.customTransFunc != nil && t.customRegisFunc != nil:
			err = apiValidator.RegisterTranslation(t.tag, trans, t.customRegisFunc, t.customTransFunc)
		case t.customTransFunc != nil && t.customRegisFunc == nil:
			err = apiValidator.RegisterTranslation(t.tag, trans, registrationFunc(t.tag, t.translation, t.override), t.customTransFunc)
		case t.customTransFunc == nil && t.customRegisFunc != nil:
			err = apiValidator.RegisterTranslation(t.tag, trans, t.customRegisFunc, translateFunc)
		default:
			err = apiValidator.RegisterTranslation(t.tag, trans, registrationFunc(t.tag, t.translation, t.override), translateFunc)
		}
		if err != nil {
			return nil, nil, err
		}
	}

	err = apiValidator.RegisterValidation("password", ValidatePassword)
	if err != nil {
		return nil, nil, err
	}
	err = apiValidator.RegisterValidation("company_name", ValidateCompanyName)
	if err != nil {
		return nil, nil, err
	}
	err = apiValidator.RegisterValidation("user_name", ValidateUserName)
	if err != nil {
		return nil, nil, err
	}
	err = apiValidator.RegisterValidation("namespace", ValidateNamespace)
	if err != nil {
		return nil, nil, err
	}
	err = apiValidator.RegisterValidation("api_token", ValidateAPIToken)
	if err != nil {
		return nil, nil, err
	}
	err = apiValidator.RegisterValidation("jira_auth_key", ValidateJiraConfig)
	if err != nil {
		return nil, nil, err
	}
	return apiValidator, trans, nil
}

func (h *Handler) ParseValidatorError(err error, errs []error, skipOverwriteErrorMessage bool) (map[string]string, string) {
	fields := make(map[string]string)
	var errSplit []string
	var errorList []string

	if skipOverwriteErrorMessage {
		if len(errs) > 0 {
			for _, e := range errs {
				errorList = append(errorList, e.Error())
			}
		} else {
			errorList = append(errorList, err.Error())
		}
	} else {
		var errs validator.ValidationErrors
		errors.As(err, &errs)
		if len(errs) > 0 {
			for _, e := range errs {
				errorList = append(errorList, e.Translate(h.Translator))
			}
		} else {
			errorList = append(errorList, err.Error())
		}
	}

	for _, e := range errorList {
		errSplit = strings.SplitN(e, ":", 2)
		if len(errSplit) == 2 {
			fields[errSplit[0]] = errSplit[1]
		} else {
			return fields, e
		}
	}
	return fields, ""
}

func registrationFunc(tag string, translation string, override bool) validator.RegisterTranslationsFunc {
	return func(ut ut.Translator) (err error) {
		if err = ut.Add(tag, translation, override); err != nil {
			return
		}
		return
	}
}

func translateFunc(ut ut.Translator, fe validator.FieldError) string {
	t, err := ut.T(fe.Tag(), fe.Field())
	if err != nil {
		log.Warn().Msgf("error translating FieldError: %#v", fe)
		return fe.(error).Error()
	}
	return t
}

func ValidateUserName(fl validator.FieldLevel) bool {
	return UserNameRegex.MatchString(fl.Field().String())
}

func ValidateCompanyName(fl validator.FieldLevel) bool {
	return CompanyRegex.MatchString(fl.Field().String())
}

func ValidateNamespace(fl validator.FieldLevel) bool {
	return NamespaceRegex.MatchString(fl.Field().String())
}

func ValidateAPIToken(fl validator.FieldLevel) bool {
	return APITokenRegex.MatchString(fl.Field().String())
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

func ValidateJiraConfig(fl validator.FieldLevel) bool {
	config := fl.Parent().Interface().(jira.Config)
	if config.IsAuthToken && config.APIToken == "" {
		return false
	}
	if !config.IsAuthToken && config.Password == "" {
		return false
	}
	return true
}

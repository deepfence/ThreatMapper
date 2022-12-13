package utils

import (
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

var (
	matchFirstCap = regexp.MustCompile("(.)([A-Z][a-z]+)")
	matchAllCap   = regexp.MustCompile("([a-z0-9])([A-Z])")
)

type AgentID struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func ToSnakeCase(str string) string {
	// EmailAddress => email_address
	snake := matchFirstCap.ReplaceAllString(str, "${1}_${2}")
	snake = matchAllCap.ReplaceAllString(snake, "${1}_${2}")
	return strings.ToLower(snake)
}

func NewUUIDString() string {
	return NewUUID().String()
}

func NewUUID() uuid.UUID {
	return uuid.New()
}

func GetEmailDomain(email string) (string, error) {
	domain := strings.Split(email, "@")
	if len(domain) != 2 {
		return "", errors.New("invalid domain")
	}
	return strings.ToLower(domain[1]), nil
}

func GetCustomerNamespace(s string) (string, error) {
	var result strings.Builder
	if s == "" {
		return "", errors.New("invalid input")
	}
	s = strings.ToLower(s)
	for i := 0; i < len(s); i++ {
		b := s[i]
		if ('a' <= b && b <= 'z') || ('0' <= b && b <= '9') || b == '-' {
			result.WriteByte(b)
		} else {
			result.WriteByte('-')
		}
	}
	namespace := result.String()
	if '0' <= namespace[0] && namespace[0] <= '9' || namespace[0] == '-' {
		namespace = "c-" + namespace
	}
	lastCharPos := len(namespace) - 1
	if '0' <= namespace[lastCharPos] && namespace[lastCharPos] <= '9' || namespace[lastCharPos] == '-' {
		namespace = namespace + "-c"
	}
	if len(namespace) > 63 {
		return "", errors.New("at most 63 characters allowed")
	}
	return namespace, nil
}

func RemoveURLPath(inUrl string) (string, error) {
	u, err := url.Parse(inUrl)
	if err != nil {
		return inUrl, err
	}
	u.Path = ""
	u.User = nil
	u.RawQuery = ""
	u.Fragment = ""
	return u.String(), nil
}

func InterfaceToInt(a interface{}) (int64, error) {
	aValue := reflect.ValueOf(a)
	switch aValue.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return aValue.Int(), nil
	case reflect.Float32, reflect.Float64:
		return int64(aValue.Float()), nil
	case reflect.String:
		return strconv.ParseInt(aValue.String(), 10, 64)
	default:
		return 0, errors.New("type error")
	}
}

func IsJWTExpired(token string) bool {
	parsed, err := jwt.Parse([]byte(token), jwt.WithVerify(false))
	if err != nil {
		return true
	}
	return parsed.Expiration().Sub(time.Now().Add(5*time.Minute)) < 0
}

func GetInt64ValueFromInterfaceMap(claims map[string]interface{}, key string) (int64, error) {
	val, ok := claims[key]
	if !ok {
		return 0, errors.New(fmt.Sprintf("key %s not found in JWT claims", key))
	}
	number, err := InterfaceToInt(val)
	if err != nil {
		return 0, errors.New("cannot parse jwt")
	}
	return number, nil
}

func GetStringValueFromInterfaceMap(claims map[string]interface{}, key string) (string, error) {
	val, ok := claims[key]
	if !ok {
		return "", errors.New(fmt.Sprintf("key %s not found in JWT claims", key))
	}
	return fmt.Sprintf("%v", val), nil
}

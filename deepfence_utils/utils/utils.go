package utils

import (
	"errors"
	"github.com/google/uuid"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
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

func NewUUID() string {
	return uuid.New().String()
}

func GetEmailDomain(email string) (string, error) {
	domain := strings.Split(email, "@")
	if len(domain) != 2 {
		return "", errors.New("invalid domain")
	}
	return strings.ToLower(domain[1]), nil
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

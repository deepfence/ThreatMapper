package common

import (
	"errors"
	"os"
	"strings"

	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	oahttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
	"github.com/sirupsen/logrus"
)

var (
	ConnError = errors.New("Connection error")
)

func NewClient() (*openapi.APIClient, error) {
	url := os.Getenv("MGMT_CONSOLE_URL")
	if url == "" {
		return nil, errors.New("MGMT_CONSOLE_URL not set")
	}
	port := os.Getenv("MGMT_CONSOLE_PORT")
	if port == "" {
		return nil, errors.New("MGMT_CONSOLE_PORT not set")
	}

	api_token := os.Getenv("DEEPFENCE_KEY")
	if strings.Trim(api_token, "\"") == "" && oahttp.IsConsoleAgent(url) {
		internalURL := os.Getenv("MGMT_CONSOLE_URL_INTERNAL")
		internalPort := os.Getenv("MGMT_CONSOLE_PORT_INTERNAL")
		logrus.Infof("fetch console agent token")
		var err error
		if api_token, err = oahttp.GetConsoleApiToken(internalURL, internalPort); err != nil {
			return nil, err
		}
	} else if api_token == "" {
		return nil, errors.New("DEEPFENCE_KEY not set")
	}

	https_client := oahttp.NewHttpsConsoleClient(url, port)
	err := https_client.APITokenAuthenticate(api_token)
	if err != nil {
		return nil, ConnError
	}
	return https_client.Client(), nil
}

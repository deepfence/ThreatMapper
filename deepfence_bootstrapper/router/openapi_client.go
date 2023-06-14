package router

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"sync/atomic"

	"github.com/deepfence/golang_deepfence_sdk/client"
	openapi "github.com/deepfence/golang_deepfence_sdk/utils/http"
	"github.com/rs/zerolog/log"
)

type OpenapiClient struct {
	client               *openapi.OpenapiHttpClient
	stopControlListening chan struct{}
	publishInterval      atomic.Int32
	rawClient            *http.Client
}

var PushBackError = errors.New("Server push back")

func NewOpenapiClient() (*OpenapiClient, error) {
	openapiClient, err := NewClient()
	if err != nil {
		return nil, err
	}
	res := &OpenapiClient{
		client:               openapiClient,
		stopControlListening: make(chan struct{}),
		publishInterval:      atomic.Int32{},
		rawClient:            openapiClient.Client().GetConfig().HTTPClient,
	}
	res.publishInterval.Store(10)

	return res, err
}

func (ct *OpenapiClient) API() *client.APIClient {
	return ct.client.Client()
}

func (ct *OpenapiClient) PublishInterval() int32 {
	return ct.publishInterval.Load()
}

var (
	ConnError = errors.New("Connection error")
)

func NewClient() (*openapi.OpenapiHttpClient, error) {
	url := os.Getenv("MGMT_CONSOLE_URL")
	if url == "" {
		return nil, errors.New("MGMT_CONSOLE_URL not set")
	}
	port := os.Getenv("MGMT_CONSOLE_PORT")
	if port == "" {
		return nil, errors.New("MGMT_CONSOLE_PORT not set")
	}

	api_token := os.Getenv("DEEPFENCE_KEY")
	if strings.Trim(api_token, "\"") == "" && openapi.IsConsoleAgent(url) {
		internalURL := os.Getenv("MGMT_CONSOLE_URL_INTERNAL")
		internalPort := os.Getenv("MGMT_CONSOLE_PORT_INTERNAL")
		log.Info().Msg("fetch console agent token")
		var err error
		if api_token, err = openapi.GetConsoleApiToken(internalURL, internalPort); err != nil {
			return nil, err
		}
	} else if api_token == "" {
		return nil, errors.New("DEEPFENCE_KEY not set")
	}

	https_client := openapi.NewHttpsConsoleClient(url, port)
	err := https_client.APITokenAuthenticate(api_token)
	if err != nil {
		return nil, ConnError
	}
	return https_client, nil
}

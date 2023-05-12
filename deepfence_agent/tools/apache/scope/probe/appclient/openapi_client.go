package appclient

import (
	"net/url"
	"os"
	"sync/atomic"

	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/weaveworks/scope/probe/common"
	"github.com/weaveworks/scope/report"
)

type OpenapiClient struct {
	client               *openapi.APIClient
	stopControlListening chan struct{}
	publishInterval      atomic.Int32
	httpClient           *Client
}

func NewOpenapiClient() (*OpenapiClient, error) {
	openapiClient, err := common.NewClient()
	if err != nil {
		return nil, err
	}
	httpClient, err := NewClient(
		os.Getenv("MGMT_CONSOLE_URL"),
		os.Getenv("MGMT_CONSOLE_PORT"),
		os.Getenv("DEEPFENCE_KEY"),
	)
	if err != nil {
		return nil, err
	}
	res := &OpenapiClient{
		client:               openapiClient,
		stopControlListening: make(chan struct{}),
		publishInterval:      atomic.Int32{},
		httpClient:           httpClient,
	}
	res.publishInterval.Store(10)

	return res, err
}

// Publish implements MultiAppClient
func (ct *OpenapiClient) Publish(r report.Report) error {
	_, err := ct.httpClient.PublishAgentReport(r)
	return err
}

func (ct *OpenapiClient) PublishInterval() int32 {
	return ct.publishInterval.Load()
}

// Set implements MultiAppClient
func (ct *OpenapiClient) Set(hostname string, urls []url.URL) {
	panic("unimplemented")
}

// Stop implements Mu(ve *ValueError) Error() string {
func (ct *OpenapiClient) Stop() {
	panic("unimplemented")
}

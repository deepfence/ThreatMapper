package appclient

import (
	"bytes"
	"compress/gzip"
	"errors"
	"net/http"
	"net/url"
	"os"
	"sync/atomic"

	"github.com/bytedance/sonic"
	"github.com/deepfence/golang_deepfence_sdk/client"
	openapi "github.com/deepfence/golang_deepfence_sdk/utils/http"
	"github.com/weaveworks/scope/probe/common"
	"github.com/weaveworks/scope/report"
)

type OpenapiClient struct {
	client               *openapi.OpenapiHttpClient
	stopControlListening chan struct{}
	publishInterval      atomic.Int32
	publishReportUrl     string
	rawClient            *http.Client
}

var PushBackError = errors.New("Server push back")

func NewOpenapiClient() (*OpenapiClient, error) {
	openapiClient, err := common.NewClient()
	if err != nil {
		return nil, err
	}
	res := &OpenapiClient{
		client:               openapiClient,
		stopControlListening: make(chan struct{}),
		publishInterval:      atomic.Int32{},
		publishReportUrl:     "https://" + os.Getenv("MGMT_CONSOLE_URL") + ":443/deepfence/ingest/report",
		rawClient:            openapiClient.Client().GetConfig().HTTPClient,
	}
	res.publishInterval.Store(10)

	return res, err
}

func (ct *OpenapiClient) API() *client.APIClient {
	return ct.client.Client()
}

// Publish implements MultiAppClient
func (ct *OpenapiClient) Publish(r report.Report) error {
	buf, err := sonic.Marshal(r)
	if err != nil {
		return err
	}
	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	if _, err := gz.Write(buf); err != nil {
		return err
	}
	err = gz.Close()
	if err != nil {
		return err
	}

	httpReq, err := http.NewRequest(http.MethodPost, ct.publishReportUrl, bytes.NewReader(b.Bytes()))
	if err != nil {
		return err
	}
	httpReq.Header.Add("Content-Encoding", "gzip")

	resp, err := ct.rawClient.Do(httpReq)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode == http.StatusServiceUnavailable {
		return PushBackError
	}

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

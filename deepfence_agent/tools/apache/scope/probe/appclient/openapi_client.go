package appclient

import (
	"bytes"
	"compress/gzip"
	"net/http"
	"net/url"
	"os"
	"sync/atomic"

	"github.com/bytedance/sonic"
	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/weaveworks/scope/probe/common"
	"github.com/weaveworks/scope/report"
)

type OpenapiClient struct {
	client               *openapi.APIClient
	stopControlListening chan struct{}
	publishInterval      atomic.Int32
	publishReportUrl     string
}

func NewOpenapiClient() (*OpenapiClient, error) {
	openapiClient, err := common.NewClient()
	if err != nil {
		return nil, err
	}
	res := &OpenapiClient{
		client:               openapiClient,
		stopControlListening: make(chan struct{}),
		publishInterval:      atomic.Int32{},
		publishReportUrl:     "https://"+os.Getenv("MGMT_CONSOLE_URL") + "/deepfence/ingest/report",
	}
	res.publishInterval.Store(10)

	return res, err
}

// Publish implements MultiAppClient
func (ct *OpenapiClient) Publish(r report.Report) error {
	c := ct.client.GetConfig().HTTPClient
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
	httpReq.Close = true

	for k, v := range ct.client.GetConfig().DefaultHeader {
		httpReq.Header.Add(k, v)
	}
	httpReq.Header.Add("Content-Encoding", "gzip")

	resp, err := c.Do(httpReq)
	if err != nil {
		return err
	}
	resp.Body.Close()
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

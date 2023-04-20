package appclient

import (
	"bytes"
	"context"
	"encoding/base64"
	"net/url"
	"sync/atomic"

	"github.com/bytedance/sonic"
	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/klauspost/compress/gzip"
	"github.com/weaveworks/scope/probe/common"
	"github.com/weaveworks/scope/report"
)

type OpenapiClient struct {
	client               *openapi.APIClient
	stopControlListening chan struct{}
	publishInterval      atomic.Int32
}

func NewOpenapiClient() (*OpenapiClient, error) {
	httpsClient, err := common.NewClient()
	res := &OpenapiClient{
		client:               httpsClient,
		stopControlListening: make(chan struct{}),
		publishInterval:      atomic.Int32{},
	}
	res.publishInterval.Store(10)

	return res, err
}

// Publish implements MultiAppClient
func (oc OpenapiClient) Publish(r report.Report) error {
	buf, err := sonic.Marshal(r)
	if err != nil {
		return err
	}

	req := oc.client.TopologyApi.IngestAgentReport(context.Background())

	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	if _, err := gz.Write(buf); err != nil {
		return err
	}
	gz.Close()
	bb := b.Bytes()
	dst := make([]byte, base64.StdEncoding.EncodedLen(len(bb)))
	base64.StdEncoding.Encode(dst, bb)
	req = req.ReportRawReport(openapi.ReportRawReport{
		Payload: string(dst),
	})

	_, err = oc.client.TopologyApi.IngestAgentReportExecute(req)
	if err != nil {
		return err
	}

	return nil
}

func (ct *OpenapiClient) PublishInterval() int32 {
	return ct.publishInterval.Load()
}

// Set implements MultiAppClient
func (OpenapiClient) Set(hostname string, urls []url.URL) {
	panic("unimplemented")
}

// Stop implements Mu(ve *ValueError) Error() string {
func (OpenapiClient) Stop() {
	panic("unimplemented")
}

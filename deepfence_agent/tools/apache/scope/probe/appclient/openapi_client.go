package appclient

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"time"

	openapi "github.com/deepfence/ThreatMapper/deepfence_server_client"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/report"

	"github.com/bytedance/sonic"
)

type OpenapiClient struct {
	client *openapi.APIClient
}

const (
	maxIdleConnsPerHost = 1024
)

var (
	AuthError = errors.New("Authentication error")
)

func buildHttpClient() *http.Client {
	// Set up our own certificate pool
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	transport := &http.Transport{
		MaxIdleConnsPerHost: maxIdleConnsPerHost,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout: 30 * time.Second,
		TLSClientConfig:     tlsConfig}
	client := &http.Client{Transport: transport}
	return client
}

func NewOpenapiClient() (*OpenapiClient, error) {

	url := os.Getenv("MGMT_CONSOLE_URL")
	if url == "" {
		return nil, errors.New("MGMT_CONSOLE_URL not set")
	}
	port := os.Getenv("MGMT_CONSOLE_PORT")
	if port == "" {
		return nil, errors.New("MGMT_CONSOLE_PORT not set")
	}

	api_token := os.Getenv("DEEPFENCE_KEY")
	if port == "" {
		return nil, errors.New("DEEPFENCE_KEY not set")
	}

	cfg := openapi.NewConfiguration()
	cfg.HTTPClient = buildHttpClient()
	cfg.Servers = openapi.ServerConfigurations{
		{
			URL:         fmt.Sprintf("https://%s:%s", url, port),
			Description: "deepfence_server",
		},
	}
	cl := openapi.NewAPIClient(cfg)
	req := cl.AuthenticationApi.AuthToken(context.Background()).ModelApiAuthRequest(openapi.ModelApiAuthRequest{
		ApiToken: &api_token,
	})
	res, _, err := cl.AuthenticationApi.AuthTokenExecute(req)
	if err != nil {
		return nil, AuthError
	}

	accessToken := res.GetData().AccessToken
	if accessToken == nil {
		return nil, AuthError
	}

	cl.GetConfig().AddDefaultHeader("Authorization", fmt.Sprintf("Bearer %v", *accessToken))

	return &OpenapiClient{
		client: cl,
	}, nil
}

// PipeClose implements MultiAppClient
func (OpenapiClient) PipeClose(appID string, pipeID string) error {
	panic("unimplemented")
}

// PipeConnection implements MultiAppClient
func (OpenapiClient) PipeConnection(appID string, pipeID string, pipe xfer.Pipe) error {
	panic("unimplemented")
}

// Publish implements MultiAppClient
func (oc OpenapiClient) Publish(r report.Report) error {
	buf, err := sonic.Marshal(r)
	if err != nil {
		return err
	}

	req := oc.client.TopologyApi.IngestAgentReport(context.Background())

	req = req.ApiDocsRawReport(openapi.ApiDocsRawReport{
		Payload: string(buf),
	})

	ctl, _, err := oc.client.TopologyApi.IngestAgentReportExecute(req)
	if err != nil {
		return err
	}

	for _, action := range ctl.Commands {
		err := controls.ApplyControl(action)
		if err != nil {
			logrus.Errorf("Control failed: %v\n", err)
			//TODO: append failed status
		}
	}
	return nil
}

// Set implements MultiAppClient
func (OpenapiClient) Set(hostname string, urls []url.URL) {
	panic("unimplemented")
}

// Stop implements MultiAppClient
func (OpenapiClient) Stop() {
	panic("unimplemented")
}

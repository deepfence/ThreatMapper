package appclient

import (
	"context"
	"errors"
	"net/url"
	"os"

	openapi "github.com/deepfence/ThreatMapper/deepfence_server_client"
	oahttp "github.com/deepfence/ThreatMapper/deepfence_utils/http"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/report"

	"github.com/bytedance/sonic"
)

type OpenapiClient struct {
	client *openapi.APIClient
}

var (
	ConnError = errors.New("Connection error")
)

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

	https_client := oahttp.NewHttpsConsoleClient(url, port)
	err := https_client.APITokenAuthenticate(api_token)
	if err != nil {
		return nil, ConnError
	}

	return &OpenapiClient{
		client: https_client.Client(),
	}, err
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

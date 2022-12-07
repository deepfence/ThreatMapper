package appclient

import (
	"context"
	"net/url"

	openapi "github.com/deepfence/ThreatMapper/deepfence_server_client"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/report"

	"github.com/bytedance/sonic"
)

type OpenapiClient struct {
	client *openapi.APIClient
}

func NewOpenapiClient() *OpenapiClient {

	cfg := openapi.NewConfiguration()
	cfg.Servers = openapi.ServerConfigurations{
		{
			URL:         "http://localhost:8080",
			Description: "deepfence_server",
		},
	}
	cl := openapi.NewAPIClient(cfg)
	return &OpenapiClient{
		client: cl,
	}
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

	payload := string(buf)

	req := oc.client.TopologyApi.IngestAgentReport(context.Background())

	req = req.ApiDocsRawReport(openapi.ApiDocsRawReport{
		Payload: &payload,
	})

	ctl, _, err := oc.client.TopologyApi.IngestAgentReportExecute(req)
	if err != nil {
		return err
	}

	for _, action := range ctl.Commands {
		controls.ApplyControl(action)
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

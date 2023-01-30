package appclient

import (
	"context"
	"errors"
	"net/url"
	"os"
	"time"

	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	oahttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/report"

	"github.com/bytedance/sonic"
)

type OpenapiClient struct {
	client               *openapi.APIClient
	stopControlListening chan struct{}
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
		client:               https_client.Client(),
		stopControlListening: make(chan struct{}),
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

	req = req.ReportRawReport(openapi.ReportRawReport{
		Payload: string(buf),
	})

	_, err = oc.client.TopologyApi.IngestAgentReportExecute(req)
	if err != nil {
		return err
	}

	return nil
}

// Set implements MultiAppClient
func (OpenapiClient) Set(hostname string, urls []url.URL) {
	panic("unimplemented")
}

// Stop implements Mu(ve *ValueError) Error() string {
func (OpenapiClient) Stop() {
	panic("unimplemented")
}

func (ct *OpenapiClient) StartControlsWatching() error {

	req := ct.client.ControlsApi.GetAgentInitControls(context.Background())
	req = req.ModelAgentId(*openapi.NewModelAgentId(hostname.Get()))
	ctl, _, err := ct.client.ControlsApi.GetAgentInitControlsExecute(req)

	if err != nil {
		return err
	}

	for _, action := range ctl.Commands {
		logrus.Infof("Init execute :%v", action.Id)
		err := controls.ApplyControl(action)
		if err != nil {
			logrus.Errorf("Control %v failed: %v\n", action, err)
		}
	}

	go func() {
		req := ct.client.ControlsApi.GetAgentControls(context.Background())
		req = req.ModelAgentId(*openapi.NewModelAgentId(hostname.Get()))
		for {
			select {
			case <-time.After(time.Second * 10):
			case <-ct.stopControlListening:
				break
			}
			ctl, _, err := ct.client.ControlsApi.GetAgentControlsExecute(req)
			if err != nil {
				logrus.Errorf("Getting controls failed: %v\n", err)
				continue
			}

			for _, action := range ctl.Commands {
				logrus.Infof("Execute :%v", action.Id)
				err := controls.ApplyControl(action)
				if err != nil {
					logrus.Errorf("Control %v failed: %v\n", action, err)
				}
			}

		}
	}()

	return nil
}

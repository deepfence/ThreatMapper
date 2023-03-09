package appclient

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"strings"
	"time"

	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	oahttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
	"github.com/klauspost/compress/gzip"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/report"
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
	if strings.Trim(api_token, "\"") == "" && oahttp.IsConsoleAgent(url) {
		logrus.Infof("fetch console agent token")
		var err error
		if api_token, err = oahttp.GetConsoleApiToken(url); err != nil {
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
	buf, err := json.Marshal(r)
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

// Set implements MultiAppClient
func (OpenapiClient) Set(hostname string, urls []url.URL) {
	panic("unimplemented")
}

// Stop implements Mu(ve *ValueError) Error() string {
func (OpenapiClient) Stop() {
	panic("unimplemented")
}

const (
	MAX_AGENT_WORKLOAD = 2
)

func (ct *OpenapiClient) StartControlsWatching(nodeId string, isClusterAgent bool) error {
	workload_allocator := ctl.NewWorkloadAllocator(MAX_AGENT_WORKLOAD)
	if isClusterAgent {

	} else {
		req := ct.client.ControlsApi.GetAgentInitControls(context.Background())
		req = req.ModelInitAgentReq(
			*openapi.NewModelInitAgentReq(
				workload_allocator.MaxAllocable(),
				nodeId,
				host.AgentVersionNo,
			),
		)
		ctl, _, err := ct.client.ControlsApi.GetAgentInitControlsExecute(req)

		if err != nil {
			return err
		}

		workload_allocator.Reserve(int32(len(ctl.Commands)))

		for _, action := range ctl.Commands {
			logrus.Infof("Init execute :%v", action.Id)
			err := controls.ApplyControl(action)
			if err != nil {
				logrus.Errorf("Control %v failed: %v\n", action, err)
			}
			// TODO: call when work truly completes
			workload_allocator.Free()
		}
	}

	if isClusterAgent {
		go func() {
			req := ct.client.ControlsApi.GetKubernetesClusterControls(context.Background())
			agentId := openapi.NewModelAgentId(workload_allocator.MaxAllocable(), nodeId)
			req = req.ModelAgentId(*agentId)
			for {
				select {
				case <-time.After(time.Second * 10):
				case <-ct.stopControlListening:
					break
				}
				agentId.SetAvailableWorkload(workload_allocator.MaxAllocable())
				req = req.ModelAgentId(*agentId)
				ctl, _, err := ct.client.ControlsApi.GetKubernetesClusterControlsExecute(req)
				if err != nil {
					logrus.Errorf("Getting controls failed: %v\n", err)
					continue
				}

				workload_allocator.Reserve(int32(len(ctl.Commands)))

				for _, action := range ctl.Commands {
					logrus.Infof("Execute :%v", action.Id)
					err := controls.ApplyControl(action)
					if err != nil {
						logrus.Errorf("Control %v failed: %v\n", action, err)
					}
					// TODO: call when work truly completes
					workload_allocator.Free()
				}
			}
		}()
	} else {
		go func() {
			req := ct.client.ControlsApi.GetAgentControls(context.Background())
			agentId := openapi.NewModelAgentId(workload_allocator.MaxAllocable(), nodeId)
			req = req.ModelAgentId(*agentId)
			for {
				select {
				case <-time.After(time.Second * 10):
				case <-ct.stopControlListening:
					break
				}
				agentId.SetAvailableWorkload(workload_allocator.MaxAllocable())
				req = req.ModelAgentId(*agentId)
				ctl, _, err := ct.client.ControlsApi.GetAgentControlsExecute(req)
				if err != nil {
					logrus.Errorf("Getting controls failed: %v\n", err)
					continue
				}

				workload_allocator.Reserve(int32(len(ctl.Commands)))

				for _, action := range ctl.Commands {
					logrus.Infof("Execute :%v", action.Id)
					err := controls.ApplyControl(action)
					if err != nil {
						logrus.Errorf("Control %v failed: %v\n", action, err)
					}
					// TODO: call when work truly completes
					workload_allocator.Free()
				}
			}
		}()
	}

	return nil
}

package appclient

import (
	"bytes"
	"context"
	"encoding/base64"
	"net/url"
	"sync/atomic"
	"time"

	"github.com/bytedance/sonic"
	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/klauspost/compress/gzip"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/probe/common"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/probe/host"
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

const (
	MAX_AGENT_WORKLOAD = 2
)

func GetScannersWorkloads() int32 {
	res := int32(0)
	res += host.GetSecretScannerJobCount()
	res += host.GetMalwareScannerJobCount()
	//TODO: Add more scanners workfload
	return res
}

var upgrade atomic.Bool

func SetUpgrade() {
	upgrade.Store(true)
}

func getUpgradeWorkload() int32 {
	if upgrade.Load() {
		return MAX_AGENT_WORKLOAD
	}
	return 0
}

func getMaxAllocatable() int32 {
	workload := MAX_AGENT_WORKLOAD - GetScannersWorkloads() - getUpgradeWorkload()
	if workload <= 0 {
		workload = 0
	}
	logrus.Infof("Workload: %v\n", workload)
	return workload
}

func (ct *OpenapiClient) StartControlsWatching(nodeId string, isClusterAgent bool) error {
	if isClusterAgent {

	} else {
		req := ct.client.ControlsApi.GetAgentInitControls(context.Background())
		req = req.ModelInitAgentReq(
			*openapi.NewModelInitAgentReq(
				getMaxAllocatable(),
				nodeId,
				host.AgentVersionNo,
			),
		)
		ctl, _, err := ct.client.ControlsApi.GetAgentInitControlsExecute(req)

		ct.publishInterval.Store(ctl.Beatrate)

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
	}

	if isClusterAgent {
		go func() {
			req := ct.client.ControlsApi.GetKubernetesClusterControls(context.Background())
			agentId := openapi.NewModelAgentId(getMaxAllocatable(), nodeId)
			req = req.ModelAgentId(*agentId)
			for {
				select {
				case <-time.After(time.Second * 10):
				case <-ct.stopControlListening:
					break
				}
				agentId.SetAvailableWorkload(getMaxAllocatable())
				req = req.ModelAgentId(*agentId)
				ctl, _, err := ct.client.ControlsApi.GetKubernetesClusterControlsExecute(req)
				if err != nil {
					logrus.Errorf("Getting controls failed: %v\n", err)
					continue
				}

				ct.publishInterval.Store(ctl.Beatrate)

				for _, action := range ctl.Commands {
					logrus.Infof("Execute :%v", action.Id)
					err := controls.ApplyControl(action)
					if err != nil {
						logrus.Errorf("Control %v failed: %v\n", action, err)
					}
				}
			}
		}()
	} else {
		go func() {
			req := ct.client.ControlsApi.GetAgentControls(context.Background())
			agentId := openapi.NewModelAgentId(getMaxAllocatable(), nodeId)
			req = req.ModelAgentId(*agentId)
			for {
				select {
				case <-time.After(time.Second * 10):
				case <-ct.stopControlListening:
					break
				}
				agentId.SetAvailableWorkload(getMaxAllocatable())
				req = req.ModelAgentId(*agentId)
				ctl, _, err := ct.client.ControlsApi.GetAgentControlsExecute(req)
				if err != nil {
					logrus.Errorf("Getting controls failed: %v\n", err)
					continue
				}

				ct.publishInterval.Store(ctl.Beatrate)

				for _, action := range ctl.Commands {
					logrus.Infof("Execute :%v", action.Id)
					err := controls.ApplyControl(action)
					if err != nil {
						logrus.Errorf("Control %v failed: %v\n", action, err)
					}
				}
			}
		}()
	}

	return nil
}

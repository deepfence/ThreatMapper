//go:build !dummy
// +build !dummy

package controls

import (
	"context"
	"errors"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/router"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/golang_deepfence_sdk/client"
	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/deepfence/golang_deepfence_sdk/utils/http"
)

const version = "v0.0.1"

type ControlsClient struct {
	client               *http.OpenapiHttpClient
	stopControlListening chan struct{}
	publishInterval      atomic.Int32
}

var (
	ConnError = errors.New("Connection error")
)

// Get returns the hostname of this host.
func Hostname() string {
	if hostname := os.Getenv("SCOPE_HOSTNAME"); hostname != "" {
		return hostname
	}
	hostname, err := os.Hostname()
	if err != nil {
		return "(unknown)"
	}
	return hostname
}

func newClient() (*http.OpenapiHttpClient, error) {
	url := os.Getenv("MGMT_CONSOLE_URL")
	if url == "" {
		return nil, errors.New("MGMT_CONSOLE_URL not set")
	}
	port := os.Getenv("MGMT_CONSOLE_PORT")
	if port == "" {
		return nil, errors.New("MGMT_CONSOLE_PORT not set")
	}

	api_token := os.Getenv("DEEPFENCE_KEY")
	if strings.Trim(api_token, "\"") == "" && http.IsConsoleAgent(url) {
		internalURL := os.Getenv("MGMT_CONSOLE_URL_INTERNAL")
		internalPort := os.Getenv("MGMT_CONSOLE_PORT_INTERNAL")
		log.Info().Msg("fetch console agent token")
		var err error
		if api_token, err = http.GetConsoleApiToken(internalURL, internalPort); err != nil {
			return nil, err
		}
	} else if api_token == "" {
		return nil, errors.New("DEEPFENCE_KEY not set")
	}

	https_client := http.NewHttpsConsoleClient(url, port)
	err := https_client.APITokenAuthenticate(api_token)
	if err != nil {
		return nil, ConnError
	}
	return https_client, nil
}

var PushBackError = errors.New("Server push back")

func NewControlsClient() (*ControlsClient, error) {
	openapiClient, err := newClient()
	if err != nil {
		return nil, err
	}
	res := &ControlsClient{
		client:               openapiClient,
		stopControlListening: make(chan struct{}),
		publishInterval:      atomic.Int32{},
	}
	res.publishInterval.Store(10)

	return res, err
}

func (ct *ControlsClient) API() *client.APIClient {
	return ct.client.Client()
}

func (ct *ControlsClient) StartControlsWatching(nodeId string, isClusterAgent bool, nodeType string) error {
	if isClusterAgent {

	} else {
		req := ct.API().ControlsAPI.GetAgentInitControls(context.Background())
		req = req.ModelInitAgentReq(
			*openapi.NewModelInitAgentReq(
				getMaxAllocatable(),
				nodeId,
				version,
				nodeType,
			),
		)
		ctl, _, err := ct.API().ControlsAPI.GetAgentInitControlsExecute(req)

		if err != nil {
			return err
		}

		ct.publishInterval.Store(ctl.Beatrate)

		for _, action := range ctl.Commands {
			log.Info().Msgf("Init execute :%v", action.Id)
			err := router.ApplyControl(action)
			if err != nil {
				log.Error().Msgf("Control %v failed: %v\n", action, err)
			}
		}
	}

	var get_controls func(openapi.ModelAgentId) (*client.ControlsAgentControls, error)
	if isClusterAgent {
		get_controls = func(agentId openapi.ModelAgentId) (*client.ControlsAgentControls, error) {
			req := ct.API().ControlsAPI.GetKubernetesClusterControls(context.Background())
			req = req.ModelAgentId(agentId)
			ctl, _, err := ct.API().ControlsAPI.GetKubernetesClusterControlsExecute(req)
			return ctl, err
		}
	} else {
		get_controls = func(agentId openapi.ModelAgentId) (*client.ControlsAgentControls, error) {
			req := ct.API().ControlsAPI.GetAgentControls(context.Background())
			req = req.ModelAgentId(agentId)
			ctl, _, err := ct.API().ControlsAPI.GetAgentControlsExecute(req)
			return ctl, err
		}
	}
	go func() {
		agentId := openapi.NewModelAgentId(getMaxAllocatable(), nodeId)
		ticker := time.NewTicker(time.Second * time.Duration(ct.publishInterval.Load()/2))
		for {
			ticker.Reset(time.Second * time.Duration(ct.publishInterval.Load()/2))
			select {
			case <-ticker.C:
			case <-ct.stopControlListening:
				break
			}
			agentId.SetAvailableWorkload(getMaxAllocatable())
			ctl, err := get_controls(*agentId)
			if err != nil {
				log.Error().Msgf("Getting controls failed: %v\n", err)
				continue
			}

			ct.publishInterval.Store(ctl.Beatrate)

			for _, action := range ctl.Commands {
				log.Info().Msgf("Execute :%v", action.Id)
				err := router.ApplyControl(action)
				if err != nil {
					log.Error().Msgf("Control %v failed: %v\n", action, err)
				}
			}
		}
	}()

	return nil
}

const (
	MAX_AGENT_WORKLOAD = 2
)

func GetPluginsWorkloads() int32 {
	res := int32(0)
	//TODO: Add more scanners workload
	//log.Info().Msgf("GetScannersWorkloads secret: %d malware: %d package: %d", scope)
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
	workload := MAX_AGENT_WORKLOAD - GetPluginsWorkloads() - getUpgradeWorkload()
	if workload <= 0 {
		workload = 0
	}
	log.Info().Msgf("Workload: %v\n", workload)
	return workload
}

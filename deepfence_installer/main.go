package main

import (
	"context"
	"errors"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	log "github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/deepfence_installer/agent"
	"github.com/deepfence/deepfence_installer/installer"
	oahttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
)

type SemVer struct {
	Major int64
	Minor int64
	Patch int64
}

func stringToSemVer(s string) (SemVer, error) {
	ss := strings.Split(s, ".")
	if len(ss) != 3 {
		return SemVer{}, errors.New("wrong SemVer format")
	}
	maj, err := strconv.ParseInt(ss[0], 10, 64)
	if err != nil {
		return SemVer{}, errors.New("wrong major SemVer format")
	}
	min, err := strconv.ParseInt(ss[1], 10, 64)
	if err != nil {
		return SemVer{}, errors.New("wrong minor SemVer format")
	}
	pat, err := strconv.ParseInt(ss[2], 10, 64)
	if err != nil {
		return SemVer{}, errors.New("wrong patch SemVer format")
	}

	return SemVer{
		Major: maj,
		Minor: min,
		Patch: pat,
	}, nil
}

func (s SemVer) isLowerThan(r SemVer) bool {
	return r.Major > s.Major || r.Minor > s.Minor || r.Patch > s.Patch
}

var (
	generic_installer installer.Installer
)

func main() {
	is_k8s := os.Getenv("IS_KUBERNETES") == "true"
	api_token := os.Getenv("DEEPFENCE_API_KEY")
	console_ip := os.Getenv("DEEPFENCE_URL")

	currentVer := SemVer{0, 0, 0}

	if api_token == "" {
		log.Fatal().Msg("No API key provided")
	}

	if console_ip == "" {
		log.Fatal().Msg("No Console URL provided")
	}

	https_client := oahttp.NewHttpsConsoleClient(console_ip, "443")
	err := https_client.APITokenAuthenticate(api_token)
	if err != nil {
		log.Fatal().Msgf("Failed to authenticate %v\n", err)
	}

	if is_k8s {
		generic_installer = installer.NewKubernetesInstaller(console_ip, api_token)
	} else {
		generic_installer = installer.NewDockerInstaller(console_ip, api_token)
	}

	c := make(chan os.Signal)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	asap_retry := make(chan struct{}, 1)
	asap_retry <- struct{}{}

loop:
	for {
		select {
		case <-time.After(10 * time.Second):
		case <-asap_retry:
		case <-c:
			break loop
		}

		req := https_client.Client().ControlsApi.GetLatestAgentVersion(context.Background())
		res, rh, err := https_client.Client().ControlsApi.GetLatestAgentVersionExecute(req)
		if err != nil {
			log.Error().Msgf("Failed to execute %v, %v\n", rh, err)
			continue
		}

		nextVer, err := stringToSemVer(res.GetVersion())
		if err != nil {
			log.Error().Msgf("Failed to parse version: %v", err)
			continue
		}

		if currentVer.isLowerThan(nextVer) {
			log.Info().Msg("Do upgrade\n")
			err := doUpgrade(agent.AgentImage{
				ImageName: res.GetImageName(),
				ImageTag:  res.GetImageTag(),
			})

			if err != nil {
				log.Error().Msgf("Upgrade failed: %v", err)
				if errors.Is(err, RollbackFailure) {
					// Agent is unstable, retry upgrade right away
					asap_retry <- struct{}{}
					continue
				}
			} else {
				currentVer = nextVer
			}
		}
	}
	generic_installer.Delete()
}

const RollbackFailure RollbackFailureError = "Rollback failed"

type RollbackFailureError string

func (e RollbackFailureError) Error() string {
	return string(e)
}

func doUpgrade(new_image agent.AgentImage) error {
	err := generic_installer.SaveNewConfig(new_image)
	if err != nil {
		return err
	}
	err = generic_installer.Delete()
	if err != nil {
		generic_installer.RollBackConfig()
		return err
	}
	err = generic_installer.Install()
	if err != nil {
		generic_installer.RollBackConfig()
		err2 := generic_installer.Install()
		if err2 != nil {
			return RollbackFailure
		}
		return err
	}
	return nil
}

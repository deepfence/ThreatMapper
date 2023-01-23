package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	oahttp "github.com/deepfence/ThreatMapper/deepfence_utils/http"
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
	min, err := strconv.ParseInt(ss[0], 10, 64)
	if err != nil {
		return SemVer{}, errors.New("wrong minor SemVer format")
	}
	pat, err := strconv.ParseInt(ss[0], 10, 64)
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

func main() {
	is_k8s := os.Getenv("IS_KUBERNETES") == "true"
	api_token := os.Getenv("DEEPFENCE_API_KEY")
	console_ip := os.Getenv("DEEPFENCE_URL")

	currentVer := SemVer{0, 0, 0}

	if api_token == "" {
		log.Fatal("No API key provided")
	}

	if console_ip == "" {
		log.Fatal("No Console URL provided")
	}

	https_client := oahttp.NewHttpsConsoleClient(console_ip, "443")
	err := https_client.APITokenAuthenticate(api_token)
	if err != nil {
		log.Fatalf("Failed to authenticate %v\n", err)
	}

	for {
		select {
		case <-time.After(10 * time.Second):
		}

		req := https_client.Client().ControlsApi.GetLatestAgentVersion(context.Background())
		res, rh, err := https_client.Client().ControlsApi.GetLatestAgentVersionExecute(req)
		if err != nil {
			log.Printf("Failed to execute %v, %v\n", rh, err)
			continue
		}

		fmt.Printf("http: %v", res)

		nextVer, err := stringToSemVer(res.GetVersion())
		if err != nil {
			log.Printf("Failed to parse version: %v", err)
			continue
		}

		fmt.Printf("prev: %v, next: %v", currentVer, nextVer)

		if currentVer.isLowerThan(nextVer) {
			doUpgrade(is_k8s)
			currentVer = nextVer
		}

	}
}

func doUpgrade(is_k8s bool) {
}

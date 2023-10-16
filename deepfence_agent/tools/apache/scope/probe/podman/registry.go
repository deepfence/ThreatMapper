package podman

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
)

const (
	podmanApi = "http://d/v4.6.0/libpod/%s?remote=true"
)

var (
	podmanInfoApi          = fmt.Sprintf(podmanApi, "info")
	podmanContainerListApi = fmt.Sprintf(podmanApi, "containers/json")
	podmanImageListApi     = fmt.Sprintf(podmanApi, "images/json")
)

type PodmanClient struct {
	Endpoint string
}

// NewPodmanClient creates client to Podman.
func NewPodmanClient(endpoint string) (*PodmanClient, error) {
	podmanClient := PodmanClient{
		Endpoint: strings.TrimPrefix(endpoint, "unix://"),
	}
	err := podmanClient.Validate()
	if err != nil {
		return nil, err
	}
	return &podmanClient, nil
}

func (p *PodmanClient) ListContainers() ([]Container, error) {
	httpClient := p.getHTTPClient()
	resp, err := httpClient.Get(podmanContainerListApi)
	var containers []Container
	if err != nil {
		return containers, err
	}
	err = p.parseHttpResponse(resp, &containers)
	if err != nil {
		return containers, err
	}
	return containers, nil
}

func (p *PodmanClient) ListImages() ([]ContainerImage, error) {
	httpClient := p.getHTTPClient()
	resp, err := httpClient.Get(podmanImageListApi)
	var containerImages []ContainerImage
	if err != nil {
		return containerImages, err
	}
	err = p.parseHttpResponse(resp, &containerImages)
	if err != nil {
		return containerImages, err
	}
	return containerImages, nil
}

func (p *PodmanClient) Validate() error {
	httpClient := p.getHTTPClient()
	resp, err := httpClient.Get(podmanInfoApi)
	if err != nil {
		return err
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		return errors.New(string(body))
	}
	return nil
}

func (p *PodmanClient) parseHttpResponse(resp *http.Response, respObj interface{}) error {
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, respObj)
}

func (p *PodmanClient) getHTTPClient() http.Client {
	// Creating a new HTTP client that is configured to make HTTP requests over a Unix domain socket.
	httpClient := http.Client{
		Transport: &http.Transport{
			DialContext: func(_ context.Context, _, _ string) (net.Conn, error) {
				return net.Dial("unix", p.Endpoint)
			},
		},
	}
	return httpClient
}

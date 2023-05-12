package appclient

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/bytedance/sonic"
	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/weaveworks/scope/probe/common"
	"github.com/weaveworks/scope/report"
)

type Client struct {
	httpClient           *http.Client
	openapiClient        *openapi.APIClient
	managementConsoleUrl string
	deepfenceKey         string
	accessToken          string
	reportPublishUrl     string
	sync.RWMutex
}

var (
	agentReportPublishHeader  = map[string]string{"Content-Encoding": "gzip"}
	defaultAccessTokenRefresh = 4 * time.Minute
)

func NewClient(managementConsoleUrl string, managementConsolePort, deepfenceKey string) (*Client, error) {
	openapiClient, err := common.NewClient()
	if err != nil {
		return nil, err
	}
	httpClient, err := buildHttpClient()
	if err != nil {
		return nil, err
	}
	if managementConsoleUrl == "" {
		return nil, fmt.Errorf("management console url is required")
	}
	if managementConsolePort == "" {
		return nil, fmt.Errorf("management console port is required")
	}
	consoleUrl := "https://" + managementConsoleUrl + ":" + managementConsolePort
	c := &Client{
		httpClient:           httpClient,
		openapiClient:        openapiClient,
		managementConsoleUrl: consoleUrl,
		reportPublishUrl:     consoleUrl + "/deepfence/ingest/report",
		deepfenceKey:         deepfenceKey,
	}
	_, err = c.updateAccessToken()
	if err != nil {
		return nil, err
	}
	go c.updateAccessTokenPeriodically()
	return c, nil
}

func (c *Client) getTimeToAccessTokenExpiry(accessToken string) time.Duration {
	timeNow := time.Now()
	token, err := jwt.Parse([]byte(accessToken), jwt.WithVerify(false))
	if err != nil {
		return defaultAccessTokenRefresh
	}
	return token.Expiration().Sub(timeNow) - time.Second*15
}

func (c *Client) updateAccessTokenPeriodically() {
	ticker := time.NewTicker(defaultAccessTokenRefresh)
	var accessToken string
	var err error
	for {
		select {
		case <-ticker.C:
			accessToken, err = c.updateAccessToken()
			if err != nil {
				log.Warn().Msg(err.Error())
			}
			ticker.Stop()
			ticker = time.NewTicker(c.getTimeToAccessTokenExpiry(accessToken))
		}
	}
}

func (c *Client) getAccessToken() string {
	c.RLock()
	defer c.RUnlock()
	return c.accessToken
}

func (c *Client) updateAccessToken() (string, error) {
	ctx := context.Background()
	req := c.openapiClient.AuthenticationApi.AuthToken(ctx)
	req = req.ModelApiAuthRequest(openapi.ModelApiAuthRequest{ApiToken: c.deepfenceKey})
	resp, _, err := c.openapiClient.AuthenticationApi.AuthTokenExecute(req)
	if err != nil {
		return "", err
	}
	c.Lock()
	c.accessToken = resp.AccessToken
	c.Unlock()
	return resp.AccessToken, nil
}

func (c *Client) PublishAgentReport(r report.Report) ([]byte, error) {
	buf, err := sonic.Marshal(r)
	if err != nil {
		return []byte{}, err
	}
	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	if _, err := gz.Write(buf); err != nil {
		return []byte{}, err
	}
	err = gz.Close()
	if err != nil {
		return []byte{}, err
	}
	return c.httpRequest(
		http.MethodPost,
		c.reportPublishUrl,
		bytes.NewReader(b.Bytes()),
		agentReportPublishHeader,
	)
}

func (c *Client) httpRequest(method string, requestUrl string, postReader io.Reader, header map[string]string) ([]byte, error) {
	retryCount := 0
	var response []byte
	for {
		httpReq, err := http.NewRequest(method, requestUrl, postReader)
		if err != nil {
			return response, err
		}
		httpReq.Close = true

		if header != nil {
			for k, v := range header {
				httpReq.Header.Add(k, v)
			}
		}
		httpReq.Header.Add("Authorization", "Bearer "+c.getAccessToken())
		resp, err := c.httpClient.Do(httpReq)
		if err != nil {
			return response, err
		}

		if resp.StatusCode == http.StatusOK {
			response, err = io.ReadAll(resp.Body)
			if err != nil {
				return response, err
			}
			resp.Body.Close()
			break
		} else {
			if retryCount > 2 {
				errMsg := fmt.Sprintf("Unable to complete request. Got %d ", resp.StatusCode)
				resp.Body.Close()
				return response, errors.New(errMsg)
			}
			if resp.StatusCode == http.StatusUnauthorized {
				_, err = c.updateAccessToken()
				if err != nil {
					return response, err
				}
			}
			resp.Body.Close()
			retryCount += 1
			time.Sleep(5 * time.Second)
		}
	}
	return response, nil
}

func buildHttpClient() (*http.Client, error) {
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig:     tlsConfig,
			DisableKeepAlives:   false,
			DisableCompression:  false,
			MaxIdleConnsPerHost: 1024,
			DialContext: (&net.Dialer{
				Timeout:   30 * time.Second,
				KeepAlive: 5 * time.Minute,
			}).DialContext,
			TLSHandshakeTimeout:   30 * time.Second,
			ResponseHeaderTimeout: 30 * time.Second,
		},
		Timeout: 15 * time.Minute,
	}
	return client, nil
}

package http

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	lo "log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	rhttp "github.com/hashicorp/go-retryablehttp"

	openapi "github.com/deepfence/ThreatMapper/deepfence_server_client"
)

const (
	maxIdleConnsPerHost = 1024
	auth_field          = "Authorization"
	bearer_format       = "Bearer %s"
)

var (
	AuthError = errors.New("Authentication error")
)

type OpenapiHttpClient struct {
	client        *openapi.APIClient
	refresher     *openapi.APIClient
	token_access  sync.RWMutex
	access_token  string
	refresh_token string
}

func (client *OpenapiHttpClient) Client() *openapi.APIClient {
	return client.client
}

func buildHttpClient() *http.Client {
	// Set up our own certificate pool
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	transport := &http.Transport{
		MaxIdleConnsPerHost: maxIdleConnsPerHost,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout: 30 * time.Second,
		TLSClientConfig:     tlsConfig}
	client := &http.Client{Transport: transport}
	return client
}

// Client is not thread safe.
func NewHttpsConsoleClient(url, port string) *OpenapiHttpClient {

	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	transport := &http.Transport{
		MaxIdleConnsPerHost: maxIdleConnsPerHost,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout: 30 * time.Second,
		TLSClientConfig:     tlsConfig}
	rhc := rhttp.NewClient()
	rhc.HTTPClient.Timeout = 10 * time.Second
	rhc.RetryMax = 3
	rhc.RetryWaitMin = 1 * time.Second
	rhc.RetryWaitMax = 10 * time.Second
	rhc.Logger = lo.New(&log.LogInfoWriter{}, "HttpClient", 0)
	rhc.HTTPClient = &http.Client{Transport: transport}

	servers := openapi.ServerConfigurations{
		{
			URL:         fmt.Sprintf("https://%s:%s", url, port),
			Description: "deepfence_server",
		},
	}

	cfg := openapi.NewConfiguration()
	cfg.HTTPClient = rhc.StandardClient()
	cfg.Servers = servers
	client := openapi.NewAPIClient(cfg)

	cfg2 := openapi.NewConfiguration()
	cfg2.HTTPClient = buildHttpClient()
	cfg2.Servers = servers
	refresher := openapi.NewAPIClient(cfg2)

	unique_client := &OpenapiHttpClient{
		client:    client,
		refresher: refresher,
	}

	rhc.CheckRetry = func(ctx context.Context, resp *http.Response, err error) (bool, error) {
		if err != nil || resp == nil {
			return false, err
		}
		if resp.StatusCode == http.StatusUnauthorized {
			err := unique_client.refreshToken()
			return err == nil, err
		}
		return rhttp.DefaultRetryPolicy(ctx, resp, err)
	}

	return unique_client
}

func (cl *OpenapiHttpClient) APITokenAuthenticate(api_token string) error {
	req := cl.client.AuthenticationApi.AuthToken(context.Background()).ModelApiAuthRequest(openapi.ModelApiAuthRequest{
		ApiToken: api_token,
	})
	resp, _, err := cl.client.AuthenticationApi.AuthTokenExecute(req)
	if err != nil {
		return AuthError
	}

	return cl.updateHeaders(resp.GetData())
}

func (cl *OpenapiHttpClient) refreshToken() error {

	req := cl.refresher.AuthenticationApi.AuthTokenRefresh(context.Background())

	resp, _, err := cl.refresher.AuthenticationApi.AuthTokenRefreshExecute(req)
	if err != nil {
		return err
	}

	return cl.updateHeaders(resp.GetData())
}

func (cl *OpenapiHttpClient) updateHeaders(tokens openapi.ModelResponseAccessToken) error {
	cl.token_access.Lock()
	defer cl.token_access.Unlock()
	accessToken := tokens.AccessToken
	refreshToken := tokens.RefreshToken
	if accessToken == "" || refreshToken == "" {
		return AuthError
	}

	cl.client.GetConfig().AddDefaultHeader(auth_field, fmt.Sprintf(bearer_format, accessToken))
	cl.refresher.GetConfig().AddDefaultHeader(auth_field, fmt.Sprintf(bearer_format, refreshToken))
	cl.access_token = accessToken
	cl.refresh_token = refreshToken

	return nil
}

func (cl *OpenapiHttpClient) DumpTokens() (access string, refresh string) {
	cl.token_access.RLock()
	defer cl.token_access.RUnlock()
	return cl.access_token, cl.refresh_token
}

func (cl *OpenapiHttpClient) SetTokens(access string, refresh string) {
	cl.token_access.Lock()
	defer cl.token_access.Unlock()
	cl.access_token = access
	cl.refresh_token = refresh

	cl.client.GetConfig().AddDefaultHeader(auth_field, fmt.Sprintf(bearer_format, access))
	cl.refresher.GetConfig().AddDefaultHeader(auth_field, fmt.Sprintf(bearer_format, refresh))
}

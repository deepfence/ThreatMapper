package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	dfUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	dsc "github.com/deepfence/golang_deepfence_sdk/client"
	dschttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
	rhttp "github.com/hashicorp/go-retryablehttp"
	"github.com/nxadm/tail"
)

var (
	hc          *http.Client
	refreshSync sync.Mutex
)

type Publisher struct {
	ConsoleURLSchema string
	ConsoleHost      string
	ConsolePort      string
	ConsoleURL       string
	Key              string
	BatchSize        int
	AccessToken      string
	RefreshToken     string
}

func getURLWithPath(schema, host, port, path string) string {
	u := &url.URL{
		Scheme: schema,
		Host:   net.JoinHostPort(host, port),
		Path:   path,
	}
	return u.String()
}

func getURL(schema, host, port string) string {
	u := &url.URL{
		Scheme: schema,
		Host:   net.JoinHostPort(host, port),
	}
	return u.String()
}

func Authenticate(url string, apiToken string) (string, string, error) {
	cfg := dsc.NewConfiguration()
	cfg.HTTPClient = hc
	cfg.Servers = dsc.ServerConfigurations{
		{URL: url, Description: "deepfence_server"},
	}

	apiClient := dsc.NewAPIClient(cfg)

	req := apiClient.AuthenticationAPI.AuthToken(context.Background()).
		ModelAPIAuthRequest(
			dsc.ModelAPIAuthRequest{ApiToken: apiToken},
		)

	resp, _, err := apiClient.AuthenticationAPI.AuthTokenExecute(req)
	if err != nil {
		return "", "", err
	}

	accessToken := resp.GetAccessToken()
	refreshToken := resp.GetRefreshToken()
	if accessToken == "" || refreshToken == "" {
		return "", "", errors.New("auth tokens are nil: failed to authenticate")
	}

	log.Print("authenticated with console successfully")

	return accessToken, refreshToken, nil
}

func RefreshToken(url string, apiToken string) (string, string, error) {
	cfg := dsc.NewConfiguration()
	cfg.HTTPClient = hc
	cfg.Servers = dsc.ServerConfigurations{
		{URL: url, Description: "deepfence_server"},
	}

	cfg.AddDefaultHeader("Authorization", "Bearer "+apiToken)

	apiClient := dsc.NewAPIClient(cfg)

	req := apiClient.AuthenticationAPI.AuthTokenRefresh(context.Background())

	resp, _, err := apiClient.AuthenticationAPI.AuthTokenRefreshExecute(req)
	if err != nil {
		return "", "", err
	}

	accessToken := resp.GetAccessToken()
	refreshToken := resp.GetRefreshToken()
	if accessToken == "" || refreshToken == "" {
		return "", "", errors.New("auth tokens are nil: failed to authenticate")
	}

	log.Print("refreshed tokens from console successfully")

	return accessToken, refreshToken, nil
}

func (p *Publisher) validateTokens() error {
	refreshSync.Lock()
	defer refreshSync.Unlock()

	var err error

	if len(p.AccessToken) != 0 && len(p.RefreshToken) != 0 && !dfUtils.IsJWTExpired(p.AccessToken) {
		return nil
	} else {
		p.AccessToken, p.RefreshToken, err = RefreshToken(p.ConsoleURL, p.RefreshToken)
		if err != nil {
			p.AccessToken, p.RefreshToken, err = Authenticate(p.ConsoleURL, p.Key)
			if err != nil {
				return err
			} else {
				log.Print("tokens refreshed using auth")
			}
		} else {
			log.Print("tokens refreshed")
		}
	}

	return nil
}

func NewPublisher(cfg PublisherConfig, maxRetries int, batchSize int) *Publisher {

	rhc := rhttp.NewClient()
	rhc.HTTPClient.Timeout = 10 * time.Second
	rhc.RetryMax = maxRetries
	rhc.RetryWaitMin = 3 * time.Second
	rhc.RetryWaitMax = 30 * time.Second
	rhc.Logger = nil
	// rhc.Logger = stdlog.New(os.Stderr, "", stdlog.LstdFlags|stdlog.Lshortfile)
	rhc.CheckRetry = func(ctx context.Context, resp *http.Response, err error) (bool, error) {
		if err != nil || resp == nil {
			return false, err
		}
		if resp.StatusCode == http.StatusServiceUnavailable {
			return false, err
		}
		return rhttp.DefaultRetryPolicy(ctx, resp, err)
	}

	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.Proxy = http.ProxyFromEnvironment

	if cfg.URLSchema == "https" {
		tr.TLSClientConfig = &tls.Config{
			RootCAs:            x509.NewCertPool(),
			InsecureSkipVerify: true,
		}
		tr.DisableKeepAlives = false
	}
	rhc.HTTPClient.Transport = tr

	hc = rhc.StandardClient()

	if dschttp.IsConsoleAgent(cfg.Host) && strings.Trim(cfg.Key, "\"") == "" {
		internalURL := os.Getenv("MGMT_CONSOLE_URL_INTERNAL")
		internalPort := os.Getenv("MGMT_CONSOLE_PORT_INTERNAL")
		var err error
		if cfg.Key, err = dschttp.GetConsoleApiToken(internalURL, internalPort); err != nil {
			log.Fatal(err.Error())
		}
	}

	pub := &Publisher{
		ConsoleURLSchema: cfg.URLSchema,
		ConsoleHost:      cfg.Host,
		ConsolePort:      cfg.Port,
		ConsoleURL:       getURL(cfg.URLSchema, cfg.Host, cfg.Port),
		Key:              cfg.Key,
		BatchSize:        batchSize,
	}

	if err := pub.validateTokens(); err != nil {
		log.Print(err.Error())
	}

	return pub
}

func (p *Publisher) pushdata(target string, data []map[string]interface{}) error {
	if err := p.validateTokens(); err != nil {
		log.Print(err.Error())
		return err
	}

	url := getURLWithPath(p.ConsoleURLSchema, p.ConsoleHost, p.ConsolePort, target)

	log.Printf("push #data=%d url=%s", len(data), url)

	rawRecords, err := json.Marshal(data)
	if err != nil {
		log.Printf("error marshaling records: %s", err)
		return err
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(rawRecords))
	if err != nil {
		log.Printf("error creating request %s", err)
		return err
	}

	req.Header.Add("Authorization", "Bearer "+p.AccessToken)
	req.Header.Add("Content-Type", "application/json")

	resp, err := hc.Do(req)
	if err != nil {
		log.Printf("error making request %v", err)
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("error response code %s", resp.Status)
		return fmt.Errorf("error invalid response %s", resp.Status)
	}

	return nil
}

func (p *Publisher) Publish(ctx context.Context, basePath string, entry FileEntry, tail *tail.Tail) {

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	records := make([]map[string]interface{}, 0)

	log.Printf("start publish loop file=%s route=%s",
		path.Join(basePath, entry.LocalPath), entry.RemotePath)

	for {
		select {
		case <-ctx.Done():
			log.Printf("stop publish loop file=%s route=%s",
				path.Join(basePath, entry.LocalPath), entry.RemotePath)
			return
		case line := <-tail.Lines:
			var t map[string]interface{}
			if line == nil {
				continue
			}
			if err := json.Unmarshal([]byte(line.Text), &t); err != nil {
				log.Printf("error unmarshaling line: %v", err)
				continue
			}
			records = append(records, t)
			if len(records) >= p.BatchSize {
				p.pushdata(entry.RemotePath, records)
				records = make([]map[string]interface{}, 0)
			}
		case <-ticker.C:
			if len(records) > 0 {
				p.pushdata(entry.RemotePath, records)
				records = make([]map[string]interface{}, 0)
			}
		}
	}
}

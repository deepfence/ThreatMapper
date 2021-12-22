package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net"
	"net/http"
	"os"
	"time"
)

const (
	maxIdleConnsPerHost = 1024
)

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

func authenticateAgentWithConsole(httpClient *http.Client, scopeApiUrl, authKey string) (bool, error) {
	req, err := http.NewRequest("GET", scopeApiUrl, nil)
	if err != nil {
		return false, err
	}
	req.Header.Add("deepfence-key", authKey)
	req.Header.Add("Content-Type", "application/json")
	resp, err := httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return true, nil
	}
	return false, nil
}

func main() {
	authKey := os.Getenv("DEEPFENCE_KEY")
	scopeApiUrl := fmt.Sprintf("https://%s:%s/topology-api", os.Getenv("MGMT_CONSOLE_URL"), os.Getenv("MGMT_CONSOLE_PORT"))
	var httpClient *http.Client
	for {
		if httpClient == nil {
			httpClient = buildHttpClient()
		}
		authenticated, err := authenticateAgentWithConsole(httpClient, scopeApiUrl, authKey)
		if err != nil {
			fmt.Println("Could not connect to Deepfence Management Console. Retrying...")
			time.Sleep(10 * time.Second)
			continue
		}
		if authenticated == true {
			return
		} else {
			os.Exit(1)
		}
	}
}

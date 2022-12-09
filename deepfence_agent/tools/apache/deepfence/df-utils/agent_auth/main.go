package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	openapi "github.com/deepfence/ThreatMapper/deepfence_server_client"
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

func main() {
	authKey := os.Getenv("DEEPFENCE_KEY")
	mgmtConsoleUrl := os.Getenv("MGMT_CONSOLE_URL")
	consolePort := os.Getenv("MGMT_CONSOLE_PORT")

	if mgmtConsoleUrl == "" {
		log.Fatalln("No console URL provided")
	}
	url := fmt.Sprintf("https://%s:%s", mgmtConsoleUrl, consolePort)
	log.Printf("%v with %v", url, authKey)

	cfg := openapi.NewConfiguration()
	cfg.HTTPClient = buildHttpClient()
	cfg.Servers = openapi.ServerConfigurations{
		{
			URL:         url,
			Description: "deepfence_server",
		},
	}
	cl := openapi.NewAPIClient(cfg)
	req := cl.AuthenticationApi.AuthToken(context.Background()).ModelApiAuthRequest(openapi.ModelApiAuthRequest{
		ApiToken: &authKey,
	})

	for {
		res, r, err := cl.AuthenticationApi.AuthTokenExecute(req)

		if err != nil {
			fmt.Printf("err: %v, r: %v...\n", err, r)
			fmt.Println("Could not reach to Deepfence Management Console. Retrying...")
			time.Sleep(10 * time.Second)
			continue
		}

		if r.StatusCode != 200 {
			fmt.Printf("r: %v...\n", r)
			fmt.Println("Could not connect to Deepfence Management Console: Retrying...")
			time.Sleep(10 * time.Second)
		}

		accessToken := res.GetData().AccessToken
		if accessToken == nil {
			log.Println("Failed to authenticate. Retrying...")
			time.Sleep(10 * time.Second)
			continue
		}
		fmt.Printf("%v", accessToken)
		break
	}
}

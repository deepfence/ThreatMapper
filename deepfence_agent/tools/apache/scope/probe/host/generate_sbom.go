package host

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"google.golang.org/grpc"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"time"

	pb "github.com/weaveworks/scope/proto"
)

const (
	syftClientSocket = "/tmp/vulnerability_sbom_plugin.sock"
	certPath         = "/etc/filebeat/filebeat.crt"
	httpOk           = 200
)

var (
	mgmtConsoleUrl string
	deepfenceKey   string
)

func init() {
	mgmtConsoleUrl = os.Getenv("MGMT_CONSOLE_URL") + ":" + os.Getenv("MGMT_CONSOLE_PORT")
	deepfenceKey = os.Getenv("DEEPFENCE_KEY")
}

func createSyftClient() (pb.SyftPluginClient, error) {
	conn, err := grpc.Dial("unix://"+syftClientSocket, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		return nil, err
	}
	return pb.NewSyftPluginClient(conn), nil
}

func buildClient() (*http.Client, error) {
	// Set up our own certificate pool
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig:     tlsConfig,
			DisableKeepAlives:   false,
			MaxIdleConnsPerHost: 1024,
			DialContext: (&net.Dialer{
				Timeout:   15 * time.Minute,
				KeepAlive: 15 * time.Minute,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 5 * time.Minute,
		},
		Timeout: 15 * time.Minute,
	}

	// Load our trusted certificate path
	pemData, err := ioutil.ReadFile(certPath)
	if err != nil {
		return nil, err
	}
	ok := tlsConfig.RootCAs.AppendCertsFromPEM(pemData)
	if !ok {
		return nil, errors.New("Unable to append certificates to PEM")
	}

	return client, nil
}

func sendSBOMtoConsole(sbomStr string) error {
	httpClient, err := buildClient()
	if err != nil {
		return err
	}
	postReader := bytes.NewReader([]byte(sbomStr))
	retryCount := 0
	for {
		httpReq, err := http.NewRequest("POST", "https://"+mgmtConsoleUrl+"/mapper-api/find-vulnerabilities", postReader)
		if err != nil {
			return err
		}
		httpReq.Close = true
		httpReq.Header.Add("deepfence-key", deepfenceKey)
		resp, err := httpClient.Do(httpReq)
		if err != nil {
			return err
		}
		if resp.StatusCode == httpOk {
			resp.Body.Close()
			break
		} else {
			if retryCount > 5 {
				errMsg := fmt.Sprintf("Unable to complete request. Got %d ", resp.StatusCode)
				resp.Body.Close()
				return errors.New(errMsg)
			}
			resp.Body.Close()
			retryCount += 1
			time.Sleep(5 * time.Second)
		}
	}
	return nil
}

func GenerateSbomForVulnerabilityScan(imageName, imageId, scanId, kubernetesClusterName, scanType string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	syftClient, err := createSyftClient()
	if err != nil {
		return err
	}
	res, err := syftClient.GetVulnerabilitySBOM(ctx, &pb.SBOMRequest{UserInput: imageName})
	if err != nil {
		return err
	}
	return sendSBOMtoConsole(res.String())
}

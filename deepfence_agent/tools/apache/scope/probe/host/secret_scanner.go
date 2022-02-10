package host

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/probe/secret_scanner"
	"google.golang.org/grpc"
	"github.com/gomodule/redigo/redis"
	elastic "github.com/olivere/elastic/v7"
	"io/ioutil"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	secretScanIndexName     = "secret-scan"
	secretScanLogsIndexName = "secret-scan-logs"
	redisSecretScanChannel  = "secret_scan_task_queue"
)
var certPath = "/etc/filebeat/filebeat.crt"
var httpClient *http.Client

func (r *Reporter) startSecretsScan(req xfer.Request) xfer.Response {
	nodeType := fmt.Sprintf("%s", req.ControlArgs["node_type"])
	var greq secret_scanner.FindRequest
	if nodeType == nodeTypeContainer {
		containerID := fmt.Sprintf("%s", req.ControlArgs["container_id"])
		if containerID == "" {
			return xfer.ResponseErrorf("container_id is required")
		}
		greq = secret_scanner.FindRequest{Input: secret_scanner.FindRequest_Container{
			Container: secret_scanner.Container{Id: containerID},
		}}
	} else if nodeType == nodeTypeImage {
		imageId := fmt.Sprintf("%s", req.ControlArgs["image_id"])
		if imageId == "" {
			return xfer.ResponseErrorf("image_id is required")
		}
		imageName := fmt.Sprintf("%s", req.ControlArgs["image_id"])
		greq = secret_scanner.FindRequest{Input: secret_scanner.FindRequest_Image{
			Image: secret_scanner.DockerImage{Id: imageId, Name: imageName},
		}}
	} else if nodeType == nodeTypeHost {
		greq = secret_scanner.FindRequest{Input: secret_scanner.FindRequest_Path{Path: HostMountDir}}
	}
	client, err := newSecretScannerClient()
	if err != nil {
		return xfer.Response{SecretsScanInfo: "Error creating ss client"}
	}
	go getAndPublishSecretScanResults(client, greq)
	return xfer.Response{SecretsScanInfo: "Secrets scan started"}
}

func getAndPublishSecretScanResults(client secret_scanner.SecretScannerClient, req secret_scanner.FindRequest) {
	// TODO get scan id from df-backend
	res, err := client.FindSecretInfo(context.Background(), req)
	if err != nil {
		scanLog := fmt.Sprintf("{\"scan_id\":\"%d\",\"time_stamp\":%d,\"secret_scan_message\":\"%s\",\"action\":\"%s\",\"type\":\"secret-scan\",}", getTimestamp(), getTimestamp(), err.Error(), "ERROR")
		sendSecretScanDataToLogstash(scanLog, secretScanLogsIndexName)
	}
	for _, secret := range res.Secrets {
		// TODO handle marshal error
		secretString, _ := json.Marshal(secret)
		scanLog := fmt.Sprintf("{\"scan_id\":\"%d\",\"time_stamp\":%d,\"secret_scan_data\":\"%s\"}", getTimestamp(), getTimestamp(), string(secretString))
		sendSecretScanDataToLogstash(scanLog, secretScanIndexName)
	}

}

func getTimestamp() int64 {
	return time.Now().UTC().UnixNano() / 1000000
}

func sendSecretScanDataToLogstash(secretScanMsg string, index string) error {
	mgmtConsoleUrl := os.Getenv("MGMT_CONSOLE_URL") + ":" + os.Getenv("MGMT_CONSOLE_PORT")
	deepfenceKey := os.Getenv("DEEPFENCE_KEY")
	secretScanMsg = strings.Replace(secretScanMsg, "\n", " ", -1)
	postReader := bytes.NewReader([]byte(secretScanMsg))
	retryCount := 0
	httpClient, err := buildClient()
	if err != nil {
		fmt.Println("Error building http client " + err.Error())
		return err
	}
	for {
		httpReq, err := http.NewRequest("POST", "https://"+mgmtConsoleUrl+"/df-api/add-to-logstash?doc_type=" + index, postReader)
		if err != nil {
			return err
		}
		httpReq.Close = true
		httpReq.Header.Add("deepfence-key", deepfenceKey)
		resp, err := httpClient.Do(httpReq)
		if err != nil {
			return err
		}
		if resp.StatusCode == 200 {
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

func newSecretScannerClient() (secret_scanner.SecretScannerClient, error) {
	addr, dailer, err := getAddressAndDialer(secretScanSocket)
	if err != nil {
		return nil, err
	}
	conn, err := grpc.Dial(addr, grpc.WithInsecure(), grpc.WithDialer(dailer))
	if err != nil {
		return nil, err
	}
	return secret_scanner.NewSecretScannerClient(conn), nil
}

func dial(addr string, timeout time.Duration) (net.Conn, error) {
	return net.DialTimeout(unixProtocol, addr, timeout)
}

func getAddressAndDialer(endpoint string) (string, func(addr string, timeout time.Duration) (net.Conn, error), error) {
	addr, err := parseEndpointWithFallbackProtocol(endpoint, unixProtocol)
	if err != nil {
		return "", nil, err
	}

	return addr, dial, nil
}

func parseEndpointWithFallbackProtocol(endpoint string, fallbackProtocol string) (addr string, err error) {
	var protocol string

	protocol, addr, err = parseEndpoint(endpoint)

	if err != nil {
		return "", err
	}

	if protocol == "" {
		fallbackEndpoint := fallbackProtocol + "://" + endpoint
		_, addr, err = parseEndpoint(fallbackEndpoint)

		if err != nil {
			return "", err
		}
	}
	return addr, err
}

func parseEndpoint(endpoint string) (string, string, error) {
	u, err := url.Parse(endpoint)

	if err != nil {
		return "", "", err
	}

	switch u.Scheme {
	case tcpProtocol:
		return tcpProtocol, u.Host, fmt.Errorf("endpoint was not unix socket %v", u.Scheme)
	case unixProtocol:
		return unixProtocol, u.Path, nil
	case "":
		return "", "", nil
	default:
		return u.Scheme, "", fmt.Errorf("protocol %q not supported", u.Scheme)
	}
}

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
	"io/ioutil"
	"net"
	"net/http"
	"net/url"
	"os"
	"reflect"
	"strings"
	"time"
)

const (
	secretScanIndexName     = "secret-scan"
	secretScanLogsIndexName = "secret-scan-logs"
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
	go getAndPublishSecretScanResults(client, greq, req.ControlArgs)
	return xfer.Response{SecretsScanInfo: "Secrets scan started"}
}

func getAndPublishSecretScanResults(client secret_scanner.SecretScannerClient, req secret_scanner.FindRequest, controlArgs map[string]string) {
	res, err := client.FindSecretInfo(context.Background(), req)
	timestamp := getTimestamp()
	for _, secret := range res.Secrets {
		var secretScanDoc map[string]interface{}
		secretScanDoc["node_id"] = controlArgs["node_id"]
		secretScanDoc["scan_id"] = controlArgs["scan_id"]
		secretScanDoc["scan_status"] = controlArgs["COMPLETE"]
		secretScanDoc["time_stamp"] = timestamp
		values := reflect.ValueOf(secret)
		typeOfS := values.Type()
		for index := 0; index < values.NumField(); index++ {
			secretScanDoc[typeOfS.Field(index).Name] = values.Field(index).Interface()
		}
		byteJson, err := json.Marshal(secretScanDoc)
		if err != nil {
			fmt.Println("Error in marshalling secret result object to json:" + err.Error())
			return
		}
		err = sendSecretScanDataToLogstash(string(byteJson), secretScanIndexName)
		if err != nil {
			fmt.Println("Error in sending data to secretScanIndex:" + err.Error())
		}
	}
	if err != nil {
		var secretScanLogDoc map[string]interface{}
		secretScanLogDoc["node_id"] = controlArgs["node_id"]
		secretScanLogDoc["scan_id"] = controlArgs["scan_id"]
		secretScanLogDoc["scan_status"] = controlArgs["COMPLETE"]
		secretScanLogDoc["time_stamp"] = timestamp
		byteJson, err := json.Marshal(secretScanLogDoc)
		if err != nil {
			fmt.Println("Error in marshalling secretScanLogDoc to json:" + err.Error())
			return
		}
		err = sendSecretScanDataToLogstash(string(byteJson) , secretScanLogsIndexName)
		if err != nil {
			fmt.Println("Error in sending data to secretScanLogsIndex:" + err.Error())
		}
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

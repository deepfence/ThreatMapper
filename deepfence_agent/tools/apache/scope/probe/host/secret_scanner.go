package host

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/Jeffail/tunny"
	"github.com/weaveworks/scope/common/xfer"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
)

const (
	ebpfSocketPath          = "/tmp/secret-scanner.sock"
	ssEbpfLogPath           = "/var/log/fenced/secretScanner.log"
	defaultScanConcurrency  = 5
	secretScanIndexName     = "secret-scan"
	secretScanLogsIndexName = "secret-scan-logs"
)

var certPath = "/etc/filebeat/filebeat.crt"

var (
	scanConcurrency    int
	grpcScanWorkerPool *tunny.Pool
	mgmtConsoleUrl     string
	deepfenceKey       string
	scanDir            string
)

type secretScanParameters struct {
	client      pb.SecretScannerClient
	req         pb.FindRequest
	controlArgs map[string]string
	hostName    string
	r           *Reporter
}

func init() {
	var err error
	scanConcurrency, err = strconv.Atoi(os.Getenv("SECRET_SCAN_CONCURRENCY"))
	if err != nil {
		scanConcurrency = defaultScanConcurrency
	}
	grpcScanWorkerPool = tunny.NewFunc(scanConcurrency, getAndPublishSecretScanResultsWrapper)
	mgmtConsoleUrl = os.Getenv("MGMT_CONSOLE_URL")
	consolePort := os.Getenv("MGMT_CONSOLE_PORT")
	if consolePort != "" && consolePort != "443" {
		mgmtConsoleUrl += ":" + consolePort
	}
	deepfenceKey = os.Getenv("DEEPFENCE_KEY")
	if os.Getenv("DF_SERVERLESS") == "true" {
		certPath = "/deepfence/etc/filebeat/filebeat.crt"
		scanDir = "/"
	} else {
		scanDir = HostMountDir
	}
}

func (r *Reporter) startSecretsScan(req xfer.Request) xfer.Response {
	nodeType := fmt.Sprintf("%s", req.ControlArgs["node_type"])
	var greq pb.FindRequest
	if nodeType == nodeTypeContainer {
		containerID := fmt.Sprintf("%s", req.ControlArgs["container_id"])
		if containerID == "" {
			return xfer.ResponseErrorf("container_id is required")
		}
		greq = pb.FindRequest{Input: &pb.FindRequest_Container{
			Container: &pb.Container{Id: containerID},
		}}
	} else if nodeType == nodeTypeImage {
		imageId := fmt.Sprintf("%s", req.ControlArgs["image_id"])
		if imageId == "" {
			return xfer.ResponseErrorf("image_id is required")
		}
		imageName := fmt.Sprintf("%s", req.ControlArgs["image_name"])
		greq = pb.FindRequest{Input: &pb.FindRequest_Image{
			Image: &pb.DockerImage{Id: imageId, Name: imageName},
		}}
	} else if nodeType == nodeTypeHost {
		greq = pb.FindRequest{Input: &pb.FindRequest_Path{Path: scanDir}}
	}
	ssClient, err := newSecretScannerClient()
	if err != nil {
		return xfer.ResponseErrorf("error in getting ss client: %s", err.Error())
	}
	go grpcScanWorkerPool.Process(secretScanParameters{
		client:      ssClient,
		req:         greq,
		controlArgs: req.ControlArgs,
		hostName:    r.hostName,
		r:           r,
	})
	return xfer.Response{SecretsScanInfo: "Secrets scan started"}
}

func getAndPublishSecretScanResultsWrapper(scanParametersInterface interface{}) interface{} {
	scanParameters, ok := scanParametersInterface.(secretScanParameters)
	if !ok {
		fmt.Println("Error reading input from grpc API")
		return nil
	}
	getAndPublishSecretScanResults(scanParameters.client, scanParameters.req, scanParameters.controlArgs,
		scanParameters.hostName, scanParameters.r)
	return nil
}

func getAndPublishSecretScanResults(client pb.SecretScannerClient, req pb.FindRequest, controlArgs map[string]string, hostName string, r *Reporter) {
	var secretScanLogDoc = make(map[string]interface{})
	secretScanLogDoc["node_id"] = controlArgs["node_id"]
	secretScanLogDoc["node_type"] = controlArgs["node_type"]
	secretScanLogDoc["node_name"] = hostName
	secretScanLogDoc["container_name"] = controlArgs["container_name"]
	secretScanLogDoc["kubernetes_cluster_name"] = controlArgs["kubernetes_cluster_name"]
	secretScanLogDoc["host_name"] = hostName
	secretScanLogDoc["scan_id"] = controlArgs["scan_id"]
	secretScanLogDoc["masked"] = "false"
	secretScanLogDoc["scan_status"] = "IN_PROGRESS"
	secretScanLogDoc["time_stamp"] = getTimestamp()
	secretScanLogDoc["@timestamp"] = getCurrentTime()
	byteJson, err := json.Marshal(secretScanLogDoc)
	if err != nil {
		fmt.Println("Error in marshalling in progress secretScanLogDoc to json:" + err.Error())
		return
	}
	err = ingestScanData(string(byteJson), secretScanLogsIndexName)
	if err != nil {
		fmt.Println("Error in sending data to secretScanLogsIndex to mark in progress:" + err.Error())
	}
	res, err := client.FindSecretInfo(context.Background(), &req)
	if req.GetPath() != "" && err == nil && res != nil {
		if scanDir == HostMountDir {
			for _, secret := range res.Secrets {
				secret.GetMatch().FullFilename = strings.Replace(secret.GetMatch().GetFullFilename(), HostMountDir, "", 1)
			}
		}
	}
	timestamp := getTimestamp()
	currTime := getCurrentTime()
	if err != nil {
		secretScanLogDoc["scan_status"] = "ERROR"
		secretScanLogDoc["scan_message"] = err.Error()
		secretScanLogDoc["time_stamp"] = getTimestamp()
		secretScanLogDoc["@timestamp"] = getCurrentTime()
		byteJson, _ = json.Marshal(secretScanLogDoc)
		ingestScanData(string(byteJson), secretScanLogsIndexName)
		return
	} else {
		fmt.Println("Number of results received from SecretScanner for scan id:" + controlArgs["scan_id"] + " - " + strconv.Itoa(len(res.Secrets)))
	}
	for _, secret := range res.Secrets {
		var secretScanDoc = make(map[string]interface{})
		secretScanDoc["node_id"] = controlArgs["node_id"]
		secretScanDoc["node_type"] = controlArgs["node_type"]
		secretScanDoc["node_name"] = hostName
		secretScanDoc["masked"] = "false"
		secretScanDoc["host_name"] = hostName
		secretScanDoc["scan_id"] = controlArgs["scan_id"]
		secretScanDoc["container_name"] = controlArgs["container_name"]
		secretScanDoc["kubernetes_cluster_name"] = controlArgs["kubernetes_cluster_name"]
		secretScanDoc["time_stamp"] = timestamp
		secretScanDoc["@timestamp"] = currTime
		values := reflect.ValueOf(*secret)
		typeOfS := values.Type()
		for index := 0; index < values.NumField(); index++ {
			if values.Field(index).CanInterface() {
				secretScanDoc[typeOfS.Field(index).Name] = values.Field(index).Interface()
			}
		}
		byteJson, err := json.Marshal(secretScanDoc)
		if err != nil {
			fmt.Println("Error in marshalling secret result object to json:" + err.Error())
			return
		}
		err = ingestScanData(string(byteJson), secretScanIndexName)
		if err != nil {
			fmt.Println("Error in sending data to secretScanIndex:" + err.Error())
		}
	}
	if err == nil {
		secretScanLogDoc["scan_status"] = "COMPLETE"
	} else {
		secretScanLogDoc["scan_status"] = "ERROR"
		secretScanLogDoc["scan_message"] = err.Error()
	}
	secretScanLogDoc["time_stamp"] = timestamp
	secretScanLogDoc["@timestamp"] = currTime
	byteJson, err = json.Marshal(secretScanLogDoc)
	if err != nil {
		fmt.Println("Error in marshalling secretScanLogDoc to json:" + err.Error())
		return
	}
	err = ingestScanData(string(byteJson), secretScanLogsIndexName)
	if err != nil {
		fmt.Println("Error in sending data to secretScanLogsIndex:" + err.Error())
	}

}

func getTimestamp() int64 {
	return time.Now().UTC().UnixNano() / 1000000
}

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

func ingestScanData(secretScanMsg string, index string) error {
	secretScanMsg = strings.Replace(secretScanMsg, "\n", " ", -1)
	postReader := bytes.NewReader([]byte(secretScanMsg))
	retryCount := 0
	httpClient, err := buildClient()
	if err != nil {
		fmt.Println("Error building http client " + err.Error())
		return err
	}
	for {
		httpReq, err := http.NewRequest("POST", "https://"+mgmtConsoleUrl+"/df-api/ingest?doc_type="+index, postReader)
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

func newSecretScannerClient() (pb.SecretScannerClient, error) {
	conn, err := grpc.Dial("unix://"+ebpfSocketPath, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		fmt.Printf("error in creating secret scanner client: %s\n", err.Error())
		return nil, err
	}
	return pb.NewSecretScannerClient(conn), nil
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
		return nil, errors.New("unable to append certificates to PEM")
	}

	return client, nil
}

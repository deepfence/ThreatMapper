package host

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
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
	secretScannerSocketPath = "/tmp/secret-scanner.sock"
	defaultScanConcurrency  = 1
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
		fmt.Println("Error marshalling json: ", err)
		return
	}
	// byteJson := formatToKafka(secretScanLogDoc)

	err = writeScanDataToFile(string(byteJson), secretScanLogsIndexName)
	if err != nil {
		fmt.Println("Error in sending data to secretScanLogsIndex to mark in progress:" + err.Error())
	}

	stopScanStatus := make(chan bool, 1)
	go func(secretScanLogDoc map[string]interface{}) {
		ticker := time.NewTicker(2 * time.Minute)
		for {
			select {
			case <-ticker.C:
				secretScanLogDoc["scan_status"] = "IN_PROGRESS"
				secretScanLogDoc["time_stamp"] = getTimestamp()
				secretScanLogDoc["@timestamp"] = getCurrentTime()
				byteJson, _ = json.Marshal(secretScanLogDoc)
				writeScanDataToFile(string(byteJson), secretScanLogsIndexName)
			case <-stopScanStatus:
				return
			}
		}
	}(secretScanLogDoc)

	res, err := client.FindSecretInfo(context.Background(), &req)
	if req.GetPath() != "" && err == nil && res != nil {
		if scanDir == HostMountDir {
			for _, secret := range res.Secrets {
				secret.GetMatch().FullFilename = strings.Replace(secret.GetMatch().GetFullFilename(), HostMountDir, "", 1)
			}
		}
	}

	stopScanStatus <- true
	time.Sleep(2 * time.Second)
	timestamp := getTimestamp()
	currTime := getCurrentTime()
	if err != nil {
		secretScanLogDoc["scan_status"] = "ERROR"
		secretScanLogDoc["scan_message"] = err.Error()
		secretScanLogDoc["time_stamp"] = getTimestamp()
		secretScanLogDoc["@timestamp"] = getCurrentTime()
		byteJson, err = json.Marshal(secretScanLogDoc)
		if err != nil {
			fmt.Println("Error marshalling json: ", err)
			return
		}
		// byteJson = formatToKafka(secretScanLogDoc)
		writeScanDataToFile(string(byteJson), secretScanLogsIndexName)
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
			fmt.Println("Error marshalling json: ", err)
			continue
		}
		// byteJson := formatToKafka(secretScanDoc)
		err = writeScanDataToFile(string(byteJson), secretScanIndexName)
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
		fmt.Println("Error marshalling json: ", err)
		return
	}
	// byteJson = formatToKafka(secretScanLogDoc)
	err = writeScanDataToFile(string(byteJson), secretScanLogsIndexName)
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

func writeScanDataToFile(secretScanMsg string, index string) error {
	scanFilename := getDfInstallDir() + "/var/log/fenced/secret-scan/secret_scan.log"
	scanStatusFilename := getDfInstallDir() + "/var/log/fenced/secret-scan-log/secret_scan_log.log"
	files := map[string]string{
		secretScanIndexName:     scanFilename,
		secretScanLogsIndexName: scanStatusFilename,
	}

	filename := files[index]
	err := os.MkdirAll(filepath.Dir(filename), 0755)
	f, err := os.OpenFile(filename, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0600)
	if err != nil {
		return err
	}

	defer f.Close()

	secretScanMsg = strings.Replace(secretScanMsg, "\n", " ", -1)
	if _, err = f.WriteString(secretScanMsg + "\n"); err != nil {
		return err
	}
	return nil
}

func newSecretScannerClient() (pb.SecretScannerClient, error) {
	maxMsgSize := 1024 * 1024 * 100 // 100 mb
	conn, err := grpc.Dial("unix://"+secretScannerSocketPath, grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMsgSize)),
		grpc.WithAuthority("dummy"), grpc.WithInsecure())
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
	pemData, err := os.ReadFile(certPath)
	if err != nil {
		return nil, err
	}
	ok := tlsConfig.RootCAs.AppendCertsFromPEM(pemData)
	if !ok {
		return nil, errors.New("unable to append certificates to PEM")
	}

	return client, nil
}

// func formatToKafka(data map[string]interface{}) []byte {
// 	encoded, err := json.Marshal(&data)
// 	if err != nil {
// 		fmt.Println("Error in marshalling in progress secretScan data to json:" + err.Error())
// 		return nil
// 	}
// 	value := "{\"value\":" + string(encoded) + "}"
// 	return []byte("{\"records\":[" + value + "]}")
// }

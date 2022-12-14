package host

import (
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
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/Jeffail/tunny"
	log "github.com/sirupsen/logrus"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
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
	req         *pb.FindRequest
	controlArgs map[string]string
	hostName    string
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

func StartSecretsScan(req ctl.StartSecretScanRequest) error {
	log.Infof("Start secret scan: %v\n", req)
	var greq pb.FindRequest
	switch req.ResourceType {
	case ctl.Container:
		greq = pb.FindRequest{Input: &pb.FindRequest_Container{
			Container: &pb.Container{Id: req.ResourceId},
		}}
	case ctl.Image:
		splits := strings.Split(req.ResourceId, ";")
		if len(splits) != 2 {
			return errors.New("Image id format is incorrect")
		}
		greq = pb.FindRequest{Input: &pb.FindRequest_Image{
			Image: &pb.DockerImage{Id: splits[0], Name: splits[1]},
		}}
	case ctl.Host:
		greq = pb.FindRequest{Input: &pb.FindRequest_Path{Path: req.ResourceId}}
	}

	ssClient, err := newSecretScannerClient()
	if err != nil {
		return err
	}
	go grpcScanWorkerPool.Process(secretScanParameters{
		client:      ssClient,
		req:         &greq,
		controlArgs: req.BinArgs,
		hostName:    req.Hostname,
	})
	return nil
}

func getAndPublishSecretScanResultsWrapper(scanParametersInterface interface{}) interface{} {
	scanParameters, ok := scanParametersInterface.(secretScanParameters)
	if !ok {
		fmt.Println("Error reading input from grpc API")
		return nil
	}
	getAndPublishSecretScanResults(scanParameters.client, scanParameters.req, scanParameters.controlArgs,
		scanParameters.hostName)
	return nil
}

func getAndPublishSecretScanResults(client pb.SecretScannerClient, req *pb.FindRequest, controlArgs map[string]string, hostName string) {
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
	log.Infof("started context background: %v\n", req.Input)
	res, err := client.FindSecretInfo(context.Background(), req)
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

// func formatToKafka(data map[string]interface{}) []byte {
// 	encoded, err := json.Marshal(&data)
// 	if err != nil {
// 		fmt.Println("Error in marshalling in progress secretScan data to json:" + err.Error())
// 		return nil
// 	}
// 	value := "{\"value\":" + string(encoded) + "}"
// 	return []byte("{\"records\":[" + value + "]}")
// }

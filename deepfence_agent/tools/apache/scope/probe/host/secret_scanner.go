package host

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"

	"github.com/Jeffail/tunny"
	log "github.com/sirupsen/logrus"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"

	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
)

const (
	ebpfSocketPath         = "/tmp/secret-scanner.sock"
	ssEbpfLogPath          = "/var/log/fenced/secretScanner.log"
	defaultScanConcurrency = 1
)

var certPath = "/etc/filebeat/filebeat.crt"

var (
	scanConcurrency    int
	grpcScanWorkerPool *tunny.Pool
	mgmtConsoleUrl     string
	deepfenceKey       string
	scanDir            string

	scanFilename       = getDfInstallDir() + "/var/log/fenced/secret-scan/secret_scan.log"
	scanStatusFilename = getDfInstallDir() + "/var/log/fenced/secret-scan-log/secret_scan_log.log"
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
	grpcScanWorkerPool = tunny.NewFunc(scanConcurrency,
		getAndPublishSecretScanResultsWrapper)
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
	switch req.NodeType {
	case ctl.Container:
		greq = pb.FindRequest{
			Input: &pb.FindRequest_Container{
				Container: &pb.Container{Id: req.BinArgs["node_id"]},
			},
			ScanId: req.BinArgs["scan_id"],
		}
	case ctl.Image:
		greq = pb.FindRequest{
			Input: &pb.FindRequest_Image{
				Image: &pb.DockerImage{Id: req.BinArgs["node_id"], Name: req.BinArgs["image_name"]},
			},
			ScanId: req.BinArgs["scan_id"],
		}
	case ctl.Host:
		greq = pb.FindRequest{
			Input:  &pb.FindRequest_Path{Path: "/fenced/mnt/host"},
			ScanId: req.BinArgs["scan_id"],
		}
	}

	ssClient, err := newSecretScannerClient()
	if err != nil {
		return err
	}
	go grpcScanWorkerPool.Process(secretScanParameters{
		client:      ssClient,
		req:         &greq,
		controlArgs: req.BinArgs,
	})
	return nil
}

func getAndPublishSecretScanResultsWrapper(scanParametersInterface interface{}) interface{} {
	scanParameters, ok := scanParametersInterface.(secretScanParameters)
	if !ok {
		fmt.Println("Error reading input from grpc API")
		return nil
	}
	getAndPublishSecretScanResults(scanParameters.client, scanParameters.req,
		scanParameters.controlArgs, scanParameters.hostName)
	return nil
}

func getAndPublishSecretScanResults(client pb.SecretScannerClient, req *pb.FindRequest, controlArgs map[string]string, hostName string) {

	res, err := client.FindSecretInfo(context.Background(), req)
	if req.GetPath() != "" && err == nil && res != nil {
		if scanDir == HostMountDir {
			for _, secret := range res.Secrets {
				secret.GetMatch().FullFilename = strings.Replace(secret.GetMatch().GetFullFilename(), HostMountDir, "", 1)
			}
		}
	}

	if err != nil {
		fmt.Println("FindSecretInfo error" + err.Error())
		return
	}

	fmt.Println("Number of results received from SecretScanner for scan id:" + controlArgs["scan_id"] + " - " + strconv.Itoa(len(res.Secrets)))

	for _, secret := range res.Secrets {
		var secretScanDoc = make(map[string]interface{})
		secretScanDoc["scan_id"] = controlArgs["scan_id"]
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
		err = writeScanDataToFile(string(byteJson), scanFilename)
		if err != nil {
			fmt.Println("Error in sending data to secretScanIndex:" + err.Error())
		}
	}
}

func writeScanDataToFile(secretScanMsg string, filename string) error {
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
	conn, err := grpc.Dial("unix://"+ebpfSocketPath, grpc.WithAuthority("dummy"),
		grpc.WithInsecure())
	if err != nil {
		fmt.Printf("error in creating secret scanner client: %s\n", err.Error())
		return nil, err
	}
	return pb.NewSecretScannerClient(conn), nil
}

func GetSecretScannerJobCount() int32 {
	conn, err := grpc.Dial("unix://"+ebpfSocketPath, grpc.WithAuthority("dummy"),
		grpc.WithInsecure())
	if err != nil {
		fmt.Printf("error in creating secret scanner client: %s\n", err.Error())
		return 0
	}
	client := pb.NewScannersClient(conn)
	jobReport, err := client.ReportJobsStatus(context.Background(), &pb.Empty{})
	if err != nil {
		return 0
	}
	return jobReport.RunningJobs
}

package host

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/weaveworks/scope/common/xfer"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
	"net/http"
	"os"
	"os/exec"
	"reflect"
	"strings"
	"time"
)

const (
	secretScanIndexName     = "secret-scan"
	secretScanLogsIndexName = "secret-scan-logs"
	ssEbpfExePath = "/home/deepfence/bin/SecretScanner"
)
var certPath = "/etc/filebeat/filebeat.crt"
var httpClient *http.Client

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
		imageName := fmt.Sprintf("%s", req.ControlArgs["image_id"])
		greq = pb.FindRequest{Input: &pb.FindRequest_Image{
			Image: &pb.DockerImage{Id: imageId, Name: imageName},
		}}
	} else if nodeType == nodeTypeHost {
		greq = pb.FindRequest{Input: &pb.FindRequest_Path{Path: HostMountDir}}
	}
	if err != nil {
		return xfer.Response{SecretsScanInfo: "Error creating ss client"}
	}
	go getAndPublishSecretScanResults(r.secretScanner.client, greq, req.ControlArgs)
	return xfer.Response{SecretsScanInfo: "Secrets scan started"}
}

func getAndPublishSecretScanResults(client pb.SecretScannerClient, req pb.FindRequest, controlArgs map[string]string) {
	res, err := client.FindSecretInfo(context.Background(), &req)
	timestamp := getTimestamp()
	currTime := getCurrentTime()
	if err != nil {
		fmt.Println("Error from secretScan grpc server:" + err.Error())
		return
	}
	for _, secret := range res.Secrets {
		var secretScanDoc map[string]interface{}
		secretScanDoc["node_id"] = controlArgs["node_id"]
		secretScanDoc["scan_id"] = controlArgs["scan_id"]
		secretScanDoc["scan_status"] = controlArgs["COMPLETE"]
		secretScanDoc["time_stamp"] = timestamp
		secretScanDoc["@timestamp"] = currTime
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
		secretScanLogDoc["@timestamp"] = currTime
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

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
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

type SecretScanner struct {
	conn    *grpc.ClientConn
	client  pb.SecretScannerClient
	command *exec.Cmd
}

func NewSecretScanner() (*SecretScanner, error) {
	ebpfSocket := generateSocketString()
	command := exec.Command("prlimit", mem_lock_size, ssEbpfExePath, fmt.Sprintf(ebpf_opt_format, ebpfSocket))
	err := command.Start()
	if err != nil {
		return nil, err
	}

	conn, err := grpc.Dial("unix://"+ebpfSocket, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		command.Process.Kill()
		return nil, err
	}
	client := pb.NewSecretScannerClient(conn)
	return &SecretScanner{
		conn:    conn,
		client:  client,
		command: command,
	}, nil
}

func (it *SecretScanner) Stop() {
	it.command.Process.Kill()
	it.conn.Close()
}

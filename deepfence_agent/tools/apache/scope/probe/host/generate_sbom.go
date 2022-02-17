package host

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"github.com/sirupsen/logrus"
	scopeHostname "github.com/weaveworks/scope/common/hostname"
	"google.golang.org/grpc"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	pb "github.com/weaveworks/scope/proto"
)

const (
	packageScannerSocket = "/tmp/package-scanner.sock"
	httpOk               = 200
)

var (
	mgmtConsoleUrl string
	deepfenceKey   string
	scanPath       = "dir:/fenced/mnt/host/"
)

func init() {
	mgmtConsoleUrl = os.Getenv("MGMT_CONSOLE_URL") + ":" + os.Getenv("MGMT_CONSOLE_PORT")
	deepfenceKey = os.Getenv("DEEPFENCE_KEY")
	if os.Getenv("DF_SERVERLESS") == "true" {
		scanPath = "dir:/"
	}
}

func createPackageScannerClient() (pb.PackageScannerClient, error) {
	maxMsgSize := 1024 * 1024 * 20 // 20 mb
	conn, err := grpc.Dial("unix://"+packageScannerSocket, grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMsgSize)),
		grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		return nil, err
	}
	return pb.NewPackageScannerClient(conn), nil
}

func buildHttpClient() (*http.Client, error) {
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
	return client, nil
}

func sendSBOMtoConsole(imageName, imageId, scanId, kubernetesClusterName, hostName, nodeId, nodeType, scanType, sbomStr string) error {
	httpClient, err := buildHttpClient()
	if err != nil {
		return err
	}
	postReader := bytes.NewReader([]byte(sbomStr))
	retryCount := 0
	for {
		urlValues := url.Values{}
		urlValues.Set("image_name", imageName)
		urlValues.Set("image_id", imageId)
		urlValues.Set("scan_id", scanId)
		urlValues.Set("kubernetes_cluster_name", kubernetesClusterName)
		urlValues.Set("host_name", hostName)
		urlValues.Set("node_id", nodeId)
		urlValues.Set("node_type", nodeType)
		urlValues.Set("scan_type", scanType)
		requestUrl := fmt.Sprintf("https://"+mgmtConsoleUrl+"/vulnerability-mapper-api/vulnerability-scan?%s", urlValues.Encode())
		httpReq, err := http.NewRequest("POST", requestUrl, postReader)
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

func GenerateSbomForVulnerabilityScan(imageName, imageId, scanId, kubernetesClusterName, scanType string) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Minute)
	defer cancel()

	hostName := scopeHostname.Get()
	stopLogging := make(chan bool)
	var nodeId string
	var nodeType string
	if imageName == "host" {
		nodeId = hostName
		nodeType = "host"
	} else {
		nodeId = imageName
		nodeType = "container_image"
	}

	go func() {
		err := IngestScanStatus("", "UPLOADING_IMAGE", scanId, nodeType, nodeId, scanType, hostName, kubernetesClusterName)
		if err != nil {
			fmt.Println(scanId, err.Error())
		}
		ticker := time.NewTicker(2 * time.Minute)
		for {
			select {
			case <-ticker.C:
				err = IngestScanStatus("", "UPLOADING_IMAGE", scanId, nodeType, nodeId, scanType, hostName, kubernetesClusterName)
				if err != nil {
					fmt.Println(scanId, err.Error())
				}
			case <-stopLogging:
				fmt.Println("After - " + time.Now().String())
				return
			}
		}
	}()

	logError := func(errMsg string) {
		logrus.Error(errMsg)
		stopLogging <- true
		time.Sleep(3 * time.Second)
		err := IngestScanStatus(errMsg, "ERROR", scanId, nodeType, nodeId, scanType, hostName, k8sClusterName)
		if err != nil {
			logrus.Errorf("Error while ingesting: %s", err)
		}
	}

	packageScannerClient, err := createPackageScannerClient()
	if err != nil {
		logError(err.Error())
		return
	}
	var source string
	if imageName == "host" {
		source = scanPath
	} else {
		source = imageName
	}
	var res *pb.SBOMResult
	res, err = packageScannerClient.GenerateSBOM(ctx, &pb.SBOMRequest{Source: source, ScanType: scanType})
	if err != nil {
		logError(err.Error())
		return
	}
	stopLogging <- true
	err = sendSBOMtoConsole(imageName, imageId, scanId, kubernetesClusterName, hostName, nodeId, nodeType, scanType, res.Sbom)
	if err != nil {
		logrus.Error(err.Error())
		return
	}
}

func callAPI(postReader io.Reader, urlPath string) error {
	// Send  data to cve server, which will put it in a redis pub-sub read by logstash
	retryCount := 0
	httpClient, err := buildHttpClient()
	if err != nil {
		return err
	}
	for {
		httpReq, err := http.NewRequest("POST", urlPath, postReader)
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
			if retryCount > 2 {
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

func IngestScanStatus(vulnerabilityScanMsg, action, scanId, nodeType, nodeId, scanTypeStr, hostName, kubernetesClusterName string) error {
	vulnerabilityScanMsg = strings.Replace(vulnerabilityScanMsg, "\n", " ", -1)
	scanLog := fmt.Sprintf("{\"scan_id\":\"%s\",\"time_stamp\":%d,\"cve_scan_message\":\"%s\",\"action\":\"%s\",\"type\":\"cve-scan\",\"node_type\":\"%s\",\"node_id\":\"%s\",\"scan_type\":\"%s\",\"host_name\":\"%s\",\"host\":\"%s\",\"kubernetes_cluster_name\":\"%s\"}", scanId, getIntTimestamp(), vulnerabilityScanMsg, action, nodeType, nodeId, scanTypeStr, hostName, hostName, kubernetesClusterName)
	postReader := bytes.NewReader([]byte(scanLog))
	ingestScanStatusAPI := fmt.Sprintf("https://" + mgmtConsoleUrl + "/df-api/ingest?doc_type=cve-scan")
	return callAPI(postReader, ingestScanStatusAPI)
}

func getIntTimestamp() int64 {
	return time.Now().UTC().UnixNano() / 1000000
}

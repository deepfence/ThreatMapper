package host

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"google.golang.org/grpc"
	"net"
	"net/http"
	"net/url"
	"os"
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
	conn, err := grpc.Dial("unix://"+packageScannerSocket, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		return nil, err
	}
	return pb.NewPackageScannerClient(conn), nil
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
	return client, nil
}

func sendSBOMtoConsole(imageName, imageId, scanId, kubernetesClusterName, scanType, sbomStr string) error {
	httpClient, err := buildClient()
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

func GenerateSbomForVulnerabilityScan(imageName, imageId, scanId, kubernetesClusterName, scanType string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()
	packageScannerClient, err := createPackageScannerClient()
	if err != nil {
		return err
	}
	var res *pb.SBOMResult
	var source string
	if imageName == "host" {
		source = scanPath
	} else {
		source = imageName
	}
	res, err = packageScannerClient.GenerateSBOM(ctx, &pb.SBOMRequest{Source: source, ScanType: scanType})
	if err != nil {
		return err
	}
	return sendSBOMtoConsole(imageName, imageId, scanId, kubernetesClusterName, scanType, res.String())
}

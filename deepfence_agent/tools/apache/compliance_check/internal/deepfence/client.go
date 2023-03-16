package deepfence

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/compliance_check/util"
	dfUtils "github.com/deepfence/df-utils"
)

const (
	MethodGet            = "GET"
	MethodPost           = "POST"
	complianceResultFile = "compliance/compliance_scan.log"
	complianceLogFile    = "compliance-scan-logs/compliance_scan_log.log"
)

type Client struct {
	config         util.Config
	httpClient     *http.Client
	mgmtConsoleUrl string
	accessToken    string
}

func NewClient(config util.Config) (*Client, error) {
	httpClient, err := buildHttpClient()
	if err != nil {
		return nil, err
	}
	mgmtConsoleUrl := config.ManagementConsoleUrl
	if config.ManagementConsolePort != "" && config.ManagementConsolePort != "443" {
		mgmtConsoleUrl += ":" + config.ManagementConsolePort
	}
	if mgmtConsoleUrl == "" {
		return nil, fmt.Errorf("management console url is required")
	}
	c := &Client{config: config, httpClient: httpClient, mgmtConsoleUrl: mgmtConsoleUrl}
	return c, nil
}

func (c *Client) SendScanStatustoConsole(scanMsg string, status string, totalChecks int, resultMap map[string]int) error {
	scanMsg = strings.Replace(scanMsg, "\n", " ", -1)
	scanLog := util.ComplianceScanLog{
		ScanId:                c.config.ScanId,
		Type:                  util.ComplianceScanLogsIndexName,
		TimeStamp:             dfUtils.GetTimestamp(),
		Timestamp:             dfUtils.GetDatetimeNow(),
		Masked:                "false",
		NodeId:                c.config.NodeId,
		NodeType:              c.config.NodeType,
		KubernetesClusterName: c.config.KubernetesClusterName,
		KubernetesClusterId:   c.config.KubernetesClusterId,
		NodeName:              c.config.NodeName,
		ScanMessage:           scanMsg,
		ScanStatus:            status,
		ComplianceCheckType:   c.config.ComplianceCheckType,
		TotalChecks:           totalChecks,
		Result:                resultMap,
	}
	complianceScanLog, err := json.Marshal(scanLog)
	if err != nil {
		return err
	}
	postReader := bytes.NewReader(complianceScanLog)
	ingestScanStatusAPI := fmt.Sprintf("https://" + c.mgmtConsoleUrl + "/df-api/ingest?doc_type=" + util.ComplianceScanLogsIndexName)
	_, err = c.HttpRequest(MethodPost, ingestScanStatusAPI, postReader, nil)
	return err
}

func (c *Client) WriteScanStatusToFile(dfLogDir string, scanMsg string, status string,
	totalChecks int, resultMap map[string]int) error {
	scanMsg = strings.Replace(scanMsg, "\n", " ", -1)
	scanLog := util.ComplianceScanLog{
		ScanId:                c.config.ScanId,
		Type:                  util.ComplianceScanLogsIndexName,
		TimeStamp:             dfUtils.GetTimestamp(),
		Timestamp:             dfUtils.GetDatetimeNow(),
		Masked:                "false",
		NodeId:                c.config.NodeId,
		NodeType:              c.config.NodeType,
		KubernetesClusterName: c.config.KubernetesClusterName,
		KubernetesClusterId:   c.config.KubernetesClusterId,
		NodeName:              c.config.NodeName,
		ScanMessage:           scanMsg,
		ScanStatus:            status,
		ComplianceCheckType:   c.config.ComplianceCheckType,
		TotalChecks:           totalChecks,
		Result:                resultMap,
	}
	complianceScanLog, err := json.Marshal(scanLog)
	if err != nil {
		return err
	}
	complianceScanLog = append(complianceScanLog, []byte("\n")...)

	logPath := path.Join(dfLogDir, complianceLogFile)
	err = os.MkdirAll(filepath.Dir(logPath), 0755)
	if err != nil {
		return err
	}
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0600)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err = f.Write(complianceScanLog); err != nil {
		return err
	}
	return nil
}

func (c *Client) getApiAccessToken() string {
	if c.accessToken != "" {
		return c.accessToken
	}
	accessToken, err := c.GetApiAccessToken()
	if err != nil {
		return ""
	}
	c.accessToken = accessToken
	return c.accessToken
}

func (c *Client) GetApiAccessToken() (string, error) {
	resp, err := c.HttpRequest(MethodPost,
		"https://"+c.mgmtConsoleUrl+"/deepfence/v1.5/users/auth",
		bytes.NewReader([]byte(`{"api_key":"`+c.config.DeepfenceKey+`"}`)),
		nil)
	if err != nil {
		return "", err
	}
	var dfApiAuthResponse dfApiAuthResponse
	err = json.Unmarshal(resp, &dfApiAuthResponse)
	if err != nil {
		return "", err
	}
	if dfApiAuthResponse.Success == false {
		return "", errors.New(dfApiAuthResponse.Error.Message)
	}
	return dfApiAuthResponse.Data.AccessToken, nil
}

func (c *Client) SendComplianceResultToConsole(complianceScan []util.ComplianceScan) error {
	docBytes, err := json.Marshal(complianceScan)
	if err != nil {
		return err
	}
	postReader := bytes.NewReader(docBytes)
	ingestScanStatusAPI := fmt.Sprintf("https://" + c.mgmtConsoleUrl + "/df-api/ingest?doc_type=" + util.ComplianceScanIndexName)
	_, err = c.HttpRequest("POST", ingestScanStatusAPI, postReader, nil)
	if err != nil {
		return err
	}
	return nil
}

func (c *Client) WriteComplianceResultToFile(dfLogDir string, complianceScan []util.ComplianceScan) error {
	logPath := path.Join(dfLogDir, complianceResultFile)
	err := os.MkdirAll(filepath.Dir(logPath), 0755)
	if err != nil {
		return err
	}
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0600)
	if err != nil {
		return err
	}
	defer f.Close()

	for _, cs := range complianceScan {
		docBytes, err := json.Marshal(cs)
		if err != nil {
			return err
		}
		doc := strings.Replace(string(docBytes), "\n", " ", -1)
		if _, err = f.WriteString(doc + "\n"); err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) HttpRequest(method string, requestUrl string, postReader io.Reader, header map[string]string) ([]byte, error) {
	retryCount := 0
	var response []byte
	for {
		httpReq, err := http.NewRequest(method, requestUrl, postReader)
		if err != nil {
			return response, err
		}
		httpReq.Close = true
		httpReq.Header.Add("deepfence-key", c.config.DeepfenceKey)
		httpReq.Header.Set("Content-Type", "application/json")
		if header != nil {
			for k, v := range header {
				httpReq.Header.Add(k, v)
			}
		}
		resp, err := c.httpClient.Do(httpReq)
		if err != nil {
			return response, err
		}
		if resp.StatusCode == 200 {
			response, err = ioutil.ReadAll(resp.Body)
			if err != nil {
				return response, err
			}
			resp.Body.Close()
			break
		} else {
			if retryCount > 4 {
				errMsg := fmt.Sprintf("Unable to complete request. Got %d ", resp.StatusCode)
				resp.Body.Close()
				return response, errors.New(errMsg)
			}
			resp.Body.Close()
			retryCount += 1
			time.Sleep(5 * time.Second)
		}
	}
	return response, nil
}

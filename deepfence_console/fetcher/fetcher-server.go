package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gomodule/redigo/redis"
	_ "github.com/lib/pq"
	elastic "github.com/olivere/elastic/v7"
)

const (
	redisVulnerabilityChannel = "vulnerability_task_queue"
	redisCloudTrailChannel    = "cloudtrail_task_queue"
)

var (
	postgresDb                   *sql.DB
	psqlInfo                     string
	esClient                     *elastic.Client
	vulnerabilityDbUpdater       *VulnerabilityDbUpdater
	cveIndexName                 = convertRootESIndexToCustomerSpecificESIndex("cve")
	cveScanLogsIndexName         = convertRootESIndexToCustomerSpecificESIndex("cve-scan")
	sbomArtifactsIndexName       = convertRootESIndexToCustomerSpecificESIndex("sbom-artifact")
	cloudComplianceIndexName     = convertRootESIndexToCustomerSpecificESIndex("cloud-compliance-scan")
	cloudComplianceLogsIndexName = convertRootESIndexToCustomerSpecificESIndex("cloud-compliance-scan-logs")
	complianceIndexName          = convertRootESIndexToCustomerSpecificESIndex("compliance")
	complianceLogsIndexName      = convertRootESIndexToCustomerSpecificESIndex("compliance-scan-logs")
	cloudTrailAlertsIndexName    = convertRootESIndexToCustomerSpecificESIndex("cloudtrail-alert")
	resourceToNodeTypeMap        = map[string]string{"CloudWatch": "aws_cloudwatch_log_group", "VPC": "aws_vpc", "CloudTrail": "aws_cloudtrail_trail", "Config": "aws_config_rule", "KMS": "aws_kms_key", "S3": "aws_s3_bucket", "IAM": "aws_iam_user", "EBS": "aws_ebs_volume", "RDS": "aws_rds_db_cluster"}
)

type VulnerabilityDbDetail struct {
	Built    time.Time `json:"built"`
	Version  int       `json:"version"`
	URL      string    `json:"url"`
	Checksum string    `json:"checksum"`
}

type VulnerabilityDbListingVersions struct {
	V3 []VulnerabilityDbDetail `json:"3"`
	V5 []VulnerabilityDbDetail `json:"5"`
}

type VulnerabilityDbListing struct {
	Available VulnerabilityDbListingVersions `json:"available"`
}

type VulnerabilityDbUpdater struct {
	vulnerabilityDbListingJson VulnerabilityDbListing
	vulnerabilityDbPath        string
	grypeVulnerabilityDbPath   string
	currentFileChecksum        string
	currentFilePath            string
	sync.RWMutex
}

func NewVulnerabilityDbUpdater() *VulnerabilityDbUpdater {
	updater := &VulnerabilityDbUpdater{
		vulnerabilityDbListingJson: VulnerabilityDbListing{},
		vulnerabilityDbPath:        "/data/vulnerability-db/",
		grypeVulnerabilityDbPath:   "/root/.cache/grype/db/5",
	}
	// Update once
	fmt.Println("Updating vulnerability database")
	err := updater.runGrypeUpdate()
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println("Updated vulnerability database")
	}
	if fileExists(updater.grypeVulnerabilityDbPath + "/metadata.json") {
		fmt.Println("Updating vulnerability database listing.json")
		err = updater.updateVulnerabilityDbListing()
		if err != nil {
			fmt.Println(err)
		} else {
			fmt.Println("Updated vulnerability database listing.json")
		}
	}
	return updater
}

type ComplianceDoc struct {
	DocId                 string `json:"doc_id"`
	Type                  string `json:"type"`
	TimeStamp             int64  `json:"time_stamp"`
	Timestamp             string `json:"@timestamp"`
	Masked                string `json:"masked"`
	NodeId                string `json:"node_id"`
	NodeType              string `json:"node_type"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	KubernetesClusterId   string `json:"kubernetes_cluster_id"`
	NodeName              string `json:"node_name"`
	TestCategory          string `json:"test_category"`
	TestNumber            string `json:"test_number"`
	TestInfo              string `json:"description"`
	RemediationScript     string `json:"remediation_script,omitempty"`
	RemediationAnsible    string `json:"remediation_ansible,omitempty"`
	RemediationPuppet     string `json:"remediation_puppet,omitempty"`
	Resource              string `json:"resource"`
	TestRationale         string `json:"test_rationale"`
	TestSeverity          string `json:"test_severity"`
	TestDesc              string `json:"test_desc"`
	Status                string `json:"status"`
	ComplianceCheckType   string `json:"compliance_check_type"`
	ScanId                string `json:"scan_id"`
	ComplianceNodeType    string `json:"compliance_node_type"`
}

type CloudComplianceDoc struct {
	DocId               string `json:"doc_id"`
	Timestamp           string `json:"@timestamp"`
	Count               int    `json:"count,omitempty"`
	Reason              string `json:"reason"`
	Resource            string `json:"resource"`
	Status              string `json:"status"`
	Region              string `json:"region"`
	AccountID           string `json:"account_id"`
	Group               string `json:"group"`
	Service             string `json:"service"`
	Title               string `json:"title"`
	ComplianceCheckType string `json:"compliance_check_type"`
	CloudProvider       string `json:"cloud_provider"`
	NodeName            string `json:"node_name"`
	NodeID              string `json:"node_id"`
	ScanID              string `json:"scan_id"`
	Masked              string `json:"masked"`
	Type                string `json:"type"`
	ControlID           string `json:"control_id"`
	Description         string `json:"description"`
	Severity            string `json:"severity"`
}

type WebIdentitySessionContext struct {
	FederatedProvider string                 `json:"federatedProvider,omitempty"`
	Attributes        map[string]interface{} `json:"attributes,omitempty"`
}

type SessionContext struct {
	Attributes          map[string]interface{}    `json:"attributes,omitempty"`
	SessionIssuer       map[string]interface{}    `json:"sessionIssuer,omitempty"`
	WebIdFederationData WebIdentitySessionContext `json:"webIdFederationData,omitempty"`
}

type UserIdentity struct {
	IdentityType     string         `json:"type,omitempty"`
	PrincipalId      string         `json:"principalId,omitempty"`
	Arn              string         `json:"arn,omitempty"`
	AccountId        string         `json:"accountId,omitempty"`
	AccessKeyId      string         `json:"accessKeyId,omitempty"`
	UserName         string         `json:"userName,omitempty"`
	InvokedBy        string         `json:"invokedBy,omitempty"`
	SessionContext   SessionContext `json:"sessionContext,omitempty"`
	IdentityProvider string         `json:"identityProvider,omitempty"`
}

type CloudTrailLogEvent struct {
	DocId                        string                   `json:"doc_id,omitempty"`
	Type                         string                   `json:"type,omitempty"`
	TimeStamp                    int64                    `json:"time_stamp,omitempty"`
	Timestamp                    string                   `json:"@timestamp,omitempty"`
	Masked                       string                   `json:"masked,omitempty"`
	EventVersion                 string                   `json:"eventVersion,omitempty"`
	UserIdentity                 UserIdentity             `json:"userIdentity,omitempty"`
	EventTime                    string                   `json:"eventTime,omitempty"`
	EventName                    string                   `json:"eventName,omitempty"`
	EventSource                  string                   `json:"eventSource,omitempty"`
	AwsRegion                    string                   `json:"awsRegion,omitempty"`
	SourceIPAddress              string                   `json:"sourceIPAddress,omitempty"`
	UserAgent                    string                   `json:"userAgent,omitempty"`
	RequestID                    string                   `json:"requestID,omitempty"`
	ErrorCode                    string                   `json:"errorCode,omitempty"`
	ErrorMessage                 string                   `json:"errorMessage,omitempty"`
	RequestParameters            map[string]interface{}   `json:"requestParameters,omitempty"`
	ResponseElements             map[string]interface{}   `json:"responseElements,omitempty"`
	ServiceEventDetails          map[string]interface{}   `json:"serviceEventDetails,omitempty"`
	AdditionalEventData          map[string]interface{}   `json:"additionalEventData,omitempty"`
	EventID                      string                   `json:"eventID,omitempty"`
	ReadOnly                     bool                     `json:"readOnly,omitempty"`
	ManagementEvent              bool                     `json:"managementEvent,omitempty"`
	Resources                    []map[string]interface{} `json:"resources,omitempty"`
	AccountId                    string                   `json:"accountId,omitempty"`
	EventCategory                string                   `json:"eventCategory,omitempty"`
	EventType                    string                   `json:"eventType,omitempty"`
	ApiVersion                   string                   `json:"apiVersion,omitempty"`
	RecipientAccountId           string                   `json:"recipientAccountId,omitempty"`
	SharedEventID                string                   `json:"sharedEventID,omitempty"`
	Annotation                   string                   `json:"annotation,omitempty"`
	VpcEndpointId                string                   `json:"vpcEndpointId,omitempty"`
	InsightDetails               map[string]interface{}   `json:"insightDetails,omitempty"`
	Addendum                     map[string]interface{}   `json:"addendum,omitempty"`
	EdgeDeviceDetails            map[string]interface{}   `json:"edgeDeviceDetails,omitempty"`
	TlsDetails                   map[string]interface{}   `json:"tlsDetails,omitempty"`
	SessionCredentialFromConsole string                   `json:"sessionCredentialFromConsole,omitempty"`
}

func (v *VulnerabilityDbUpdater) runGrypeUpdate() error {
	_, stdErr, exitCode := runCommand("/usr/local/bin/grype", "db", "update")
	if exitCode != 0 {
		return errors.New(stdErr)
	}
	return nil
}

func (v *VulnerabilityDbUpdater) updateVulnerabilityDbListing() error {
	v.RLock()
	grypeVulnerabilityDbPath := v.grypeVulnerabilityDbPath
	oldFileChecksum := v.currentFileChecksum
	vulnerabilityDbPath := v.vulnerabilityDbPath
	oldFilePath := v.currentFilePath
	v.RUnlock()
	content, err := os.ReadFile(grypeVulnerabilityDbPath + "/metadata.json")
	if err != nil {
		return err
	}
	var vulnerabilityDbDetail VulnerabilityDbDetail
	err = json.Unmarshal(content, &vulnerabilityDbDetail)
	if err != nil {
		return err
	}
	if vulnerabilityDbDetail.Checksum == oldFileChecksum {
		return nil
	}
	currentFilePath := fmt.Sprintf("%s%d.tar.gz", vulnerabilityDbPath, vulnerabilityDbDetail.Built.Unix())
	cmd := "cd " + grypeVulnerabilityDbPath + " && mkdir -p " + vulnerabilityDbPath + " && tar -czf " + currentFilePath + " metadata.json vulnerability.db"
	_, stdErr, exitCode := runCommand("bash", "-c", cmd)
	if exitCode != 0 {
		return errors.New(stdErr)
	}
	currentFileChecksum, err := sha256sum(currentFilePath)
	if err != nil {
		return err
	}
	vulnerabilityDbDetail.Checksum = currentFileChecksum
	vulnerabilityDbDetail.URL = "http://deepfence-fetcher:8006/df-api/download" + currentFilePath
	v.Lock()
	v.vulnerabilityDbListingJson = VulnerabilityDbListing{
		Available: VulnerabilityDbListingVersions{
			// V3: []VulnerabilityDbDetail{vulnerabilityDbDetail},
			V5: []VulnerabilityDbDetail{vulnerabilityDbDetail},
		},
	}
	v.currentFilePath = currentFilePath
	v.currentFileChecksum = currentFileChecksum
	v.Unlock()
	if oldFilePath != currentFilePath {
		if oldFilePath != "" {
			os.RemoveAll(oldFilePath)
		}
	}
	return nil
}

func (v *VulnerabilityDbUpdater) updateVulnerabilityDb() {
	ticker := time.NewTicker(4 * time.Hour)
	var err error
	for {
		select {
		case <-ticker.C:
			err = v.runGrypeUpdate()
			if err != nil {
				fmt.Println("Error in runGrypeUpdate: ", err)
			}
			err = v.updateVulnerabilityDbListing()
			if err != nil {
				fmt.Println("Error in updateVulnerabilityDbListing: ", err)
			}
		}
	}
}

func vulnerabilityDbListing(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != http.MethodGet {
		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
		return
	}
	if vulnerabilityDbUpdater == nil {
		http.Error(respWrite, "updater not initialized", http.StatusInternalServerError)
		return
	}
	vulnerabilityDbUpdater.RLock()
	vulnerabilityDbListingJson := vulnerabilityDbUpdater.vulnerabilityDbListingJson
	vulnerabilityDbUpdater.RUnlock()
	content, err := json.Marshal(vulnerabilityDbListingJson)
	if err != nil {
		http.Error(respWrite, "listing.json marshal error", http.StatusInternalServerError)
		return
	}
	respWrite.Header().Set("content-type", "application/json")
	respWrite.Write(content)
}

func sha256sum(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return fmt.Sprintf("sha256:%x", hash.Sum(nil)), nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func runCommand(name string, args ...string) (stdout string, stderr string, exitCode int) {
	var defaultFailedCode = 1
	var outbuf, errbuf bytes.Buffer
	cmd := exec.Command(name, args...)
	cmd.Stdout = &outbuf
	cmd.Stderr = &errbuf

	err := cmd.Run()
	stdout = outbuf.String()
	stderr = errbuf.String()

	if err != nil {
		// try to get the exit code
		if exitError, ok := err.(*exec.ExitError); ok {
			ws := exitError.Sys().(syscall.WaitStatus)
			exitCode = ws.ExitStatus()
		} else {
			// This will happen (in OSX) if `name` is not available in $PATH,
			// in this situation, exit code could not be get, and stderr will be
			// empty string very likely, so we use the default fail code, and format err
			// to string and set to stderr
			exitCode = defaultFailedCode
			if stderr == "" {
				stderr = err.Error()
			}
		}
	} else {
		// success, exitCode should be 0 if go is ok
		ws := cmd.ProcessState.Sys().(syscall.WaitStatus)
		exitCode = ws.ExitStatus()
	}
	return
}

func extractTarFile(fileName string, extractFolder string) error {
	_, stdErr, retVal := runCommand("tar", "-xf", fileName, "-C"+extractFolder)
	if retVal != 0 {
		return errors.New(stdErr)
	}
	return nil
}

func handleMultiPartPostMethod(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	fileName := req.Header.Get("DF_FILE_NAME")
	if fileName == "" {
		http.Error(respWrite, "Required information missing", http.StatusInternalServerError)
		return
	}
	if fileName != filepath.Clean(fileName) || !strings.HasPrefix(fileName, "/data") || strings.HasSuffix(fileName, ".exe") || strings.HasSuffix(fileName, ".sh") {
		http.Error(respWrite, "Invalid request", http.StatusBadRequest)
		return
	}
	filePath := path.Dir(fileName)
	os.MkdirAll(filePath, 0755)
	filePtr, err := os.OpenFile(fileName, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		errMsg := "Error while writing post data. " + err.Error()
		http.Error(respWrite, errMsg, http.StatusInternalServerError)
		return
	}
	defer filePtr.Close()
	req.ParseMultipartForm(32 << 20)
	inputFilePtr, handler, errVal := req.FormFile("DF_MULTIPART_BOUNDARY")
	if handler == nil {
		errMsg := "Error while getting data from client "
		http.Error(respWrite, errMsg, http.StatusInternalServerError)
		return
	}
	if errVal != nil {
		errMsg := "Error while writing post data. " + errVal.Error()
		http.Error(respWrite, errMsg, http.StatusInternalServerError)
		return
	}
	defer inputFilePtr.Close()
	_, copyErr := io.Copy(filePtr, inputFilePtr)
	if copyErr != nil {
		errMsg := "Error while writing post data. " + copyErr.Error()
		http.Error(respWrite, errMsg, http.StatusInternalServerError)
		return
	}
	toExtract := req.Header.Get("DF_EXTRACT")
	if toExtract == "true" {
		extractFolder := filepath.Dir(fileName) + "/extract"
		os.MkdirAll(extractFolder, 0755)
		go func() {
			filePtr.Sync()
			err = extractTarFile(fileName, extractFolder)
			msg := "Complete"
			if err != nil {
				msg = "Error while extracting file: " + err.Error()
			}
			statusFile, statusFileErr := os.OpenFile(extractFolder+"/extract_status.txt", os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
			if statusFileErr == nil {
				_, _ = statusFile.WriteString(msg)
				statusFile.Close()
			}
		}()
	}
	_, err = fmt.Fprintf(respWrite, "POST complete")
	if err != nil {
		fmt.Println(fileName, err)
	}
	exec.Command("/usr/bin/touch", "-m", fileName).Output()
}

func handleDeleteDumpsMethod(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	var filePath string
	if req.Method != "POST" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}

	folderPath := "/data/core_dumps"
	dirs, err := os.ReadDir(folderPath)
	if err != nil {
		fmt.Println(err)
		return
	}

	for _, f := range dirs {
		if f.IsDir() {
			files, err := os.ReadDir(folderPath + "/" + f.Name())
			if err != nil {
				fmt.Println(err)
				return
			}
			for _, dumpName := range files {
				filePath = folderPath + "/" + f.Name() + "/" + dumpName.Name()
				fileInfo, _ := os.Stat(filePath)
				timeDiff := time.Since(fileInfo.ModTime()).Seconds()
				if timeDiff/60 > 15 {
					err = os.Remove(filePath)
					if err != nil {
						fmt.Printf("Unable to remove core dump file %s. Reason %s\n", filePath, err.Error())
					}
				}
			}
		}
	}
}

func handleUploadExtractStatus(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != "GET" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	fileName := req.Header.Get("DF_FILE_NAME")
	if fileName == "" {
		http.Error(respWrite, "Required information missing", http.StatusInternalServerError)
		return
	}
	if fileName != filepath.Clean(fileName) || !strings.HasPrefix(fileName, "/data") {
		http.Error(respWrite, "Invalid request", http.StatusBadRequest)
		return
	}
	extractStatusFileName := filepath.Dir(fileName) + "/extract/extract_status.txt"
	extractStatusFile, err := os.OpenFile(extractStatusFileName, os.O_RDONLY, 0644)
	if err != nil {
		http.Error(respWrite, "Error", http.StatusInternalServerError)
		return
	}
	buf := new(bytes.Buffer)
	buf.ReadFrom(extractStatusFile)
	contents := buf.String()
	extractStatusFile.Close()
	if contents == "Complete" {
		fmt.Fprintf(respWrite, "Complete")
		return
	} else if strings.HasPrefix(contents, "Error") {
		http.Error(respWrite, "Error", http.StatusInternalServerError)
		return
	} else {
		http.Error(respWrite, "Processing", http.StatusProcessing)
		return
	}
}

func deleteFiles(path string, wildCard string) {

	var val string
	files, _ := filepath.Glob(path + wildCard)
	for _, val = range files {
		os.RemoveAll(val)
	}
}

func handleClearMethod(respWrite http.ResponseWriter, req *http.Request) {

	defer req.Body.Close()
	if req.Method != "DEL" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	fileName := req.Header.Get("DF_FILE_NAME")
	if fileName == "" {
		http.Error(respWrite, "Required information missing",
			http.StatusInternalServerError)
		return
	}
	if fileName != filepath.Clean(fileName) || !strings.HasPrefix(fileName, "/data") {
		http.Error(respWrite, "Invalid request", http.StatusBadRequest)
		return
	}
	deleteFiles(fileName+"/", "*")
	err := os.RemoveAll(fileName)
	if err != nil {
		errMsg := "Unable to delete. " + err.Error()
		http.Error(respWrite, errMsg, http.StatusInternalServerError)
	} else {
		respWrite.WriteHeader(http.StatusOK)
		fmt.Fprintf(respWrite, "DEL complete")
	}
}

func checkOwaspDependencyDataDownloading() bool {
	pidCmd := "ps -ef | grep owasp-data | grep -v grep | awk '{print $1}'"
	cmdOutput, errVal := exec.Command("/bin/sh", "-c", pidCmd).CombinedOutput()
	if errVal != nil {
		return false
	}
	if string(cmdOutput) == "" {
		return false
	}
	return true
}

func handleVulnerabilityFeedTarUpload(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}

	// Maximum upload of 150 MB files
	req.ParseMultipartForm(150 << 20)

	inputFilePtr, handler, errVal := req.FormFile("file")
	if errVal != nil || handler == nil {
		http.Error(respWrite, errVal.Error(), http.StatusInternalServerError)
		return
	}
	defer inputFilePtr.Close()

	if !strings.HasSuffix(handler.Filename, ".tar.gz") || handler.Filename != filepath.Clean(handler.Filename) {
		http.Error(respWrite, "Uploaded file should be a .tar.gz archive", http.StatusBadRequest)
		return
	}

	// Create file
	fileName := "/tmp/" + handler.Filename
	dst, err := os.Create(fileName)
	if err != nil {
		http.Error(respWrite, err.Error(), http.StatusInternalServerError)
		return
	}
	_, copyErr := io.Copy(dst, inputFilePtr)
	if copyErr != nil {
		dst.Close()
		errMsg := "Error while writing post data. " + copyErr.Error()
		http.Error(respWrite, errMsg, http.StatusInternalServerError)
		return
	}
	dst.Sync()
	dst.Close()

	file, err := os.Open(fileName)
	if err != nil {
		http.Error(respWrite, err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()
	buf := make([]byte, 512)
	_, err = file.Read(buf)
	if err != nil {
		http.Error(respWrite, err.Error(), http.StatusInternalServerError)
		return
	}
	if http.DetectContentType(buf) != "application/x-gzip" {
		http.Error(respWrite, "Uploaded file should be a .tar.gz archive", http.StatusBadRequest)
		return
	}

	go func() {
		// remove the tar.gz file after extraction
		defer os.Remove(fileName)
		extractFolder := "/root/.cache/grype/db/3"
		err = extractTarFile(fileName, extractFolder)
		msg := "Complete"
		if err != nil {
			msg = "Error while extracting file: " + err.Error()
			log.Println("updateVulnerabilityDb extractTarFile " + err.Error())
			return
		}
		statusFile, statusFileErr := os.OpenFile(extractFolder+"/extract_status.txt", os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
		if statusFileErr == nil {
			_, _ = statusFile.WriteString(msg)
			statusFile.Close()
		}
		err := vulnerabilityDbUpdater.updateVulnerabilityDbListing()
		if err != nil {
			log.Println("updateVulnerabilityDbListing " + err.Error())
			return
		}
		// call mapper api to update grype db
		updateVulnerabilityMapperDB()
	}()
	respWrite.WriteHeader(http.StatusOK)
	_, err = fmt.Fprintf(respWrite, "vulnerability db updated")
	if err != nil {
		fmt.Println(handler.Filename, err)
	}
}

func updateVulnerabilityMapperDB() {
	response, err := http.Post("http://deepfence-vulnerability-mapper:8001/vulnerability-mapper-api/db-update", "text/plain", nil)
	if err != nil {
		errMsg := "Error while calling vulnerability mapper api. " + err.Error()
		fmt.Println(errMsg)
		return
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		errMsg := "Error while calling vulnerability mapper api. " + response.Status
		fmt.Println(errMsg)
		return
	}
}

type registryCredentialRequest struct {
	CredentialId string `json:"credential_id"`
}

type registryCredentialData struct {
	RegistryType    string `json:"registry_type"`
	EncryptedSecret []byte `json:"encrypted_secret"`
	NonSecret       []byte `json:"non_secret"`
	Extras          []byte `json:"extras"`
}

type DfApiAuthResponse struct {
	Data struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	} `json:"data"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
	Success bool `json:"success"`
}

func callRegistryCredentialApi(credentialId string) (string, error) {
	client := &http.Client{}
	req, err := http.NewRequest("POST", "http://deepfence-api:9997/registry_credential", bytes.NewBuffer([]byte(`{"id":"`+credentialId+`"}`)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(body), err
}

func registryCredential(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	decoder := json.NewDecoder(req.Body)
	var registryCredentialRequest registryCredentialRequest
	err := decoder.Decode(&registryCredentialRequest)
	if err != nil || registryCredentialRequest.CredentialId == "" {
		http.Error(respWrite, "required information missing", http.StatusInternalServerError)
		return
	}
	respWrite.WriteHeader(http.StatusOK)
	credentialsData, err := callRegistryCredentialApi(registryCredentialRequest.CredentialId)
	if err != nil {
		http.Error(respWrite, "error getting credentials", http.StatusInternalServerError)
		return
	}
	fmt.Fprint(respWrite, credentialsData)
}

func fileDownloadHandler(fileName string, respWrite http.ResponseWriter, req *http.Request) {
	if fileName == "" {
		respWrite.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(respWrite, "Required information missing")
		return
	}
	if !strings.HasPrefix(fileName, "/data") || fileName != filepath.Clean(fileName) {
		http.Error(respWrite, "Invalid request", http.StatusBadRequest)
		return
	}
	if fileName == "/data/owasp-data/depcheck-data.zip" || fileName == "/data/owasp-data/depcheck-data.tar.bz2" {
		/*
		   if (nvdDownloadComplete() == false) {
		       respWrite.WriteHeader(http.StatusProcessing)
		       fmt.Fprintf(respWrite,"Retry later")
		       return
		   }
		*/
		if checkOwaspDependencyDataDownloading() {
			respWrite.WriteHeader(http.StatusProcessing)
			fmt.Fprintf(respWrite, "Retry later")
			return
		}
	}
	if _, err := os.Stat(fileName); err == nil || os.IsExist(err) {
		http.ServeFile(respWrite, req, fileName)
	} else {
		respWrite.WriteHeader(http.StatusNotFound)
		fmt.Fprintf(respWrite, "Not found")
		return
	}
}

func handleDownload(respWrite http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	fileDownloadHandler(strings.TrimPrefix(req.URL.Path, "/df-api/download"), respWrite, req)
}

func handleFileDownload(respWrite http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	fileDownloadHandler(req.Header.Get("DF_FILE_NAME"), respWrite, req)
}

type userDefinedTags struct {
	NodeName string   `json:"node_name"`
	Tags     []string `json:"tags"`
}

type tagsPostData struct {
	HostName              string `json:"host_name"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	NodeType              string `json:"node_type"`
}

func handleUserDefinedTags(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
		return
	}
	decoder := json.NewDecoder(req.Body)
	var tagsData tagsPostData
	err := decoder.Decode(&tagsData)
	if err != nil || tagsData.HostName == "" || tagsData.NodeType == "" {
		http.Error(respWrite, "required information missing", http.StatusInternalServerError)
		return
	}
	postgresDb, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		http.Error(respWrite, "couldn't connect to db", http.StatusInternalServerError)
		return
	}
	defer postgresDb.Close()
	rows, err := postgresDb.Query("SELECT node_name,tags from node_tags WHERE host_name=$1 AND node_type=$2;", tagsData.HostName, tagsData.NodeType)
	if err != nil {
		http.Error(respWrite, "db query error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	nodeTagsList := make([]userDefinedTags, 0)
	for rows.Next() {
		nodeTags := userDefinedTags{}
		var tags string
		err = rows.Scan(&nodeTags.NodeName, &tags)
		if err == nil {
			nodeTags.Tags = strings.Split(tags, ",")
			nodeTagsList = append(nodeTagsList, nodeTags)
		}
	}
	err = rows.Err()
	if err != nil {
		http.Error(respWrite, "db result error", http.StatusInternalServerError)
		return
	}
	nodeTagsBytes, err := json.Marshal(nodeTagsList)
	if err != nil {
		http.Error(respWrite, "result error", http.StatusInternalServerError)
		return
	}
	respWrite.WriteHeader(http.StatusOK)
	fmt.Fprint(respWrite, string(nodeTagsBytes))
}

type dfCveScanStruct struct {
	TimeStamp      int64  `json:"time_stamp"`
	Masked         string `json:"masked"`
	ScanType       string `json:"scan_type"`
	Type           string `json:"type"`
	CveScanMessage string `json:"cve_scan_message"`
	NodeType       string `json:"node_type"`
	Host           string `json:"host"`
	Version        string `json:"@version"`
	Action         string `json:"action"`
	ScanID         string `json:"scan_id"`
	HostName       string `json:"host_name"`
	NodeID         string `json:"node_id"`
	Timestamp      string `json:"@timestamp"`
}

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

type fimConfigData struct {
	HostName  string `json:"host_name"`
	FimConfig string `json:"fimconfig"`
}

type fimPostData struct {
	HostName              string `json:"host_name"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	NodeType              string `json:"node_type"`
}

func getFimConfig(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
		return
	}
	decoder := json.NewDecoder(req.Body)
	var fimData fimPostData
	err := decoder.Decode(&fimData)
	if err != nil || fimData.HostName == "" { // || fimData.NodeType == "" {
		http.Error(respWrite, "required information missing", http.StatusInternalServerError)
		return
	}
	// Call postgres to retrieve the fim config or his host or gloabl config
	postgresDb, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		http.Error(respWrite, "couldn't connect to db", http.StatusInternalServerError)
		return
	}
	defer postgresDb.Close()
	fimConfig := fimConfigData{}
	row := postgresDb.QueryRow("SELECT * from fim_config WHERE hostname=$1;", fimData.HostName)
	err = row.Scan(&fimConfig.HostName, &fimConfig.FimConfig) // Scan will close the row connection
	if err != nil {
		if err == sql.ErrNoRows {
			row1 := postgresDb.QueryRow("SELECT * from fim_config WHERE hostname=$1;", "df_global_default_fim")
			err = row1.Scan(&fimConfig.HostName, &fimConfig.FimConfig)
			if err != nil {
				if err == sql.ErrNoRows {
					http.Error(respWrite, "No global config found for this host", http.StatusInternalServerError)
					return
				} else {
					http.Error(respWrite, "db query error", http.StatusInternalServerError)
					return
				}
			}
		} else {
			http.Error(respWrite, "db query error", http.StatusInternalServerError)
			return
		}
	}
	// Marshal the fim config and return back to agent
	fimConfigBytes, err := json.Marshal(fimConfig)
	if err != nil {
		http.Error(respWrite, "json marshal error", http.StatusInternalServerError)
		return
	}
	respWrite.WriteHeader(http.StatusOK)
	fmt.Fprint(respWrite, string(fimConfigBytes))
}

func packetCaptureConfig(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	// Ignore post data. We only support same config for all hosts for now.
	postgresDb, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		http.Error(respWrite, "couldn't connect to db", http.StatusInternalServerError)
		return
	}
	defer postgresDb.Close()
	var captureConfig []byte
	row := postgresDb.QueryRow("SELECT config FROM packet_capture_config where host_name='all'")
	err = row.Scan(&captureConfig)
	if err != nil {
		respWrite.WriteHeader(http.StatusOK)
		fmt.Fprintf(respWrite, "{}")
		return
	}
	respWrite.WriteHeader(http.StatusOK)
	fmt.Fprint(respWrite, string(captureConfig))
}

type dfCveStruct struct {
	Count                      int      `json:"count"`
	Timestamp                  string   `json:"@timestamp"`
	CveTuple                   string   `json:"cve_id_cve_severity_cve_container_image"`
	DocId                      string   `json:"doc_id"`
	Masked                     string   `json:"masked"`
	Type                       string   `json:"type"`
	Host                       string   `json:"host"`
	HostName                   string   `json:"host_name"`
	ImageName                  string   `json:"image_name"`
	KubernetesClusterName      string   `json:"kubernetes_cluster_name"`
	NodeType                   string   `json:"node_type"`
	Scan_id                    string   `json:"scan_id"`
	Cve_id                     string   `json:"cve_id"`
	Cve_type                   string   `json:"cve_type"`
	Cve_container_image        string   `json:"cve_container_image"`
	Cve_container_image_id     string   `json:"cve_container_image_id"`
	Cve_container_name         string   `json:"cve_container_name"`
	Cve_severity               string   `json:"cve_severity"`
	Cve_caused_by_package      string   `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string   `json:"cve_caused_by_package_path"`
	Cve_container_layer        string   `json:"cve_container_layer"`
	Cve_fixed_in               string   `json:"cve_fixed_in"`
	Cve_link                   string   `json:"cve_link"`
	Cve_description            string   `json:"cve_description"`
	Cve_cvss_score             float64  `json:"cve_cvss_score"`
	Cve_overall_score          float64  `json:"cve_overall_score"`
	Cve_attack_vector          string   `json:"cve_attack_vector"`
	URLs                       []string `json:"urls"`
	ExploitPOC                 string   `json:"exploit_poc"`
}

//func ingestInBackground(docType string, body []byte) error {
//	redisConn := redisPool.Get()
//	defer redisConn.Close()
//	currTime := getCurrentTime()
//	if docType == cveIndexName {
//		var dfCveStructList []dfCveStruct
//		err := json.Unmarshal(body, &dfCveStructList)
//		if err != nil {
//			return err
//		}
//		bulkService := elastic.NewBulkService(esClient)
//		for _, cveStruct := range dfCveStructList {
//			cveStruct.Timestamp = currTime
//			if cveStruct.Cve_severity != "critical" && cveStruct.Cve_severity != "high" && cveStruct.Cve_severity != "medium" {
//				cveStruct.Cve_severity = "low"
//			}
//			cveStruct.Count = 1
//			cveStruct.CveTuple = fmt.Sprintf("%s|%s|%s", cveStruct.Cve_id, cveStruct.Cve_severity, cveStruct.Cve_container_image)
//			docId := fmt.Sprintf("%x", md5.Sum([]byte(
//				cveStruct.Scan_id+cveStruct.Cve_caused_by_package+cveStruct.Cve_container_image+cveStruct.Cve_id)))
//			cveStruct.DocId = docId
//			event, err := json.Marshal(cveStruct)
//			if err == nil {
//				bulkIndexReq := elastic.NewBulkIndexRequest()
//				bulkIndexReq.Index(cveIndexName).Id(docId).Doc(string(event))
//				bulkService.Add(bulkIndexReq)
//				retryCount := 0
//				for {
//					_, err = redisConn.Do("PUBLISH", redisVulnerabilityChannel, string(event))
//					if err == nil {
//						break
//					}
//					if retryCount > 1 {
//						fmt.Println(fmt.Sprintf("Error publishing cve document to %s - exiting", redisVulnerabilityChannel), err)
//						break
//					}
//					fmt.Println(fmt.Sprintf("Error publishing cve document to %s - trying again", redisVulnerabilityChannel), err)
//					retryCount += 1
//					time.Sleep(5 * time.Second)
//				}
//			}
//		}
//		bulkService.Do(context.Background())
//	} else if docType == cveScanLogsIndexName {
//		events := strings.Split(string(body), "\n")
//		bulkService := elastic.NewBulkService(esClient)
//		for _, event := range events {
//			if event != "" && strings.HasPrefix(event, "{") {
//				var cveScanMap map[string]interface{}
//				err := json.Unmarshal([]byte(event), &cveScanMap)
//				if err != nil {
//					continue
//				}
//				cveScanMap["masked"] = "false"
//				cveScanMap["@timestamp"] = currTime
//				bulkIndexReq := elastic.NewBulkIndexRequest()
//				bulkIndexReq.Index(cveScanLogsIndexName).Doc(cveScanMap)
//				bulkService.Add(bulkIndexReq)
//			}
//		}
//		bulkService.Do(context.Background())
//	} else if docType == sbomArtifactsIndexName {
//		bulkService := elastic.NewBulkService(esClient)
//		var artifacts []map[string]interface{}
//		err := json.Unmarshal(body, &artifacts)
//		if err != nil {
//			fmt.Println("Error reading artifacts: ", err.Error())
//		}
//		for _, artifact := range artifacts {
//			if len(artifact) == 0 {
//				continue
//			}
//			bulkIndexReq := elastic.NewBulkIndexRequest()
//			bulkIndexReq.Index(docType).Doc(artifact)
//			bulkService.Add(bulkIndexReq)
//		}
//		res, _ := bulkService.Do(context.Background())
//		if res != nil && res.Errors {
//			for _, item := range res.Items {
//				resItem := item["index"]
//				if resItem != nil {
//					if resItem.Error != nil {
//						fmt.Println(resItem.Index)
//						fmt.Println("Status: " + strconv.Itoa(resItem.Status))
//						fmt.Println("Error Type:" + resItem.Error.Type)
//						fmt.Println("Error Reason: " + resItem.Error.Reason)
//					}
//				}
//			}
//		}
//	} else if docType == cloudComplianceIndexName {
//		var complianceDocs []CloudComplianceDoc
//		err := json.Unmarshal(body, &complianceDocs)
//		if err != nil {
//			return err
//		}
//		bulkService := elastic.NewBulkService(esClient)
//		for _, complianceDoc := range complianceDocs {
//			docId := fmt.Sprintf("%x", md5.Sum([]byte(complianceDoc.ScanID+complianceDoc.ControlID+complianceDoc.Resource+complianceDoc.Group)))
//			complianceDoc.DocId = docId
//			bulkIndexReq := elastic.NewBulkUpdateRequest()
//			bulkIndexReq.Index(cloudComplianceIndexName).Id(docId).
//				Script(elastic.NewScriptStored("default_upsert").Param("event", complianceDoc)).
//				Upsert(complianceDoc).ScriptedUpsert(true).RetryOnConflict(3)
//			bulkService.Add(bulkIndexReq)
//		}
//		bulkResp, err := bulkService.Do(context.Background())
//		if err != nil {
//			log.Println("err cloud compliance " + err.Error())
//		}
//		failed := bulkResp.Failed()
//		log.Printf("cloud compliance bulk response Succeeded=%d Failed=%d\n",
//			len(bulkResp.Succeeded()), len(failed))
//		for _, r := range failed {
//			log.Printf("error cloud compliance doc %s %s", r.Error.Type, r.Error.Reason)
//		}
//		// processResourceNode(complianceDocs)
//	} else if docType == cloudComplianceLogsIndexName {
//		events := strings.Split(string(body), "\n")
//		bulkService := elastic.NewBulkService(esClient)
//		for _, event := range events {
//			if event != "" && strings.HasPrefix(event, "{") {
//				var cloudComplianceScanLog map[string]interface{}
//				err := json.Unmarshal([]byte(event), &cloudComplianceScanLog)
//				if err != nil {
//					continue
//				}
//				bulkIndexReq := elastic.NewBulkIndexRequest()
//				bulkIndexReq.Index(cloudComplianceLogsIndexName).Doc(cloudComplianceScanLog)
//				bulkService.Add(bulkIndexReq)
//			}
//		}
//		bulkService.Do(context.Background())
//	} else if docType == complianceIndexName {
//		var complianceDocs []ComplianceDoc
//		err := json.Unmarshal(body, &complianceDocs)
//		if err != nil {
//			return err
//		}
//		bulkService := elastic.NewBulkService(esClient)
//		for _, complianceDoc := range complianceDocs {
//			docId := fmt.Sprintf("%x", md5.Sum([]byte(complianceDoc.ScanId+complianceDoc.TestNumber+complianceDoc.Resource+complianceDoc.TestRationale)))
//			complianceDoc.DocId = docId
//			bulkIndexReq := elastic.NewBulkUpdateRequest()
//			bulkIndexReq.Index(complianceIndexName).Id(docId).
//				Script(elastic.NewScriptStored("default_upsert").Param("event", complianceDoc)).
//				Upsert(complianceDoc).ScriptedUpsert(true).RetryOnConflict(3)
//			bulkService.Add(bulkIndexReq)
//		}
//		bulkResp, err := bulkService.Do(context.Background())
//		if err != nil {
//			log.Println("err compliance " + err.Error())
//		}
//		failed := bulkResp.Failed()
//		log.Printf("compliance bulk response Succeeded=%d Failed=%d\n", len(bulkResp.Succeeded()), len(failed))
//		for _, r := range failed {
//			log.Printf("error compliance doc %s %s", r.Error.Type, r.Error.Reason)
//		}
//	} else if docType == complianceLogsIndexName {
//		events := strings.Split(string(body), "\n")
//		bulkService := elastic.NewBulkService(esClient)
//		for _, event := range events {
//			if event != "" && strings.HasPrefix(event, "{") {
//				var complianceScanLog map[string]interface{}
//				err := json.Unmarshal([]byte(event), &complianceScanLog)
//				if err != nil {
//					continue
//				}
//				bulkIndexReq := elastic.NewBulkIndexRequest()
//				bulkIndexReq.Index(complianceLogsIndexName).Doc(complianceScanLog)
//				bulkService.Add(bulkIndexReq)
//			}
//		}
//		bulkService.Do(context.Background())
//	} else if docType == cloudTrailAlertsIndexName {
//		var cloudTrailDocs []CloudTrailLogEvent
//		err := json.Unmarshal(body, &cloudTrailDocs)
//		if err != nil {
//			return err
//		}
//		bulkService := elastic.NewBulkService(esClient)
//		for _, cloudTrailDoc := range cloudTrailDocs {
//			docId := fmt.Sprintf("%x", md5.Sum([]byte(cloudTrailDoc.EventID)))
//			cloudTrailDoc.DocId = docId
//			bulkIndexReq := elastic.NewBulkUpdateRequest()
//			bulkIndexReq.Index(cloudTrailAlertsIndexName).Id(docId).
//				Script(elastic.NewScriptStored("default_upsert").Param("event", cloudTrailDoc)).
//				Upsert(cloudTrailDoc).ScriptedUpsert(true).RetryOnConflict(3)
//			bulkService.Add(bulkIndexReq)
//			event, err := json.Marshal(cloudTrailDoc)
//			if err == nil {
//				retryCount := 0
//				for {
//					_, err = redisConn.Do("PUBLISH", redisCloudTrailChannel, string(event))
//					if err == nil {
//						break
//					}
//					if retryCount > 1 {
//						fmt.Println(fmt.Sprintf("Error publishing cloudtrail alert document to %s - exiting", redisCloudTrailChannel), err)
//						break
//					}
//					fmt.Println(fmt.Sprintf("Error publishing cloudtrail alert document to %s - trying again", redisCloudTrailChannel), err)
//					retryCount += 1
//					time.Sleep(5 * time.Second)
//				}
//			}
//		}
//		bulkResp, err := bulkService.Do(context.Background())
//		if err != nil {
//			log.Println("err cloudtrail-alert " + err.Error())
//		}
//		failed := bulkResp.Failed()
//		log.Printf("cloudtrail alert bulk response Succeeded=%d Failed=%d\n", len(bulkResp.Succeeded()), len(failed))
//		for _, r := range failed {
//			log.Printf("error cloudtrail-alert doc %s %s", r.Error.Type, r.Error.Reason)
//		}
//	} else {
//		bulkService := elastic.NewBulkService(esClient)
//		bulkIndexReq := elastic.NewBulkIndexRequest()
//		bulkIndexReq.Index(docType).Doc(string(body))
//		bulkService.Add(bulkIndexReq)
//		res, _ := bulkService.Do(context.Background())
//		if res != nil && res.Errors {
//			for _, item := range res.Items {
//				resItem := item["index"]
//				if resItem != nil {
//					fmt.Println(resItem.Index)
//					fmt.Println("status:" + strconv.Itoa(resItem.Status))
//					if resItem.Error != nil {
//						fmt.Println("Error Type:" + resItem.Error.Type)
//						fmt.Println("Error Reason: " + resItem.Error.Reason)
//					}
//				}
//			}
//		}
//	}
//	return nil
//}

//func processResourceNode(docs []CloudComplianceDoc) {
//	if len(docs) == 0 {
//		return
//	}
//	accountId := docs[0].AccountID
//	postgresDb, err := sql.Open("postgres", psqlInfo)
//	if err != nil {
//		fmt.Println("Error in processing Resource Nodes: " + err.Error())
//		return
//	}
//	defer postgresDb.Close()
//	rows, err := postgresDb.Query("SELECT node_id,node_type from cloud_resource_node WHERE account_id=$1;", accountId)
//	if err != nil {
//		fmt.Println("Error in processing Resource Nodes retrieval: " + err.Error())
//		return
//	}
//	defer rows.Close()
//	nodeIdMap := make(map[string]string)
//	for rows.Next() {
//		var nodeId, nodeType string
//		err = rows.Scan(&nodeId, &nodeType)
//		if err == nil {
//			nodeIdMap[nodeId] = nodeType
//		} else {
//			fmt.Println("Error in processing Resource Nodes: row read" + err.Error())
//		}
//	}
//	for _, doc := range docs {
//		nodeType, found := nodeIdMap[doc.NodeID]
//		if found && nodeType == resourceToNodeTypeMap[doc.Resource] {
//			continue
//		} else {
//			sqlStatement := `INSERT INTO cloud_resource_node(node_id, node_type, node_name, cloud_provider, account_id, region, is_active)
//							 VALUES($1, $2, $3, $4, $5, $6, $7)`
//			_, err = postgresDb.Exec(sqlStatement, doc.NodeID, resourceToNodeTypeMap[doc.Resource], resourceToNodeTypeMap[doc.Resource], doc.CloudProvider, doc.AccountID, doc.Region, true)
//			if err != nil {
//				fmt.Println("Error in processing Resource Nodes: row insert" + err.Error())
//			}
//		}
//	}
//}
//
//func ingest(respWrite http.ResponseWriter, req *http.Request) {
//	// Send data to elasticsearch
//	defer req.Body.Close()
//	if req.Method != "POST" {
//		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
//		return
//	}
//	body, err := ioutil.ReadAll(req.Body)
//	if err != nil {
//		http.Error(respWrite, "Error reading request body", http.StatusInternalServerError)
//		return
//	}
//	docType := req.URL.Query().Get("doc_type")
//	docType = convertRootESIndexToCustomerSpecificESIndex(docType)
//	go ingestInBackground(docType, body)
//	respWrite.WriteHeader(http.StatusOK)
//	fmt.Fprintf(respWrite, "Ok")
//}

type vulnerabilityScanNode struct {
	NodeType string `json:"node_type"`
	NodeId   string `json:"node_id"`
}

func maskedCveId(respWrite http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	if req.Method != http.MethodPost {
		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
		return
	}
	ctx := context.Background()
	if esClient == nil {
		fmt.Fprint(respWrite, "[]")
		return
	}
	decoder := json.NewDecoder(req.Body)
	var vulnerabilityScanNode vulnerabilityScanNode
	err := decoder.Decode(&vulnerabilityScanNode)
	if err != nil || vulnerabilityScanNode.NodeType == "" || vulnerabilityScanNode.NodeId == "" {
		fmt.Println("there was some error in decoding")
		fmt.Fprint(respWrite, "[]")
		return
	}

	if vulnerabilityScanNode.NodeType == "container_image" {
		if !strings.Contains(vulnerabilityScanNode.NodeId, ":") {
			fmt.Println("image name does not contain :")
			fmt.Fprint(respWrite, "[]")
			return
		}
		vulnerabilityScanNode.NodeId = strings.ToLower(strings.Split(vulnerabilityScanNode.NodeId, ":")[0]) + ":"
	} else {
		vulnerabilityScanNode.NodeId = strings.ToLower(vulnerabilityScanNode.NodeId)
	}

	aggr := elastic.NewTermsAggregation().Field("cve_id.keyword").Size(100000)
	searchSource := elastic.NewSearchSource().Size(0).DocvalueFields("cve_id", "masked").Aggregation("cve_ids", aggr)
	boolQuery := elastic.NewBoolQuery()
	boolQuery.Must(elastic.NewMatchPhraseQuery("masked", "true"))
	boolQuery.Must(elastic.NewMatchPhraseQuery("node_type", vulnerabilityScanNode.NodeType))
	boolQuery.Must(elastic.NewPrefixQuery("cve_container_image.keyword", vulnerabilityScanNode.NodeId))
	searchSource.Query(boolQuery)

	// queryStr, _ := searchSource.Source()
	// esQuery, _ := json.Marshal(queryStr)
	// fmt.Println("maskedCveId query:\n", string(esQuery))

	searchService := esClient.Search().Index(cveIndexName).SearchSource(searchSource)
	searchResult, err := searchService.Do(ctx)
	if err != nil {
		fmt.Println("maskedCveId: ", err)
		fmt.Fprint(respWrite, "[]")
		return
	}
	var i interface{}
	err = json.Unmarshal(searchResult.Aggregations["cve_ids"], &i)
	if err != nil {
		fmt.Println("maskedCveId: ", err)
		fmt.Fprint(respWrite, "[]")
		return
	}
	val := i.(map[string]interface{})["buckets"]

	var maskedCveIds []string
	switch x := val.(type) {
	case []interface{}:
		for _, e := range x {
			md, _ := e.(map[string]interface{})
			maskedCveIds = append(maskedCveIds, md["key"].(string))
		}
	}
	maskedCveIdsJson, err := json.Marshal(maskedCveIds)
	if err != nil {
		fmt.Println("maskedCveId: ", err)
		fmt.Fprint(respWrite, "[]")
		return
	}
	respWrite.WriteHeader(http.StatusOK)
	fmt.Fprint(respWrite, string(maskedCveIdsJson))
}

func newRedisPool() *redis.Pool {
	var redisDbNumber int
	var errVal error
	dbNumStr := os.Getenv("REDIS_DB_NUMBER")
	if dbNumStr == "" {
		redisDbNumber = 0
	} else {
		redisDbNumber, errVal = strconv.Atoi(dbNumStr)
		if errVal != nil {
			redisDbNumber = 0
		}
	}
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "deepfence-redis"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	redisAddr := fmt.Sprintf("%s:%s", redisHost, redisPort)
	return &redis.Pool{
		MaxIdle:   50,
		MaxActive: 500, // max number of connections
		Dial: func() (redis.Conn, error) {
			c, err := redis.Dial("tcp", redisAddr, redis.DialDatabase(redisDbNumber))
			if err != nil {
				return nil, err
			}
			return c, err
		},
		IdleTimeout: 240 * time.Second,
		TestOnBorrow: func(c redis.Conn, t time.Time) error {
			_, err := c.Do("PING")
			return err
		},
	}
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func NewLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func logging(logger *log.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			lrw := NewLoggingResponseWriter(w)
			next.ServeHTTP(w, r)
			defer func() {
				logger.Println(r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), lrw.statusCode)
			}()
		})
	}
}

func main() {
	var err error
	//redisPool = newRedisPool()
	postgresPort := 5432
	postgresPortStr := os.Getenv("POSTGRES_USER_DB_PORT")
	if postgresPortStr != "" {
		postgresPort, err = strconv.Atoi(postgresPortStr)
		if err != nil {
			postgresPort = 5432
		}
	}
	psqlInfo = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("POSTGRES_USER_DB_HOST"), postgresPort, os.Getenv("POSTGRES_USER_DB_USER"),
		os.Getenv("POSTGRES_USER_DB_PASSWORD"), os.Getenv("POSTGRES_USER_DB_NAME"),
		os.Getenv("POSTGRES_USER_DB_SSLMODE"))

	esScheme := os.Getenv("ELASTICSEARCH_SCHEME")
	if esScheme == "" {
		esScheme = "http"
	}
	esHost := os.Getenv("ELASTICSEARCH_HOST")
	if esHost == "" {
		esHost = "deepfence-es"
	}
	esPort := os.Getenv("ELASTICSEARCH_PORT")
	if esPort == "" {
		esPort = "9200"
	}
	esUsername := os.Getenv("ELASTICSEARCH_USER")
	esPassword := os.Getenv("ELASTICSEARCH_PASSWORD")

	if esUsername != "" && esPassword != "" {
		esClient, err = elastic.NewClient(
			elastic.SetHealthcheck(false),
			elastic.SetSniff(false),
			elastic.SetURL(esScheme+"://"+esHost+":"+esPort),
			elastic.SetBasicAuth(esUsername, esPassword),
		)
	} else {
		esClient, err = elastic.NewClient(
			elastic.SetHealthcheck(false),
			elastic.SetSniff(false),
			elastic.SetURL(esScheme+"://"+esHost+":"+esPort),
		)
	}
	if err != nil {
		fmt.Printf("Error creating elasticsearch connection: %v", err)
	}
	vulnerabilityDbUpdater = NewVulnerabilityDbUpdater()
	go vulnerabilityDbUpdater.updateVulnerabilityDb()

	httpMux := http.NewServeMux()
	httpMux.HandleFunc("/df-api/uploadMultiPart", handleMultiPartPostMethod)
	httpMux.HandleFunc("/df-api/deleteDumps", handleDeleteDumpsMethod)
	httpMux.HandleFunc("/df-api/uploadExtractStatus", handleUploadExtractStatus)
	httpMux.HandleFunc("/df-api/clear", handleClearMethod)
	httpMux.HandleFunc("/df-api/downloadFile", handleFileDownload)
	httpMux.HandleFunc("/df-api/download/", handleDownload)
	httpMux.HandleFunc("/df-api/registry-credential", registryCredential)
	httpMux.HandleFunc("/df-api/packet-capture-config", packetCaptureConfig)
	// moved to reportHandler
	// httpMux.HandleFunc("/df-api/ingest", ingest)
	httpMux.HandleFunc("/df-api/masked-cve-id", maskedCveId)
	// Get user defined tags for a host
	httpMux.HandleFunc("/df-api/user-defined-tags", handleUserDefinedTags)
	// Get FIM config for this host from console
	httpMux.HandleFunc("/df-api/fim_config", getFimConfig)

	// Vulnerability database
	httpMux.HandleFunc("/vulnerability-db/listing.json", vulnerabilityDbListing)
	httpMux.HandleFunc("/df-api/upload-vulnerability-db", handleVulnerabilityFeedTarUpload)

	// Health Check
	httpMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("{\"status\":\"Healthy\"}"))
	})
	fmt.Println("fetcher server is starting")

	logger := log.New(os.Stdout, "fetcher-server: ", log.LstdFlags)
	logger.Println("Server is starting at 8006")
	errorLogger := log.New(os.Stderr, "fetcher-server: ", log.LstdFlags)
	server := &http.Server{
		Addr:              ":8006",
		Handler:           logging(logger)(httpMux),
		ReadTimeout:       15 * time.Minute,
		WriteTimeout:      15 * time.Minute,
		IdleTimeout:       60 * time.Second,
		ReadHeaderTimeout: 5 * time.Minute,
		ErrorLog:          errorLogger,
	}
	defer server.Close()
	log.Fatal(server.ListenAndServe())
}

// convertRootESIndexToCustomerSpecificESIndex : convert root ES index to customer specific ES index
func convertRootESIndexToCustomerSpecificESIndex(rootIndex string) string {
	customerUniqueId := os.Getenv("CUSTOMER_UNIQUE_ID")
	if customerUniqueId != "" {
		rootIndex += fmt.Sprintf("-%s", customerUniqueId)
	}
	return rootIndex
}

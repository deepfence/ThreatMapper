package main

import (
	"bytes"
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gomodule/redigo/redis"
	_ "github.com/lib/pq"
	elastic "github.com/olivere/elastic/v7"
)

const (
	cveIndexName              = "cve"
	cveScanLogsIndexName      = "cve-scan"
	sbomArtifactsIndexName    = "sbom-artifact"
	redisVulnerabilityChannel = "vulnerability_task_queue"
)

var (
	postgresDb *sql.DB
	psqlInfo   string
	redisPool  *redis.Pool
	esClient   *elastic.Client
)

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
	_, stdErr, retVal := runCommand("tar", "-xf", fileName, "--warning=none", "-C"+extractFolder)
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
		http.Error(respWrite, "Required information missing",
			http.StatusInternalServerError)
		return
	}
	if fileName != filepath.Clean(fileName) || !strings.HasPrefix(fileName, "/data") {
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
	dirs, err := ioutil.ReadDir(folderPath)
	if err != nil {
		fmt.Println(err)
		return
	}

	for _, f := range dirs {
		if f.IsDir() {
			files, err := ioutil.ReadDir(folderPath + "/" + f.Name())
			if err != nil {
				fmt.Println(err)
				return
			}
			for _, dumpName := range files {
				filePath = folderPath + "/" + f.Name() + "/" + dumpName.Name()
				fileInfo, _ := os.Stat(filePath)
				timeDiff := time.Now().Sub(fileInfo.ModTime()).Seconds()
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
	body, err := ioutil.ReadAll(resp.Body)
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
	fmt.Fprintf(respWrite, credentialsData)
}

func handleFileDownload(respWrite http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		http.Error(respWrite, "Invalid request", http.StatusInternalServerError)
		return
	}
	fileName := req.Header.Get("DF_FILE_NAME")
	if fileName == "" {
		respWrite.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(respWrite, "Required information missing")
		return
	}
	if fileName != filepath.Clean(fileName) || !strings.HasPrefix(fileName, "/data") {
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
		if checkOwaspDependencyDataDownloading() == true {
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
	fmt.Fprintf(respWrite, string(nodeTagsBytes))
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
	fmt.Fprintf(respWrite, string(fimConfigBytes))
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
	fmt.Fprintf(respWrite, string(captureConfig))
}

type dfCveStruct struct {
	Count                      int     `json:"count"`
	Timestamp                  string  `json:"@timestamp"`
	CveTuple                   string  `json:"cve_id_cve_severity_cve_container_image"`
	DocId                      string  `json:"doc_id"`
	Masked                     string  `json:"masked"`
	Type                       string  `json:"type"`
	Host                       string  `json:"host"`
	HostName                   string  `json:"host_name"`
	KubernetesClusterName      string  `json:"kubernetes_cluster_name"`
	NodeType                   string  `json:"node_type"`
	Scan_id                    string  `json:"scan_id"`
	Cve_id                     string  `json:"cve_id"`
	Cve_type                   string  `json:"cve_type"`
	Cve_container_image        string  `json:"cve_container_image"`
	Cve_container_image_id     string  `json:"cve_container_image_id"`
	Cve_container_name         string  `json:"cve_container_name"`
	Cve_severity               string  `json:"cve_severity"`
	Cve_caused_by_package      string  `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string  `json:"cve_caused_by_package_path"`
	Cve_container_layer        string  `json:"cve_container_layer"`
	Cve_fixed_in               string  `json:"cve_fixed_in"`
	Cve_link                   string  `json:"cve_link"`
	Cve_description            string  `json:"cve_description"`
	Cve_cvss_score             float64 `json:"cve_cvss_score"`
	Cve_overall_score          float64 `json:"cve_overall_score"`
	Cve_attack_vector          string  `json:"cve_attack_vector"`
}

func ingestInBackground(docType string, body []byte) error {
	redisConn := redisPool.Get()
	defer redisConn.Close()
	currTime := getCurrentTime()
	if docType == cveIndexName {
		var dfCveStructList []dfCveStruct
		err := json.Unmarshal(body, &dfCveStructList)
		if err != nil {
			return err
		}
		bulkService := elastic.NewBulkService(esClient)
		for _, cveStruct := range dfCveStructList {
			cveStruct.Timestamp = currTime
			if cveStruct.Cve_severity != "critical" && cveStruct.Cve_severity != "high" && cveStruct.Cve_severity != "medium" {
				cveStruct.Cve_severity = "low"
			}
			cveStruct.Count = 1
			cveStruct.CveTuple = fmt.Sprintf("%s|%s|%s", cveStruct.Cve_id, cveStruct.Cve_severity, cveStruct.Cve_container_image)
			docId := fmt.Sprintf("%x", md5.Sum([]byte(
				cveStruct.Scan_id+cveStruct.Cve_caused_by_package+cveStruct.Cve_container_image+cveStruct.Cve_id)))
			cveStruct.DocId = docId
			event, err := json.Marshal(cveStruct)
			if err == nil {
				bulkIndexReq := elastic.NewBulkIndexRequest()
				bulkIndexReq.Index(cveIndexName).Id(docId).Doc(string(event))
				bulkService.Add(bulkIndexReq)
				retryCount := 0
				for {
					_, err = redisConn.Do("PUBLISH", redisVulnerabilityChannel, string(event))
					if err == nil {
						break
					}
					if retryCount > 1 {
						fmt.Println(fmt.Sprintf("Error publishing cve document to %s - exiting", redisVulnerabilityChannel), err)
						break
					}
					fmt.Println(fmt.Sprintf("Error publishing cve document to %s - trying again", redisVulnerabilityChannel), err)
					retryCount += 1
					time.Sleep(5 * time.Second)
				}
			}
		}
		bulkService.Do(context.Background())
	} else if docType == cveScanLogsIndexName {
		events := strings.Split(string(body), "\n")
		bulkService := elastic.NewBulkService(esClient)
		for _, event := range events {
			if event != "" && strings.HasPrefix(event, "{") {
				var cveScanMap map[string]interface{}
				err := json.Unmarshal([]byte(event), &cveScanMap)
				if err != nil {
					continue
				}
				cveScanMap["masked"] = "false"
				cveScanMap["@timestamp"] = currTime
				bulkIndexReq := elastic.NewBulkIndexRequest()
				bulkIndexReq.Index(cveScanLogsIndexName).Doc(cveScanMap)
				bulkService.Add(bulkIndexReq)
			}
		}
		bulkService.Do(context.Background())
	} else if docType == sbomArtifactsIndexName {
		bulkService := elastic.NewBulkService(esClient)
		var artifacts []map[string]interface{}
		err := json.Unmarshal(body, &artifacts)
		if err != nil {
			fmt.Println("Error reading artifacts: ", err.Error())
		}
		for _, artifact := range artifacts {
			bulkIndexReq := elastic.NewBulkIndexRequest()
			bulkIndexReq.Index(docType).Doc(artifact)
			bulkService.Add(bulkIndexReq)
		}
		res, _ := bulkService.Do(context.Background())
		if res != nil && res.Errors {
			for _, item := range res.Items {
				resItem := item["index"]
				if resItem != nil {
					fmt.Println(resItem.Index)
					fmt.Println("status:" + strconv.Itoa(resItem.Status))
					if resItem.Error != nil {
						fmt.Println("Error Type:" + resItem.Error.Type)
						fmt.Println("Error Reason: " + resItem.Error.Reason)
					}
				}
			}
		}
	} else {
		bulkService := elastic.NewBulkService(esClient)
		bulkIndexReq := elastic.NewBulkIndexRequest()
		bulkIndexReq.Index(docType).Doc(string(body))
		bulkService.Add(bulkIndexReq)
		res, _ := bulkService.Do(context.Background())
		if res != nil && res.Errors {
			for _, item := range res.Items {
				resItem := item["index"]
				if resItem != nil {
					fmt.Println(resItem.Index)
					fmt.Println("status:" + strconv.Itoa(resItem.Status))
					if resItem.Error != nil {
						fmt.Println("Error Type:" + resItem.Error.Type)
						fmt.Println("Error Reason: " + resItem.Error.Reason)
					}
				}
			}
		}
	}
	return nil
}

func ingest(respWrite http.ResponseWriter, req *http.Request) {
	// Send data to elasticsearch
	defer req.Body.Close()
	if req.Method != "POST" {
		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
		return
	}
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		http.Error(respWrite, "Error reading request body", http.StatusInternalServerError)
		return
	}
	docType := req.URL.Query().Get("doc_type")
	go ingestInBackground(docType, body)
	respWrite.WriteHeader(http.StatusOK)
	fmt.Fprintf(respWrite, "Ok")
}

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
		MaxIdle:   25,
		MaxActive: 150, // max number of connections
		Dial: func() (redis.Conn, error) {
			c, err := redis.Dial("tcp", redisAddr, redis.DialDatabase(redisDbNumber))
			if err != nil {
				return nil, err
			}
			return c, err
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
	redisPool = newRedisPool()
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
	esHost := os.Getenv("ELASTICSEARCH_HOST")
	if esHost == "" {
		esHost = "deepfence-es"
	}
	esPort := os.Getenv("ELASTICSEARCH_PORT")
	if esPort == "" {
		esPort = "9200"
	}
	esClient, err = elastic.NewClient(
		elastic.SetHealthcheck(false),
		elastic.SetSniff(false),
		elastic.SetURL("http://"+esHost+":"+esPort),
	)
	if err != nil {
		fmt.Printf("Error creating elasticsearch connection: %v", err)
	}
	httpMux := http.NewServeMux()
	httpMux.HandleFunc("/df-api/uploadMultiPart", handleMultiPartPostMethod)
	httpMux.HandleFunc("/df-api/deleteDumps", handleDeleteDumpsMethod)
	httpMux.HandleFunc("/df-api/uploadExtractStatus", handleUploadExtractStatus)
	httpMux.HandleFunc("/df-api/clear", handleClearMethod)
	httpMux.HandleFunc("/df-api/downloadFile", handleFileDownload)
	httpMux.HandleFunc("/df-api/registry-credential", registryCredential)
	httpMux.HandleFunc("/df-api/packet-capture-config", packetCaptureConfig)
	httpMux.HandleFunc("/df-api/add-to-logstash", ingest) // depreciated
	httpMux.HandleFunc("/df-api/ingest", ingest)
	httpMux.HandleFunc("/df-api/masked-cve-id", maskedCveId)
	// Get user defined tags for a host
	httpMux.HandleFunc("/df-api/user-defined-tags", handleUserDefinedTags)
	// Get FIM config for this host from console
	httpMux.HandleFunc("/df-api/fim_config", getFimConfig)

	fmt.Println("vulnerability container is starting")

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
	log.Fatal(server.ListenAndServeTLS("/etc/filebeat/filebeat.crt", "/etc/filebeat/filebeat.key"))
}

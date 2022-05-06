package main

import (
	"fmt"
	"os"
	"time"
)

var (
	cveIndexName           = convertRootESIndexToCustomerSpecificESIndex("cve")
	cveScanLogsIndexName   = convertRootESIndexToCustomerSpecificESIndex("cve-scan")
	sbomArtifactsIndexName = convertRootESIndexToCustomerSpecificESIndex("sbom-artifact")
)

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

//convertRootESIndexToCustomerSpecificESIndex : convert root ES index to customer specific ES index
func convertRootESIndexToCustomerSpecificESIndex(rootIndex string) string {
	customerUniqueId := os.Getenv("CUSTOMER_UNIQUE_ID")
	if customerUniqueId != "" {
		rootIndex += fmt.Sprintf("-%s", customerUniqueId)
	}
	return rootIndex
}

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

// func ingest(respWrite http.ResponseWriter, req *http.Request) {
// 	// Send data to elasticsearch
// 	defer req.Body.Close()
// 	if req.Method != "POST" {
// 		http.Error(respWrite, "invalid request", http.StatusInternalServerError)
// 		return
// 	}
// 	body, err := ioutil.ReadAll(req.Body)
// 	if err != nil {
// 		http.Error(respWrite, "Error reading request body", http.StatusInternalServerError)
// 		return
// 	}
// 	docType := req.URL.Query().Get("doc_type")
// 	docType = convertRootESIndexToCustomerSpecificESIndex(docType)
// 	go ingestInBackground(docType, body)
// 	respWrite.WriteHeader(http.StatusOK)
// 	fmt.Fprintf(respWrite, "Ok")
// }

// func ingestInBackground(docType string, body []byte) error {
// 	// redisConn := redisPool.Get()
// 	// defer redisConn.Close()
// 	currTime := getCurrentTime()
// 	if docType == cveIndexName {
// 		var dfCveStructList []dfCveStruct
// 		err := json.Unmarshal(body, &dfCveStructList)
// 		if err != nil {
// 			return err
// 		}
// 		bulkService := elastic.NewBulkService(esClient)
// 		for _, cveStruct := range dfCveStructList {
// 			cveStruct.Timestamp = currTime
// 			if cveStruct.Cve_severity != "critical" && cveStruct.Cve_severity != "high" && cveStruct.Cve_severity != "medium" {
// 				cveStruct.Cve_severity = "low"
// 			}
// 			cveStruct.Count = 1
// 			cveStruct.CveTuple = fmt.Sprintf("%s|%s|%s", cveStruct.Cve_id, cveStruct.Cve_severity, cveStruct.Cve_container_image)
// 			docId := fmt.Sprintf("%x", md5.Sum([]byte(
// 				cveStruct.Scan_id+cveStruct.Cve_caused_by_package+cveStruct.Cve_container_image+cveStruct.Cve_id)))
// 			cveStruct.DocId = docId
// 			event, err := json.Marshal(cveStruct)
// 			if err == nil {
// 				bulkIndexReq := elastic.NewBulkIndexRequest()
// 				bulkIndexReq.Index(cveIndexName).Id(docId).Doc(string(event))
// 				bulkService.Add(bulkIndexReq)
// 				// retryCount := 0
// 				// for {
// 				// 	_, err = redisConn.Do("PUBLISH", redisVulnerabilityChannel, string(event))
// 				// 	if err == nil {
// 				// 		break
// 				// 	}
// 				// 	if retryCount > 1 {
// 				// 		fmt.Println(fmt.Sprintf("Error publishing cve document to %s - exiting", redisVulnerabilityChannel), err)
// 				// 		break
// 				// 	}
// 				// 	fmt.Println(fmt.Sprintf("Error publishing cve document to %s - trying again", redisVulnerabilityChannel), err)
// 				// 	retryCount += 1
// 				// 	time.Sleep(5 * time.Second)
// 				// }
// 			}
// 		}
// 		bulkService.Do(context.Background())
// 	} else if docType == cveScanLogsIndexName {
// 		events := strings.Split(string(body), "\n")
// 		bulkService := elastic.NewBulkService(esClient)
// 		for _, event := range events {
// 			if event != "" && strings.HasPrefix(event, "{") {
// 				var cveScanMap map[string]interface{}
// 				err := json.Unmarshal([]byte(event), &cveScanMap)
// 				if err != nil {
// 					continue
// 				}
// 				cveScanMap["masked"] = "false"
// 				cveScanMap["@timestamp"] = currTime
// 				bulkIndexReq := elastic.NewBulkIndexRequest()
// 				bulkIndexReq.Index(cveScanLogsIndexName).Doc(cveScanMap)
// 				bulkService.Add(bulkIndexReq)
// 			}
// 		}
// 		bulkService.Do(context.Background())
// 	} else if docType == sbomArtifactsIndexName {
// 		bulkService := elastic.NewBulkService(esClient)
// 		var artifacts []map[string]interface{}
// 		err := json.Unmarshal(body, &artifacts)
// 		if err != nil {
// 			fmt.Println("Error reading artifacts: ", err.Error())
// 		}
// 		for _, artifact := range artifacts {
// 			if len(artifact) == 0 {
// 				continue
// 			}
// 			bulkIndexReq := elastic.NewBulkIndexRequest()
// 			bulkIndexReq.Index(docType).Doc(artifact)
// 			bulkService.Add(bulkIndexReq)
// 		}
// 		res, _ := bulkService.Do(context.Background())
// 		if res != nil && res.Errors {
// 			for _, item := range res.Items {
// 				resItem := item["index"]
// 				if resItem != nil {
// 					if resItem.Error != nil {
// 						fmt.Println(resItem.Index)
// 						fmt.Println("Status: " + strconv.Itoa(resItem.Status))
// 						fmt.Println("Error Type:" + resItem.Error.Type)
// 						fmt.Println("Error Reason: " + resItem.Error.Reason)
// 					}
// 				}
// 			}
// 		}
// 	} else {
// 		bulkService := elastic.NewBulkService(esClient)
// 		bulkIndexReq := elastic.NewBulkIndexRequest()
// 		bulkIndexReq.Index(docType).Doc(string(body))
// 		bulkService.Add(bulkIndexReq)
// 		res, _ := bulkService.Do(context.Background())
// 		if res != nil && res.Errors {
// 			for _, item := range res.Items {
// 				resItem := item["index"]
// 				if resItem != nil {
// 					fmt.Println(resItem.Index)
// 					fmt.Println("status:" + strconv.Itoa(resItem.Status))
// 					if resItem.Error != nil {
// 						fmt.Println("Error Type:" + resItem.Error.Type)
// 						fmt.Println("Error Reason: " + resItem.Error.Reason)
// 					}
// 				}
// 			}
// 		}
// 	}
// 	return nil
// }

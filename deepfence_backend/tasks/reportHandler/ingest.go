package main

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/olivere/elastic/v7"
	kafka "github.com/segmentio/kafka-go"
)

var (
	cveIndexName            = convertRootESIndexToCustomerSpecificESIndex("cve")
	cveScanLogsIndexName    = convertRootESIndexToCustomerSpecificESIndex("cve-scan")
	secretScanIndexName     = convertRootESIndexToCustomerSpecificESIndex("secret-scan")
	secretScanLogsIndexName = convertRootESIndexToCustomerSpecificESIndex("secret-scan-logs")
	sbomArtifactsIndexName  = convertRootESIndexToCustomerSpecificESIndex("sbom-artifact")
	sbomCveScanIndexName    = convertRootESIndexToCustomerSpecificESIndex("sbom-cve-scan")
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

func startConsumers(brokers string, topics []string, group string, topicChannels map[string](chan []byte)) {

	log.Info("brokers: ", brokers)
	log.Info("topics: ", topics)
	log.Info("group ID: ", group)

	for _, t := range topics {
		go func(topic string, out chan []byte) {
			// https://pkg.go.dev/github.com/segmentio/kafka-go#ReaderConfig
			reader := kafka.NewReader(
				kafka.ReaderConfig{
					Brokers:               strings.Split(kafkaBrokers, ","),
					GroupID:               group,
					Topic:                 topic,
					MinBytes:              1e3, // 1KB
					MaxBytes:              5e6, // 5MB
					MaxWait:               5 * time.Second,
					WatchPartitionChanges: true,
					CommitInterval:        5 * time.Second,
					ErrorLogger:           kafka.LoggerFunc(log.Errorf),
				},
			)

			defer reader.Close()

			log.Infof("start consuming from topic %s", topic)
			for {
				m, err := reader.ReadMessage(context.Background())
				if err != nil {
					log.Error(err)
				}
				log.Debugf("received message from topic:%s partition:%d offset:%d message:%s", m.Topic, m.Partition, m.Offset, string(m.Value))
				out <- m.Value
			}
		}(t, topicChannels[t])
	}
}

func afterBulkPush(executionId int64, requests []elastic.BulkableRequest, response *elastic.BulkResponse, err error) {
	if err != nil {
		log.Error(err)
	}
	if response.Errors {
		for _, i := range response.Failed() {
			log.Errorf("index: %s error reason: %s error: %+v\n", i.Index, i.Error.Reason, i.Error)
		}
	}
	log.Infof("number of docs sent to es -> successful: %d failed: %d", len(response.Succeeded()), len(response.Failed()))
}

func startBulkProcessor(
	client *elastic.Client,
	flushInterval time.Duration,
	numWorkers int,
	numDocs int,
) *elastic.BulkProcessor {
	// Create processor
	bulk, err := elastic.NewBulkProcessorService(client).
		Backoff(elastic.StopBackoff{}).
		FlushInterval(flushInterval).
		Workers(numWorkers).
		BulkActions(numDocs).
		After(afterBulkPush).
		Stats(false).
		Do(context.Background())
	if err != nil {
		gracefulExit(err)
	}
	return bulk
}

func addToES(data []byte, index string, bulkp *elastic.BulkProcessor) error {
	var dataMap map[string]interface{}
	err := json.Unmarshal(data, &dataMap)
	if err != nil {
		return err
	}
	dataMap["masked"] = "false"
	dataMap["@timestamp"] = getCurrentTime()
	bulkp.Add(elastic.NewBulkIndexRequest().Index(index).Doc(dataMap))
	return nil
}

func processReports(topicChannels map[string](chan []byte), buklp *elastic.BulkProcessor) {
	for {
		select {
		case cve := <-topicChannels[cveIndexName]:
			var cveStruct dfCveStruct
			err := json.Unmarshal(cve, &cveStruct)
			if err != nil {
				log.Errorf("error reading cve: %s", err.Error())
				continue
			}
			cveStruct.Timestamp = getCurrentTime()
			if cveStruct.Cve_severity != "critical" && cveStruct.Cve_severity != "high" && cveStruct.Cve_severity != "medium" {
				cveStruct.Cve_severity = "low"
			}
			cveStruct.Count = 1
			cveStruct.CveTuple = fmt.Sprintf("%s|%s|%s", cveStruct.Cve_id, cveStruct.Cve_severity, cveStruct.Cve_container_image)
			docId := fmt.Sprintf("%x", md5.Sum([]byte(cveStruct.Scan_id+cveStruct.Cve_caused_by_package+cveStruct.Cve_container_image+cveStruct.Cve_id)))
			cveStruct.DocId = docId

			event, err := json.Marshal(cveStruct)
			if err != nil {
				log.Errorf("error marshal updated cve data: %s", err.Error())
				continue
			} else {
				buklp.Add(elastic.NewBulkIndexRequest().Index(cveIndexName).Doc(cveStruct))
				// publish after updating cve
				vulnerabilityTaskQueue <- event
			}

		case cveLog := <-topicChannels[cveScanLogsIndexName]:
			if err := addToES(cveLog, cveScanLogsIndexName, buklp); err != nil {
				log.Errorf("failed to process cve scan log error: %s", err.Error())
			}

		case secret := <-topicChannels[secretScanIndexName]:
			if err := addToES(secret, secretScanIndexName, buklp); err != nil {
				log.Errorf("failed to process secret scan error: %s", err.Error())
			}

		case secretLog := <-topicChannels[secretScanLogsIndexName]:
			if err := addToES(secretLog, secretScanLogsIndexName, buklp); err != nil {
				log.Errorf("failed to process secret scan log error: %s", err.Error())
			}

		case sbomArtifact := <-topicChannels[sbomArtifactsIndexName]:
			if err := addToES(sbomArtifact, sbomArtifactsIndexName, buklp); err != nil {
				log.Errorf("failed to process sbom artifacts error: %s", err.Error())
			}

		case sbomCve := <-topicChannels[sbomCveScanIndexName]:
			if err := addToES(sbomCve, sbomCveScanIndexName, buklp); err != nil {
				log.Errorf("failed to process sbom artifacts error: %s", err.Error())
			}

		}
	}
}

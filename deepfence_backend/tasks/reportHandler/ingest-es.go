package main

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"time"

	"github.com/olivere/elastic/v7"
)

func afterBulkpush(executionId int64, requests []elastic.BulkableRequest, response *elastic.BulkResponse, err error) {
	if err != nil {
		fmt.Println(err)
	}
	if response.Errors {
		for _, i := range response.Items {
			fmt.Printf("error %+v", i)
		}
	}
}

func startBulkProcessor(
	client *elastic.Client,
	flushInterval time.Duration,
	numWorkers int,
	numDocs int,
) *elastic.BulkProcessor {
	// Create processor
	bulk := elastic.NewBulkProcessorService(client).
		Backoff(elastic.StopBackoff{}).
		FlushInterval(flushInterval).
		Workers(numWorkers).
		BulkActions(numDocs).
		After(afterBulkpush)
	p, err := bulk.Do(context.Background())
	if err != nil {
		gracefulExit(err)
	}
	return p
}

func processReports(topicChannels map[string](chan []byte), buklp *elastic.BulkProcessor) {
	for {
		select {
		case cve := <-topicChannels[cveIndexName]:
			fmt.Println("cve: ", cve)
			var cveStruct dfCveStruct
			err := json.Unmarshal(cve, &cveStruct)
			if err != nil {
				fmt.Println("error reading cve: ", err.Error())
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
			if err == nil {
				r := elastic.NewBulkIndexRequest().Index(cveIndexName).Doc(cveStruct)
				buklp.Add(r)
				// publish after updating cve
				vulnerabilityTaskQueue <- event
			}

		case cveLog := <-topicChannels[cveScanLogsIndexName]:
			fmt.Println("cve log: ", cveLog)
			var cveScanMap map[string]interface{}
			err := json.Unmarshal(cveLog, &cveScanMap)
			if err != nil {
				fmt.Println("error reading cve scan logs: ", err.Error())
			}
			cveScanMap["masked"] = "false"
			cveScanMap["@timestamp"] = getCurrentTime()
			r := elastic.NewBulkIndexRequest().Index(cveScanLogsIndexName).Doc(cveScanMap)
			buklp.Add(r)

		case sbomArtifact := <-topicChannels[sbomArtifactsIndexName]:
			fmt.Println("sbom: ", sbomArtifact)
			var artifacts map[string]interface{}
			err := json.Unmarshal(sbomArtifact, &artifacts)
			if err != nil {
				fmt.Println("error reading sbom artifacts: ", err.Error())
				continue
			}
			r := elastic.NewBulkIndexRequest().Index(sbomArtifactsIndexName).Doc(artifacts)
			buklp.Add(r)
		}
	}
}

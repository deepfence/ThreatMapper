package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
	"github.com/olivere/elastic/v7"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	cveIndexName                     = ToCustomerSpecificESIndex("cve")
	cveScanLogsIndexName             = ToCustomerSpecificESIndex("cve-scan")
	secretScanIndexName              = ToCustomerSpecificESIndex("secret-scan")
	secretScanLogsIndexName          = ToCustomerSpecificESIndex("secret-scan-logs")
	malwareScanIndexName             = ToCustomerSpecificESIndex("malware-scan")
	malwareScanLogsIndexName         = ToCustomerSpecificESIndex("malware-scan-logs")
	sbomArtifactsIndexName           = ToCustomerSpecificESIndex("sbom-artifact")
	sbomCveScanIndexName             = ToCustomerSpecificESIndex("sbom-cve-scan")
	cloudComplianceScanIndexName     = ToCustomerSpecificESIndex("cloud-compliance-scan")
	cloudComplianceScanLogsIndexName = ToCustomerSpecificESIndex("cloud-compliance-scan-logs")
	complianceScanIndexName          = ToCustomerSpecificESIndex("compliance")
	complianceScanLogsIndexName      = ToCustomerSpecificESIndex("compliance-scan-logs")
	cloudTrailAlertsIndexName        = ToCustomerSpecificESIndex("cloudtrail-alert")
)

// ToCustomerSpecificESIndex : convert root ES index to customer specific ES index
func ToCustomerSpecificESIndex(rootIndex string) string {
	customerUniqueId := os.Getenv("CUSTOMER_UNIQUE_ID")
	if customerUniqueId != "" {
		rootIndex += fmt.Sprintf("-%s", customerUniqueId)
	}
	return rootIndex
}

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

func startKafkaConsumers(
	ctx context.Context,
	brokers string,
	topics []string,
	group string,
	topicChannels map[string](chan []byte),
) {

	log.Info("brokers: ", brokers)
	log.Info("topics: ", topics)
	log.Info("group ID: ", group)

	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(brokers, ",")...),
		kgo.ConsumerGroup(group),
		kgo.ConsumeTopics(topics...),
		kgo.ClientID(group),
		kgo.FetchMinBytes(1e3),
		kgo.WithLogger(kgoLogger),
	}

	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		log.Error(err)
	}
	defer kClient.Close()

	if err := kClient.Ping(ctx); err != nil {
		log.Error(err)
	}

	for {
		select {
		case <-ctx.Done():
			log.Info("stop consuming from kafka")
			return
		default:
			records := kClient.PollRecords(ctx, 1000)
			records.EachRecord(
				func(r *kgo.Record) {
					topicChannels[r.Topic] <- r.Value
				},
			)
			records.EachError(
				func(s string, i int32, err error) {
					log.Errorf("topic=%s partition=%d error: %s", s, i, err)
				},
			)
		}
	}

}

func afterBulkPush(
	executionId int64,
	requests []elastic.BulkableRequest,
	response *elastic.BulkResponse,
	err error,
) {
	if err != nil {
		log.Error(err)
	}
	if response.Errors {
		for _, i := range response.Failed() {
			publishElasticSearch.WithLabelValues("failed").Inc()
			log.Errorf("index: %s error reason: %s error: %+v\n",
				i.Index, i.Error.Reason, i.Error)
		}
	}
	log.Infof("number of docs sent to es -> successful: %d failed: %d",
		len(response.Succeeded()), len(response.Failed()))
	publishElasticSearch.WithLabelValues("success").Add(float64(len(response.Succeeded())))
	for _, i := range response.Succeeded() {
		publishElasticSearch.WithLabelValues(i.Result).Inc()
	}
}

func startESBulkProcessor(
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

func notifySecretQueue(data []byte) error {
	var dataMap map[string]interface{}
	err := json.Unmarshal(data, &dataMap)
	if err != nil {
		return err
	}
	dataMap["masked"] = "false"
	dataMap["@timestamp"] = getCurrentTime()
	event, err := json.Marshal(dataMap)
	if err != nil {
		log.Errorf("error marshal updated secret: %s", err)
		return err
	} else {
		secretTaskQueue <- event
	}
	return nil
}

func notifyMalwareQueue(data []byte) error {
	var dataMap map[string]interface{}
	err := json.Unmarshal(data, &dataMap)
	if err != nil {
		return err
	}
	dataMap["masked"] = "false"
	dataMap["@timestamp"] = getCurrentTime()
	event, err := json.Marshal(dataMap)
	if err != nil {
		log.Errorf("error marshal updated secret: %s", err)
		return err
	} else {
		malwareTaskQueue <- event
	}
	return nil
}

func processReports(
	ctx context.Context,
	topicChannels map[string](chan []byte),
	bulkp *elastic.BulkProcessor,
) {
	for {
		select {
		case <-ctx.Done():
			log.Info("stop processing data from kafka")
			return

		case cve := <-topicChannels[cveIndexName]:
			cveProcessed.Inc()
			processCVE(cve, bulkp)

		case cveLog := <-topicChannels[cveScanLogsIndexName]:
			cveLogsProcessed.Inc()
			if err := addToES(cveLog, cveScanLogsIndexName, bulkp); err != nil {
				log.Errorf("failed to process cve scan log error: %s", err.Error())
			}

		case secret := <-topicChannels[secretScanIndexName]:
			secretProcessed.Inc()
			if err := addToES(secret, secretScanIndexName, bulkp); err != nil {
				log.Errorf("failed to process secret scan error: %s", err.Error())
			} else {
				if err := notifySecretQueue(secret); err != nil {
					log.Errorf("error pushing to queue: %s", err.Error())
				}
			}

		case secretLog := <-topicChannels[secretScanLogsIndexName]:
			secretLogsProcessed.Inc()
			if err := addToES(secretLog, secretScanLogsIndexName, bulkp); err != nil {
				log.Errorf("failed to process secret scan log error: %s", err.Error())
			}

		case malware := <-topicChannels[malwareScanIndexName]:
			malwareProcessed.Inc()
			if err := addToES(malware, malwareScanIndexName, bulkp); err != nil {
				log.Errorf("failed to process malware scan error: %s", err.Error())
			} else {
				if err := notifyMalwareQueue(malware); err != nil {
					log.Errorf("error pushing to queue: %s", err.Error())
				}
			}

		case malwareLog := <-topicChannels[malwareScanLogsIndexName]:
			malwareLogsProcessed.Inc()
			if err := addToES(malwareLog, malwareScanLogsIndexName, bulkp); err != nil {
				log.Errorf("failed to process malware scan log error: %s", err.Error())
			}

		case sbomArtifact := <-topicChannels[sbomArtifactsIndexName]:
			sbomArtifactsProcessed.Inc()
			if err := addToES(sbomArtifact, sbomArtifactsIndexName, bulkp); err != nil {
				log.Errorf("failed to process sbom artifacts error: %s", err.Error())
			}

		case sbomCve := <-topicChannels[sbomCveScanIndexName]:
			sbomCveProcessed.Inc()
			if err := addToES(sbomCve, sbomCveScanIndexName, bulkp); err != nil {
				log.Errorf("failed to process sbom artifacts error: %s", err.Error())
			}

		case cloudCompliance := <-topicChannels[cloudComplianceScanIndexName]:
			cloudComplianceProcessed.Inc()
			processCloudCompliance(cloudCompliance, bulkp)

		case cloudComplianceLog := <-topicChannels[cloudComplianceScanLogsIndexName]:
			cloudComplianceLogsProcessed.Inc()
			if err := addToES(cloudComplianceLog, cloudComplianceScanLogsIndexName, bulkp); err != nil {
				log.Errorf("failed to process cloud compliance logs error: %s", err.Error())
			}

		case compliance := <-topicChannels[complianceScanIndexName]:
			complianceProcessed.Inc()
			processCompliance(compliance, bulkp)

		case complianceLog := <-topicChannels[complianceScanLogsIndexName]:
			complianceLogsProcessed.Inc()
			if err := addToES(complianceLog, complianceScanLogsIndexName, bulkp); err != nil {
				log.Errorf("failed to process compliance logs error: %s", err.Error())
			}

		case cloudTrailAlert := <-topicChannels[cloudTrailAlertsIndexName]:
			cloudTrailAlertsProcessed.Inc()
			processCloudTrailAlert(cloudTrailAlert, bulkp)
		}
	}
}

func subscribeTOMaskedCVE(ctx context.Context, rpool *redis.Pool, mchan chan MaskDocID) {
	c := rpool.Get()
	psc := redis.PubSubConn{Conn: c}
	err := psc.Subscribe("mask-cve")
	if err != nil {
		log.Error(err)
	}

	for {
		select {
		case <-ctx.Done():
			if err := psc.Unsubscribe(); err != nil {
				log.Error(err)
			}
			log.Info("stop receiving from redis, unsubscribe all")
			return
		default:
			switch v := psc.Receive().(type) {
			case redis.Message:
				log.Infof("redis channel:%s message:%s", v.Channel, v.Data)
				var m MaskDocID
				if err := json.Unmarshal(v.Data, &m); err != nil {
					log.Errorf("failed to unmarshal data from mask-cve subscription: %s", err)
				} else {
					mchan <- m
				}
			case redis.Subscription:
				log.Infof("channel:%s kind:%s #subscriptions:%d", v.Channel, v.Kind, v.Count)
			case error:
				log.Error(v)
			}
		}
	}
}

package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gocelery/gocelery"
	"github.com/gomodule/redigo/redis"
	_ "github.com/lib/pq"
	elastic "github.com/olivere/elastic/v7"
)

type NotificationSettings struct {
	vulnerabilityNotificationsSet bool
	sync.RWMutex
}

var (
	redisPubSub            *redis.PubSubConn
	redisPool              *redis.Pool
	postgresDb             *sql.DB
	redisAddr              string
	vulnerabilityTaskQueue chan []byte
	celeryCli              *gocelery.CeleryClient
	// resourcePubsubToChanMap map[string]chan []byte
	notificationSettings NotificationSettings
	esClient             *elastic.Client
	kafkaBrokers         string
)

func init() {
	redisAddr = fmt.Sprintf("%s:%s", os.Getenv("REDIS_HOST"), os.Getenv("REDIS_PORT"))
	redisPool = newRedisPool()
	var err error
	postgresPort := 5432
	postgresPortStr := os.Getenv("POSTGRES_USER_DB_PORT")
	if postgresPortStr != "" {
		postgresPort, err = strconv.Atoi(postgresPortStr)
		if err != nil {
			postgresPort = 5432
		}
	}
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("POSTGRES_USER_DB_HOST"), postgresPort, os.Getenv("POSTGRES_USER_DB_USER"),
		os.Getenv("POSTGRES_USER_DB_PASSWORD"), os.Getenv("POSTGRES_USER_DB_NAME"),
		os.Getenv("POSTGRES_USER_DB_SSLMODE"))
	postgresDb, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		gracefulExit(err)
	}
	err = postgresDb.Ping()
	if err != nil {
		gracefulExit(err)
	}
	time.Sleep(10 * time.Second)
	tablesToCheck := []string{"vulnerability_notification"}
	for _, tableName := range tablesToCheck {
		var tableExists bool
		row := postgresDb.QueryRow("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1)", tableName)
		err := row.Scan(&tableExists)
		if err != nil {
			gracefulExit(err)
		}
		if !tableExists {
			gracefulExit(errors.New("table " + tableName + " does not exist"))
		}
	}
	vulnerabilityTaskQueue = make(chan []byte, 10000)
	// resourcePubsubToChanMap = map[string]chan []byte{
	// 	vulnerabilityRedisPubsubName: vulnerabilityTaskQueue,
	// }
	notificationSettings = NotificationSettings{
		vulnerabilityNotificationsSet: false,
	}

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
		gracefulExit(err)
	}

	kafkaBrokers := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "deepfence-kafka-broker:29092"
	}
	err = checkKafkaConn()
	if err != nil {
		gracefulExit(err)
	}

}

// func initRedisPubsub() {
// 	redisPubSub = &redis.PubSubConn{Conn: redisPool.Get()}
// 	err := redisPubSub.Subscribe(vulnerabilityRedisPubsubName)
// 	if err != nil {
// 		gracefulExit(err)
// 	}
// }

// func receiveMessagesFromRedisPubsub() {
// 	for {
// 		switch v := redisPubSub.Receive().(type) {
// 		case redis.Message:
// 			resourcePubsubToChanMap[v.Channel] <- v.Data
// 		case redis.Subscription:
// 			//log.Printf("subscription message: %s: %s %d\n", v.Channel, v.Kind, v.Count)
// 		case error:
// 			log.Println("Error on redisPubSub.Receive(): ", v.Error())
// 			time.Sleep(5 * time.Second)
// 			// re initialize redis pubsub
// 			initRedisPubsub()
// 		}
// 	}
// }

func createNotificationCeleryTask(resourceType string, messages []interface{}) {
	kwargs := make(map[string]interface{})
	kwargs["notification_type"] = resourceType
	kwargs["data"] = messages
	_, err := celeryCli.DelayKwargs(celeryNotificationTask, kwargs)
	if err != nil {
		log.Println(err)
	}
}

func batchMessages(resourceType string, resourceChan *chan []byte, batchSize int) {
	for {
		var messages []interface{}
		ticker := time.NewTicker(15 * time.Second)
		for {
			breakFor := false
			select {
			case msg := <-*resourceChan:
				var msgJson interface{}
				err := json.Unmarshal(msg, &msgJson)
				if err != nil {
					log.Println(err)
					break
				}
				messages = append(messages, msgJson)
				if len(messages) >= batchSize {
					breakFor = true
				}
			case <-ticker.C:
				breakFor = true
			}
			if breakFor {
				break
			}
		}
		if len(messages) > 0 {
			go func() {
				if resourceType == resourceTypeVulnerability {
					notificationSettings.RLock()
					vulnerabilityNotificationsSet := notificationSettings.vulnerabilityNotificationsSet
					notificationSettings.RUnlock()
					if vulnerabilityNotificationsSet {
						createNotificationCeleryTask(resourceType, messages)
					}
				}
			}()
		}
	}
}

func main() {
	log.SetFlags(0)
	// initRedisPubsub()
	var err error
	celeryCli, err = gocelery.NewCeleryClient(
		gocelery.NewRedisBroker(redisPool), &gocelery.RedisCeleryBackend{Pool: redisPool}, 1)
	if err != nil {
		gracefulExit(err)
	}
	go syncPoliciesAndNotifications()
	go batchMessages(resourceTypeVulnerability, &vulnerabilityTaskQueue, 100)
	// receiveMessagesFromRedisPubsub()

	topicChannels := make(map[string](chan []byte))
	topics := []string{cveIndexName, cveScanLogsIndexName, sbomArtifactsIndexName}
	for _, t := range topics {
		topicChannels[t] = make(chan []byte)
	}

	consumerGroupID := os.Getenv("CUSTOMER_UNIQUE_ID")
	if consumerGroupID == "" {
		consumerGroupID = "default"
	}

	startConsumers(kafkaBrokers, topics, consumerGroupID, topicChannels)
	bulkp := startBulkProcessor(esClient, 5*time.Second, 2, 100)
	processReports(topicChannels, bulkp)
}

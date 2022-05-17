package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gocelery/gocelery"
	"github.com/gomodule/redigo/redis"
	_ "github.com/lib/pq"
	elastic "github.com/olivere/elastic/v7"
	logrus "github.com/sirupsen/logrus"
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
	notificationSettings   NotificationSettings
	esClient               *elastic.Client
	kafkaBrokers           string
	log                    *logrus.Logger
)

// func funcName(fname string) string {
// 	if strings.Contains(fname, ".") {
// 		s := strings.Split(fname, ".")
// 		return s[len(s)-1]
// 	}
// 	return fname
// }

func init() {

	// setup logger
	log = logrus.New()
	debug := os.Getenv("DEBUG")
	if strings.ToLower(debug) == "true" {
		log.SetLevel(logrus.DebugLevel)
	} else {
		log.SetLevel(logrus.InfoLevel)
	}
	log.SetOutput(os.Stdout)
	log.SetReportCaller(true)
	log.SetFormatter(&logrus.TextFormatter{
		ForceColors:   true,
		FullTimestamp: true,
		PadLevelText:  true,
		CallerPrettyfier: func(f *runtime.Frame) (string, string) {
			// return funcName(f.Func.Name()) + "()", " " + path.Base(f.File) + ":" + strconv.Itoa(f.Line)
			return "", " " + path.Base(f.File) + ":" + strconv.Itoa(f.Line)
		},
	})

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

	kafkaBrokers = os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "deepfence-kafka-broker:29092"
	}
	err = checkKafkaConn()
	if err != nil {
		gracefulExit(err)
	}

}

func createNotificationCeleryTask(resourceType string, messages []interface{}) {
	kwargs := make(map[string]interface{})
	kwargs["notification_type"] = resourceType
	kwargs["data"] = messages
	_, err := celeryCli.DelayKwargs(celeryNotificationTask, kwargs)
	if err != nil {
		log.Error(err)
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
					log.Error(err)
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
	var err error
	celeryCli, err = gocelery.NewCeleryClient(gocelery.NewRedisBroker(redisPool),
		&gocelery.RedisCeleryBackend{Pool: redisPool}, 1)
	if err != nil {
		gracefulExit(err)
	}
	go syncPoliciesAndNotifications()
	go batchMessages(resourceTypeVulnerability, &vulnerabilityTaskQueue, 100)

	// load cve's from db
	maskedCVELock.Lock()
	maskedCVE = listAllCVE(postgresDb)
	maskedCVELock.Unlock()

	mchan := make(chan MaskDocID, 100)
	go subscribeTOMaskedCVE(redisPool, mchan)
	go getMaskDocES(esClient, mchan)

	consumerGroupID := os.Getenv("CUSTOMER_UNIQUE_ID")
	if consumerGroupID == "" {
		log.Warn("empty CUSTOMER_UNIQUE_ID, setting kafka-consumer-group-id to 'default'")
		consumerGroupID = "default"
	}

	// list of kafka topics to fetch messages
	topics := []string{
		cveIndexName,
		cveScanLogsIndexName,
		secretScanIndexName,
		secretScanLogsIndexName,
		sbomArtifactsIndexName,
		sbomCveScanIndexName,
	}
	log.Info("topics list: ", topics)

	//create if any topics is missing
	err = createMissingTopics(topics)
	if err != nil {
		log.Error(err)
	}

	// channels to pass message between report processor and consumer
	topicChannels := make(map[string](chan []byte))
	for _, t := range topics {
		topicChannels[t] = make(chan []byte, 100)
	}

	startKafakConsumers(kafkaBrokers, topics, consumerGroupID, topicChannels)

	bulkp := startESBulkProcessor(esClient, 5*time.Second, 2, 100)
	defer bulkp.Close()

	processReports(topicChannels, bulkp)
}

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gocelery/gocelery"
	"github.com/gomodule/redigo/redis"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	elastic "github.com/olivere/elastic/v7"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	logrus "github.com/sirupsen/logrus"
)

type NotificationSettings struct {
	vulnerabilityNotificationsSet bool
	complianceNotificationsSet    bool
	cloudTrailNotificationsSet    bool
	secretNotificationsSet        bool
	malwareNotificationsSet       bool
	sync.RWMutex
}

var (
	redisPubSub            *redis.PubSubConn
	redisPool              *redis.Pool
	pgDB                   *sqlx.DB
	redisAddr              string
	vulnerabilityTaskQueue chan []byte
	complianceTaskQueue    chan []byte
	cloudTrailTaskQueue    chan []byte
	malwareTaskQueue       chan []byte
	secretTaskQueue        chan []byte
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
	pgDB, err = sqlx.Open("postgres", psqlInfo)
	if err != nil {
		gracefulExit(err)
	}
	err = pgDB.Ping()
	if err != nil {
		gracefulExit(err)
	}
	time.Sleep(10 * time.Second)
	tablesToCheck := []string{"vulnerability_notification", "secret_notification", "malware_notification", maskedCVEDBTable}
	for _, tableName := range tablesToCheck {
		var tableExists bool
		row := pgDB.QueryRow("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1)", tableName)
		err := row.Scan(&tableExists)
		if err != nil {
			gracefulExit(err)
		}
		if !tableExists {
			gracefulExit(errors.New("table " + tableName + " does not exist"))
		}
	}
	vulnerabilityTaskQueue = make(chan []byte, 10000)
	complianceTaskQueue = make(chan []byte, 10000)
	cloudTrailTaskQueue = make(chan []byte, 10000)
	secretTaskQueue = make(chan []byte, 10000)
	malwareTaskQueue = make(chan []byte, 10000)
	notificationSettings = NotificationSettings{
		vulnerabilityNotificationsSet: false,
		complianceNotificationsSet:    false,
		cloudTrailNotificationsSet:    false,
		secretNotificationsSet:        false,
		malwareNotificationsSet:       false,
	}

	esScheme := os.Getenv("ELASTICSEARCH_SCHEME")
	esHost := os.Getenv("ELASTICSEARCH_HOST")
	esUsername := os.Getenv("ELASTICSEARCH_USER")
	esPassword := os.Getenv("ELASTICSEARCH_PASSWORD")
	esPort := os.Getenv("ELASTICSEARCH_PORT")

	if esScheme == "" {
		esScheme = "http"
	}
	if esHost == "" {
		esHost = "deepfence-es"
	}
	if esPort == "" {
		esPort = "9200"
	}

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
		kafkaBrokers = "deepfence-kafka-broker:9092"
	}
	err = checkKafkaConn()
	if err != nil {
		gracefulExit(err)
	}

}

func createNotificationCeleryTask(resourceType string, messages []interface{}) {
	log.Infof("create celery task for %s", resourceType)
	kwargs := make(map[string]interface{})
	kwargs["notification_type"] = resourceType
	kwargs["data"] = messages
	_, err := celeryCli.DelayKwargs(celeryNotificationTask, kwargs)
	if err != nil {
		log.Error(err)
	}
}

func createCeleryTasks(resourceType string, messages []interface{}) {
	if resourceType == resourceTypeVulnerability {
		notificationSettings.RLock()
		vulnerabilityNotificationsSet := notificationSettings.vulnerabilityNotificationsSet
		notificationSettings.RUnlock()
		if vulnerabilityNotificationsSet {
			createNotificationCeleryTask(resourceType, messages)
		}
	} else if resourceType == resourceTypeCompliance {
		notificationSettings.RLock()
		complianceNotificationsSet := notificationSettings.complianceNotificationsSet
		notificationSettings.RUnlock()
		if complianceNotificationsSet {
			createNotificationCeleryTask(resourceType, messages)
		}
	} else if resourceType == resourceTypeCloudTrailAlert {
		notificationSettings.RLock()
		cloudTrailNotificationsSet := notificationSettings.cloudTrailNotificationsSet
		notificationSettings.RUnlock()
		if cloudTrailNotificationsSet {
			createNotificationCeleryTask(resourceType, messages)
		}
	} else if resourceType == resourceTypeMalware {
		notificationSettings.RLock()
		malwareNotificationsSet := notificationSettings.malwareNotificationsSet
		notificationSettings.RUnlock()
		if malwareNotificationsSet {
			createNotificationCeleryTask(resourceType, messages)
		}
	} else if resourceType == resourceTypeSecret {
		notificationSettings.RLock()
		secretNotificationsSet := notificationSettings.secretNotificationsSet
		notificationSettings.RUnlock()
		if secretNotificationsSet {
			createNotificationCeleryTask(resourceType, messages)
		}
	}
}

func batchMessages(ctx context.Context, resourceType string,
	resourceChan *chan []byte, batchSize int) {
	for {
		var messages []interface{}
		ticker := time.NewTicker(15 * time.Second)
		exit := false
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
			case <-ctx.Done():
				log.Infof("stop batchMessages for %s", resourceType)
				breakFor = true
				exit = true
			}
			if breakFor {
				break
			}
		}
		if len(messages) > 0 {
			log.Infof("messages length is %d", len(messages))
			go func() {
				createCeleryTasks(resourceType, messages)
			}()
		}
		if exit {
			return
		}
	}
}

func main() {

	ctx, cancel := signal.NotifyContext(context.Background(),
		os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// for prometheus metrics
	mux := http.NewServeMux()
	srv := &http.Server{Addr: "0.0.0.0:8181", Handler: mux}
	mux.Handle("/metrics", promhttp.Handler())
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Errorf("Server listen failed: %s", err)
		}
	}()
	log.Info("Server Started for metrics")

	var err error
	celeryCli, err = gocelery.NewCeleryClient(gocelery.NewRedisBroker(redisPool),
		&gocelery.RedisCeleryBackend{Pool: redisPool}, 1)
	if err != nil {
		gracefulExit(err)
	}
	go syncPoliciesAndNotifications()
	go batchMessages(ctx, resourceTypeVulnerability, &vulnerabilityTaskQueue, 100)
	go batchMessages(ctx, resourceTypeCompliance, &complianceTaskQueue, 100)
	go batchMessages(ctx, resourceTypeCloudTrailAlert, &cloudTrailTaskQueue, 100)
	go batchMessages(ctx, resourceTypeMalware, &malwareTaskQueue, 100)
	go batchMessages(ctx, resourceTypeSecret, &secretTaskQueue, 100)

	// load cve's from db
	maskedCVELock.Lock()
	maskedCVE = listAllCVE(pgDB)
	maskedCVELock.Unlock()

	mchan := make(chan MaskDocID, 100)
	go subscribeTOMaskedCVE(ctx, redisPool, mchan)
	go startMaskCVE(ctx, esClient, mchan)

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
		malwareScanIndexName,
		malwareScanLogsIndexName,
		sbomArtifactsIndexName,
		sbomCveScanIndexName,
		cloudComplianceScanIndexName,
		cloudComplianceScanLogsIndexName,
		complianceScanIndexName,
		complianceScanLogsIndexName,
		cloudTrailAlertsIndexName,
	}
	log.Info("topics list: ", topics)

	//create if any topics is missing
	partitions := GetEnvIntWithDefault("KAFKA_TOPIC_PARTITIONS", 1)
	replicas := GetEnvIntWithDefault("KAFKA_TOPIC_REPLICAS", 1)
	retention_ms := GetEnvStringWithDefault("KAFKA_TOPIC_RETENTION_MS", "86400000")
	err = createMissingTopics(topics, int32(partitions), int16(replicas), retention_ms)
	if err != nil {
		log.Error(err)
	}

	// channels to pass message between report processor and consumer
	topicChannels := make(map[string](chan []byte))
	for _, t := range topics {
		topicChannels[t] = make(chan []byte, 1000)
	}

	go startKafkaConsumers(ctx, kafkaBrokers, topics, consumerGroupID, topicChannels)

	esDocSize := GetEnvIntWithDefault("ES_BULK_DOC_SIZE", 1000)
	esBulkWorkers := GetEnvIntWithDefault("ES_BULK_NUM_WORKERS", 6)
	log.Infof("set es bulk workers=%d and bulk docs size=%d", esBulkWorkers, esDocSize)
	bulkp := startESBulkProcessor(esClient, 5*time.Second, esBulkWorkers, esDocSize)
	defer bulkp.Close()

	numProcessReport := GetEnvIntWithDefault("PROCESS_REPORT_PARALLEL", 15)
	log.Infof("num of parallel processReports %d", numProcessReport)
	// start multiple processReports goroutines if required
	for i := numProcessReport; i > 0; i-- {
		go processReports(ctx, topicChannels, bulkp)
	}

	// collect consumer lag for metrics
	go getLagByTopic(ctx, kafkaBrokers, consumerGroupID)
	// wait for exit
	// flush all data from bulk processor
	<-ctx.Done()
	log.Info("ctx cancelled exit")
	if err := bulkp.Flush(); err != nil {
		log.Error(err)
	}
	if err := bulkp.Stop(); err != nil {
		log.Error(err)
	}
	// stop server
	if err := srv.Shutdown(ctx); err != nil {
		log.Errorf("Server Shutdown Failed: %s", err)
	}
	gracefulExit(nil)
}

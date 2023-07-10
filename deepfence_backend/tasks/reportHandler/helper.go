package main

import (
	"context"
	"encoding/json"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
	"github.com/olivere/elastic/v7"
	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	resourceTypeVulnerability   = "vulnerability"
	resourceTypeCompliance      = "compliance"
	resourceTypeCloudTrailAlert = "cloudtrail-alert"
	resourceTypeSecret          = "secret-scan"
	resourceTypeMalware         = "malware-scan"
	celeryNotificationTask      = "tasks.notification_worker.notification_task"
)

func getRedisDbNumber() int {
	var dbNumInt int
	var errVal error
	dbNumStr := os.Getenv("REDIS_DB_NUMBER")
	if dbNumStr == "" {
		dbNumInt = 0
	} else {
		dbNumInt, errVal = strconv.Atoi(dbNumStr)
		if errVal != nil {
			dbNumInt = 0
		}
	}
	return dbNumInt
}

func newRedisPool() *redis.Pool {
	redisDbNumber := getRedisDbNumber()
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

var kgoLogger kgo.Logger = kgo.BasicLogger(
	os.Stdout,
	kgo.LogLevelInfo,
	func() string { return "[" + getCurrentTime() + "]" + " " },
)

func checkKafkaConn() error {
	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(kafkaBrokers, ",")...),
		kgo.WithLogger(kgoLogger),
	}
	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}
	defer kClient.Close()
	if err := kClient.Ping(context.Background()); err != nil {
		return err
	}
	log.Info("connection successful to kafka brokers " + kafkaBrokers)
	return nil
}

func createMissingTopics(topics []string, partitions int32, replicas int16, retention_ms string) error {
	log.Infof("create topics with partitions=%d and replicas=%d", partitions, replicas)

	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(kafkaBrokers, ",")...),
		kgo.WithLogger(kgoLogger),
	}
	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}
	defer kClient.Close()
	if err := kClient.Ping(context.Background()); err != nil {
		return err
	}

	adminClient := kadm.NewClient(kClient)
	defer adminClient.Close()

	// bm, err := adminClient.BrokerMetadata(context.Background())
	// if err != nil {
	// 	log.Error(err)
	// }

	// partitions = int32(1)
	// replication = func() int16 {
	// 	if len(bm.Brokers.NodeIDs()) >= 3 {
	// 		return 3
	// 	}
	// 	return 1
	// }()

	topicConfig := map[string]*string{
		"retention.ms": kadm.StringPtr(retention_ms),
	}

	resp, err := adminClient.CreateTopics(context.Background(),
		partitions, replicas, topicConfig, topics...)
	if err != nil {
		log.Error(err)
		return err
	}
	for _, r := range resp.Sorted() {
		if r.Err != nil {
			log.Errorf("topic: %s error: %s", r.Topic, r.Err)
		}
	}
	return nil
}

func gracefulExit(err error) {
	if err != nil {
		log.Error(err)
	}
	if pgDB != nil {
		postgresErr := pgDB.Close()
		if postgresErr != nil {
			log.Error(postgresErr)
		}
	}
	if redisPubSub != nil {
		redisErr := redisPubSub.Close()
		if redisErr != nil {
			log.Error(redisErr)
		}
	}
	if redisPool != nil {
		redisErr := redisPool.Close()
		if redisErr != nil {
			log.Error(redisErr)
		}
	}
	time.Sleep(time.Second * 5)
	os.Exit(1)
}

func syncPoliciesAndNotificationsSettings() {
	var vulnerabilityNotificationCount int
	row := pgDB.QueryRow(
		"SELECT COUNT(*) FROM vulnerability_notification where duration_in_mins=-1")
	err := row.Scan(&vulnerabilityNotificationCount)
	if err != nil {
		log.Error(err)
	}
	var malwareNotificationCount int
	row = pgDB.QueryRow(
		"SELECT COUNT(*) FROM malware_notification where duration_in_mins=-1")
	err = row.Scan(&malwareNotificationCount)
	if err != nil {
		log.Error(err)
	}
	var secretNotificationCount int
	row = pgDB.QueryRow(
		"SELECT COUNT(*) FROM secret_notification where duration_in_mins=-1")
	err = row.Scan(&secretNotificationCount)
	if err != nil {
		log.Error(err)
	}
	var complianceNotificationCount int
	row = pgDB.QueryRow("SELECT COUNT(*) FROM compliance_report_notification where duration_in_mins=-1")
	err = row.Scan(&complianceNotificationCount)
	if err != nil {
		log.Error(err)
	}
	var cloudTrailNotificationCount int
	row = pgDB.QueryRow("SELECT COUNT(*) FROM cloudtrail_alert_notification where duration_in_mins=-1")
	err = row.Scan(&cloudTrailNotificationCount)
	if err != nil {
		log.Println(err)
	}
	notificationSettings.Lock()
	if vulnerabilityNotificationCount > 0 {
		notificationSettings.vulnerabilityNotificationsSet = true
		log.Info("vulnerability notifications are enabled")
	} else {
		notificationSettings.vulnerabilityNotificationsSet = false
	}
	if complianceNotificationCount > 0 {
		log.Info("compliance notifications are enabled")
		notificationSettings.complianceNotificationsSet = true
	} else {
		notificationSettings.complianceNotificationsSet = false
	}
	if cloudTrailNotificationCount > 0 {
		log.Info("cloudtrail notifications are enabled")
		notificationSettings.cloudTrailNotificationsSet = true
	} else {
		notificationSettings.cloudTrailNotificationsSet = false
	}
	if malwareNotificationCount > 0 {
		log.Info("malware notifications are enabled")
		notificationSettings.malwareNotificationsSet = true
	} else {
		notificationSettings.malwareNotificationsSet = false
	}
	if secretNotificationCount > 0 {
		log.Info("secret notifications are enabled")
		notificationSettings.secretNotificationsSet = true
	} else {
		notificationSettings.secretNotificationsSet = false
	}
	notificationSettings.Unlock()
}

func syncPoliciesAndNotifications() {
	syncPoliciesAndNotificationsSettings()
	ticker := time.NewTicker(60 * time.Second)
	for range ticker.C {
		syncPoliciesAndNotificationsSettings()
	}
}

func printJSON(d interface{}) string {
	// s, _ := json.MarshalIndent(d, "", "  ")
	s, _ := json.Marshal(d)
	return string(s)
}

func checkElasticError(err error) {
	e, ok := err.(*elastic.Error)
	if !ok {
		log.Error(err)
	}
	log.Error(printJSON(e.Details))
}

func GetEnvStringWithDefault(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func GetEnvIntWithDefault(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if v, err := strconv.Atoi(value); err != nil {
			return fallback
		} else {
			return v
		}
	}
	return fallback
}

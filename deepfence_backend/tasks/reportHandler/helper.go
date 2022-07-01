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
	resourceTypeVulnerability = "vulnerability"
	celeryNotificationTask    = "tasks.notification_worker.notification_task"
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
		MaxIdle:   15,
		MaxActive: 30, // max number of connections
		Dial: func() (redis.Conn, error) {
			c, err := redis.Dial("tcp", redisAddr, redis.DialDatabase(redisDbNumber))
			if err != nil {
				return nil, err
			}
			return c, err
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

func createMissingTopics(topics []string) error {
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

	bm, err := adminClient.BrokerMetadata(context.Background())
	if err != nil {
		log.Error(err)
	}

	partitions := int32(1)
	replication := func() int16 {
		if len(bm.Brokers.NodeIDs()) >= 3 {
			return 3
		}
		return 1
	}()

	resp, err := adminClient.CreateTopics(context.Background(),
		partitions, replication, nil, topics...)
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
	notificationSettings.Lock()
	if vulnerabilityNotificationCount > 0 {
		notificationSettings.vulnerabilityNotificationsSet = true
	} else {
		notificationSettings.vulnerabilityNotificationsSet = false
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

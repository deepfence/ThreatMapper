package main

import (
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
	kafka "github.com/segmentio/kafka-go"
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

var numBrokers = 0

func checkKafkaConn() error {
	log.Info("check connection to kafka brokers: " + kafkaBrokers)
	conn, err := kafka.Dial("tcp", strings.Split(kafkaBrokers, ",")[0])
	if err != nil {
		return err
	}
	defer conn.Close()
	brokers, err := conn.Brokers()
	if err != nil {
		return err
	}
	for _, b := range brokers {
		log.Infof("broker found at %s", b.Host)
		numBrokers = numBrokers + 1
	}
	return nil
}

func createMissingTopics(topics []string) error {
	conn, err := kafka.Dial("tcp", strings.Split(kafkaBrokers, ",")[0])
	if err != nil {
		return err
	}
	defer conn.Close()

	// list available topics
	partitions, err := conn.ReadPartitions()
	if err != nil {
		return err
	}
	available := map[string]struct{}{}
	for _, p := range partitions {
		available[p.Topic] = struct{}{}
	}

	// get connection to current controller
	controller, err := conn.Controller()
	if err != nil {
		return err
	}

	var ctrlConn *kafka.Conn
	ctrlConn, err = kafka.Dial("tcp",
		net.JoinHostPort(controller.Host, strconv.Itoa(controller.Port)))
	if err != nil {
		return err
	}
	defer ctrlConn.Close()

	replication := func() int {
		if numBrokers >= 3 {
			return 3
		}
		return 1
	}()

	topicConfigs := []kafka.TopicConfig{}
	for _, t := range topics {
		// check if topic exists
		_, found := available[t]
		if !found {
			topicConfigs = append(topicConfigs,
				kafka.TopicConfig{
					Topic:             t,
					NumPartitions:     1,
					ReplicationFactor: replication,
				},
			)
		}
	}

	// create missing topics
	if len(topicConfigs) > 0 {
		err = ctrlConn.CreateTopics(topicConfigs...)
		if err != nil {
			return err
		}
	}

	return nil
}

func gracefulExit(err error) {
	if err != nil {
		log.Error(err)
	}
	if postgresDb != nil {
		postgresErr := postgresDb.Close()
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
	row := postgresDb.QueryRow("SELECT COUNT(*) FROM vulnerability_notification where duration_in_mins=-1")
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

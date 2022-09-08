package main

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gomodule/redigo/redis"
)

const (
	resourceTypeVulnerability    = "vulnerability"
	resourceTypeCompliance       = "compliance"
	vulnerabilityRedisPubsubName = "vulnerability_task_queue"
	complianceRedisPubsubName    = "compliance_task_queue"
	celeryNotificationTask       = "tasks.notification_worker.notification_task"
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

func gracefulExit(err error) {
	if err != nil {
		log.Println(err)
	}
	if postgresDb != nil {
		postgresErr := postgresDb.Close()
		if postgresErr != nil {
			log.Println(postgresErr)
		}
	}
	if redisPubSub != nil {
		redisErr := redisPubSub.Close()
		if redisErr != nil {
			log.Println(redisErr)
		}
	}
	if redisPool != nil {
		redisErr := redisPool.Close()
		if redisErr != nil {
			log.Println(redisErr)
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
		log.Println(err)
	}
	var complianceNotificationCount int
	row = postgresDb.QueryRow("SELECT COUNT(*) FROM compliance_report_notification where duration_in_mins=-1")
	err = row.Scan(&complianceNotificationCount)
	if err != nil {
		log.Println(err)
	}
	notificationSettings.Lock()
	if vulnerabilityNotificationCount > 0 {
		notificationSettings.vulnerabilityNotificationsSet = true
	} else {
		notificationSettings.vulnerabilityNotificationsSet = false
	}
	if complianceNotificationCount > 0 {
		notificationSettings.complianceNotificationsSet = true
	} else {
		notificationSettings.complianceNotificationsSet = false
	}
	notificationSettings.Unlock()
}

func syncPoliciesAndNotifications() {
	syncPoliciesAndNotificationsSettings()
	ticker := time.NewTicker(60 * time.Second)
	for {
		select {
		case <-ticker.C:
			syncPoliciesAndNotificationsSettings()
		}
	}
}

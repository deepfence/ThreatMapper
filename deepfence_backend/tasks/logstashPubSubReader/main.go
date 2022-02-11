package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gocelery/gocelery"
	"github.com/gomodule/redigo/redis"
	_ "github.com/lib/pq"
	"log"
	"os"
	"strconv"
	"sync"
	"time"
)

type NotificationSettings struct {
	vulnerabilityNotificationsSet bool
	sync.RWMutex
}

var (
	redisPubSub             *redis.PubSubConn
	redisPool               *redis.Pool
	postgresDb              *sql.DB
	redisAddr               string
	vulnerabilityTaskQueue  chan []byte
	celeryCli               *gocelery.CeleryClient
	resourcePubsubToChanMap map[string]chan []byte
	notificationSettings    NotificationSettings
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
		if tableExists == false {
			gracefulExit(errors.New("table " + tableName + " does not exist"))
		}
	}
	vulnerabilityTaskQueue = make(chan []byte, 10000)
	resourcePubsubToChanMap = map[string]chan []byte{
		vulnerabilityRedisPubsubName: vulnerabilityTaskQueue,
	}
	notificationSettings = NotificationSettings{
		vulnerabilityNotificationsSet: false,
	}
}

func initRedisPubsub() {
	redisPubSub = &redis.PubSubConn{Conn: redisPool.Get()}
	err := redisPubSub.Subscribe(vulnerabilityRedisPubsubName)
	if err != nil {
		gracefulExit(err)
	}
}

func receiveMessagesFromRedisPubsub() {
	for {
		switch v := redisPubSub.Receive().(type) {
		case redis.Message:
			resourcePubsubToChanMap[v.Channel] <- v.Data
		case redis.Subscription:
			//log.Printf("subscription message: %s: %s %d\n", v.Channel, v.Kind, v.Count)
		case error:
			log.Println("Error on redisPubSub.Receive(): ", v.Error())
			time.Sleep(5 * time.Second)
			// re initialize redis pubsub
			initRedisPubsub()
		}
	}
}

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
			if breakFor == true {
				break
			}
		}
		if len(messages) > 0 {
			go func() {
				if resourceType == resourceTypeVulnerability {
					notificationSettings.RLock()
					vulnerabilityNotificationsSet := notificationSettings.vulnerabilityNotificationsSet
					notificationSettings.RUnlock()
					if vulnerabilityNotificationsSet == true {
						createNotificationCeleryTask(resourceType, messages)
					}
				}
			}()
		}
	}
}

func main() {
	log.SetFlags(0)
	initRedisPubsub()
	var err error
	celeryCli, err = gocelery.NewCeleryClient(gocelery.NewRedisBroker(redisPool), &gocelery.RedisCeleryBackend{Pool: redisPool}, 1)
	if err != nil {
		gracefulExit(err)
	}
	go syncPoliciesAndNotifications()
	go batchMessages(resourceTypeVulnerability, &vulnerabilityTaskQueue, 100)
	receiveMessagesFromRedisPubsub()
}

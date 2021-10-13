package app

import (
	"bytes"
	"context"
	"fmt"
	"github.com/gomodule/redigo/redis"
	log "github.com/sirupsen/logrus"
	"github.com/ugorji/go/codec"
	"github.com/weaveworks/scope/render"
	"github.com/weaveworks/scope/render/detailed"
	"github.com/weaveworks/scope/report"
	"os"
	"strconv"
	"time"
)

var (
	redisExpiryTime = 180 // 3 minutes
)

func cacheInRedis(redisPool *redis.Pool, topologyID string, reporter Reporter, rpt *report.Report) {
	ctx := context.Background()
	values := make(map[string][]string)
	renderer, filter, err := topologyRegistry.RendererForTopology(topologyID, values, *rpt)
	if err != nil {
		return
	}
	rc := RenderContextForReporter(reporter, *rpt)
	nodeSummaries := detailed.Summaries(ctx, rc, render.Render(ctx, rc.Report, renderer, filter).Nodes, true)
	redisConn := redisPool.Get()
	defer redisConn.Close()

	buf := &bytes.Buffer{}
	err = codec.NewEncoder(buf, &codec.JsonHandle{}).Encode(APITopology{Nodes: nodeSummaries})

	redisKey := "topology_" + topologyID
	_, err = redisConn.Do("SETEX", redisKey, redisExpiryTime, string(buf.Bytes()))
	if err != nil {
		log.Printf("Error: SETEX %s: %v\n", redisKey, err)
	}
}

func cache(redisPool *redis.Pool, reporter Reporter) error {
	ctx := context.Background()
	rep, err := reporter.Report(ctx, time.Now())
	if err != nil {
		return err
	}
	go cacheInRedis(redisPool, hostsID, reporter, &rep)
	go cacheInRedis(redisPool, containersID, reporter, &rep)
	go cacheInRedis(redisPool, containersByImageID, reporter, &rep)
	go cacheInRedis(redisPool, processesID, reporter, &rep)
	go cacheInRedis(redisPool, podsID, reporter, &rep)
	go cacheInRedis(redisPool, kubeControllersID, reporter, &rep)
	go cacheInRedis(redisPool, servicesID, reporter, &rep)
	return nil
}

func CacheTopology(reporter Reporter) {
	redisPool, _ := newRedisPool()

	ctx := context.Background()
	wait := make(chan struct{}, 1)
	reporter.WaitOn(ctx, wait)
	defer reporter.UnWait(ctx, wait)
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			err := cache(redisPool, reporter)
			if err != nil {
				log.Error(err)
			}
		}
	}
}

func newRedisPool() (*redis.Pool, int) {
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
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "deepfence-redis"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	redisAddr := fmt.Sprintf("%s:%s", redisHost, redisPort)
	return &redis.Pool{
		MaxIdle:   10,
		MaxActive: 30, // max number of connections
		Dial: func() (redis.Conn, error) {
			c, err := redis.Dial("tcp", redisAddr, redis.DialDatabase(dbNumInt))
			if err != nil {
				return nil, err
			}
			return c, err
		},
	}, dbNumInt
}

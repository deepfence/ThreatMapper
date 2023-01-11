package directory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
)

const (
	max_size = 500 * 1024 * 1024 // 500 MB
)

type TaskID string

const (
	CleanUpGraphDBTaskID   TaskID = "CleanUpGraphDB"
	ScanRetryGraphDBTaskID TaskID = "ScanRetryGraphDB"
)

type GraphDBContext struct {
	Namespace NamespaceID `json:"namespace"`
}

func PayloadToContext(b []byte) (context.Context, error) {
	var p GraphDBContext
	if err := json.Unmarshal(b, &p); err != nil {
		return nil, fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}
	return NewContextWithNameSpace(p.Namespace), nil
}

func newUniquePeriodicGraphDBTask(id TaskID, ns NamespaceID) (*asynq.Task, error) {
	payload, err := json.Marshal(GraphDBContext{Namespace: ns})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(string(id), payload, asynq.Unique(time.Minute*30)), nil
}

var ErrExhaustedResources = errors.New("Exhausted worker resources")

type async_clients struct {
	client    *asynq.Client
	inspector *asynq.Inspector
	scheduler *asynq.Scheduler
}

var worker_clients_pool map[NamespaceID]*async_clients

func init() {
	worker_clients_pool = map[NamespaceID]*async_clients{}
}

func new_asynq_client(endpoints DBConfigs) (*async_clients, error) {
	redisCfg := asynq.RedisClientOpt{Addr: endpoints.Redis.Endpoint}
	clients := &async_clients{
		client:    asynq.NewClient(redisCfg),
		inspector: asynq.NewInspector(redisCfg),
		scheduler: asynq.NewScheduler(redisCfg, nil),
	}
	go func() {
		if err := clients.scheduler.Run(); err != nil {
			panic(err)
		}
	}()
	return clients, nil
}

func WorkerEnqueue(ctx context.Context, task *asynq.Task) error {

	clients, err := getClient(ctx, worker_clients_pool, new_asynq_client)
	if err != nil {
		return err
	}

	client := clients.client
	inspector := clients.inspector

	qs, err := inspector.Queues()
	if err != nil {
		return err
	}
	size := 0
	for _, q := range qs {
		res, err := inspector.GetQueueInfo(q)
		if err != nil {
			continue
		}
		size += res.Size
	}

	if size >= max_size {
		return ErrExhaustedResources
	}

	client.Enqueue(task)
	return nil
}

func PeriodicWorkerEnqueue(ctx context.Context, taskid TaskID, cronEntry string) error {

	ns, err := ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	clients, err := getClient(ctx, worker_clients_pool, new_asynq_client)
	if err != nil {
		return err
	}

	scheduler := clients.scheduler

	task, err := newUniquePeriodicGraphDBTask(taskid, ns)
	if err != nil {
		return err
	}

	scheduler.Register(cronEntry, task)

	return nil
}

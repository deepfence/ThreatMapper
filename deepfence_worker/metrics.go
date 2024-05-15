package main

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/deepfence/ThreatMapper/deepfence_worker/processors"
	"github.com/hibiken/asynq"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

func NewMetrics(mode string) *prometheus.Registry {
	registry := prometheus.NewRegistry()
	// Add go runtime metrics and process collectors.
	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)

	//  register prometheus metrics collectors
	switch mode {
	case "ingester":
		registry.MustRegister(processors.CommitNeo4jRecordsCounts, processors.KafkaTopicsLag)
	case "worker":
		registry.MustRegister(newWorkerCollector(), cronjobs.NotificationRecordsCounts)
	}

	return registry
}

type WorkerCollector struct {
	tasks *prometheus.Desc
}

func newWorkerCollector() *WorkerCollector {
	return &WorkerCollector{
		tasks: prometheus.NewDesc(
			"asynq_tasks",
			"asynq tasks by status and queue",
			[]string{"namespace", "queue", "task", "status"}, nil,
		),
	}
}

func (collector *WorkerCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- collector.tasks
}

type tasks struct {
	Tasks map[string]*status
}

type status struct {
	queue     string
	active    int
	pending   int
	retry     int
	archived  int
	completed int
}

func newTaskState() *tasks {
	return &tasks{
		Tasks: make(map[string]*status),
	}
}

func (ts *tasks) Inc(name string, queue string, state asynq.TaskState) {
	s, found := ts.Tasks[name]
	if !found {
		s = &status{active: 0, pending: 0, retry: 0, queue: queue}
		ts.Tasks[name] = s
	}
	switch state {
	case asynq.TaskStateActive:
		s.active += 1
	case asynq.TaskStatePending:
		s.pending += 1
	case asynq.TaskStateRetry:
		s.retry += 1
	case asynq.TaskStateArchived:
		s.archived += 1
	case asynq.TaskStateCompleted:
		s.completed += 1
	}
}

func (collector *WorkerCollector) Collect(ch chan<- prometheus.Metric) {

	for _, namespace := range directory.GetAllNamespaces() {

		ctx := directory.NewContextWithNameSpace(namespace)
		ns := string(namespace)

		log := log.WithCtx(ctx)

		log.Info().Msg("collect asynq tasks counts")

		worker, err := directory.Worker(ctx)
		if err != nil {
			log.Error().Err(err).Msg("failed to get worker instance")
			return
		}

		// get all the queues
		queues, err := worker.Inspector().Queues()
		if err != nil {
			log.Error().Err(err).Msg("failed to get worker queues")
			return
		}

		// track task status
		status := newTaskState()

		// page size for list tasks

		pageSize := asynq.PageSize(5000)

		for _, q := range queues {

			var tasks []*asynq.TaskInfo
			var err error

			// active tasks
			tasks, err = worker.Inspector().ListActiveTasks(q, pageSize)
			if err != nil {
				log.Error().Err(err).Msgf("failed to get active tasks from queue %s", q)
			} else {
				for _, task := range tasks {
					status.Inc(task.Type, task.Queue, task.State)
				}
			}

			// pending tasks
			tasks, err = worker.Inspector().ListPendingTasks(q, pageSize)
			if err != nil {
				log.Error().Err(err).Msgf("failed to get pending tasks from queue %s", q)
			} else {
				for _, task := range tasks {
					status.Inc(task.Type, task.Queue, task.State)
				}
			}

			// retry tasks
			tasks, err = worker.Inspector().ListRetryTasks(q, pageSize)
			if err != nil {
				log.Error().Err(err).Msgf("failed to get retry tasks from queue %s", q)
			} else {
				for _, task := range tasks {
					status.Inc(task.Type, task.Queue, task.State)
				}
			}

			// archived tasks
			tasks, err = worker.Inspector().ListArchivedTasks(q, pageSize)
			if err != nil {
				log.Error().Err(err).Msgf("failed to get archived tasks from queue %s", q)
			} else {
				for _, task := range tasks {
					status.Inc(task.Type, task.Queue, task.State)
				}
			}

			// completed tasks
			tasks, err = worker.Inspector().ListCompletedTasks(q, pageSize)
			if err != nil {
				log.Error().Err(err).Msgf("failed to get completed tasks from queue %s", q)
			} else {
				for _, task := range tasks {
					status.Inc(task.Type, task.Queue, task.State)
				}
			}

		}

		for name, t := range status.Tasks {
			ch <- prometheus.MustNewConstMetric(collector.tasks, prometheus.GaugeValue,
				float64(t.active), ns, t.queue, name, "active")
			ch <- prometheus.MustNewConstMetric(collector.tasks, prometheus.GaugeValue,
				float64(t.pending), ns, t.queue, name, "pending")
			ch <- prometheus.MustNewConstMetric(collector.tasks, prometheus.GaugeValue,
				float64(t.retry), ns, t.queue, name, "retry")
			ch <- prometheus.MustNewConstMetric(collector.tasks, prometheus.GaugeValue,
				float64(t.archived), ns, t.queue, name, "archived")
			ch <- prometheus.MustNewConstMetric(collector.tasks, prometheus.GaugeValue,
				float64(t.completed), ns, t.queue, name, "completed")
		}

	}

}

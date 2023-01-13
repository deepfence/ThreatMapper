package cronscheduler

import (
	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/robfig/cron/v3"
	"time"
)

type Scheduler struct {
	cron           *cron.Cron
	tasksPublisher *kafka.Publisher
}

func NewScheduler(tasksPublisher *kafka.Publisher) (*Scheduler, error) {
	scheduler := &Scheduler{
		cron:           cron.New(cron.WithSeconds(), cron.WithLocation(time.UTC), cron.WithLogger(cron.DefaultLogger)),
		tasksPublisher: tasksPublisher,
	}
	err := scheduler.addJobs()
	if err != nil {
		return nil, err
	}
	return scheduler, nil
}

func (s *Scheduler) addJobs() error {
	var err error
	_, err = s.cron.AddFunc("@every 120s", s.CleanUpGraphDBTask)
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.RetryFailedScansTask)
	if err != nil {
		return err
	}
	return nil
}

func (s *Scheduler) Run() {
	s.cron.Run()
}

func (s *Scheduler) CleanUpGraphDBTask() {
	err := s.publishNewCronJob(utils.CleanUpGraphDBTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) RetryFailedScansTask() {
	err := s.publishNewCronJob(utils.RetryFailedScansTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) publishNewCronJob(topic string, data []byte) error {
	msg := message.NewMessage(watermill.NewUUID(), data)
	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)
	msg.SetContext(ctx)
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err := s.tasksPublisher.Publish(topic, msg)
	if err != nil {
		return err
	}
	return nil
}

package utils

import (
	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
)

func PublishNewJob(pub *kafka.Publisher, metadata map[string]string, topic string, data []byte) error {
	msg := message.NewMessage(watermill.NewUUID(), data)
	msg.Metadata = metadata
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err := pub.Publish(topic, msg)
	if err != nil {
		return err
	}
	return nil
}

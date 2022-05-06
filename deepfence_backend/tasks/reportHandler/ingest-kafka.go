package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	kafka "github.com/segmentio/kafka-go"
)

func startConsumers(brokers string, topics []string, group string, topicChannels map[string](chan []byte)) {

	fmt.Printf("brokers: %s\n", kafkaBrokers)
	fmt.Printf("topics: %s\n", topics)
	fmt.Printf("groupID: %s\n", group)

	for _, t := range topics {
		go func(topic string, out chan []byte) {
			// https://pkg.go.dev/github.com/segmentio/kafka-go#ReaderConfig
			reader := kafka.NewReader(
				kafka.ReaderConfig{
					Brokers:  strings.Split(kafkaBrokers, ","),
					GroupID:  group,
					Topic:    topic,
					MinBytes: 10e3, // 10KB
					MaxBytes: 10e6, // 10MB
					MaxWait:  5 * time.Second,
				},
			)

			defer reader.Close()

			fmt.Println("start consuming from " + topic)
			for {
				m, err := reader.ReadMessage(context.Background())
				if err != nil {
					fmt.Println(err)
				}
				// fmt.Printf("topic:%v partition:%v offset:%v	message:%s\n", m.Topic, m.Partition, m.Offset, string(m.Value))
				out <- m.Value
			}
		}(t, topicChannels[t])
	}
}

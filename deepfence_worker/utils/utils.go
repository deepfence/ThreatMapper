package utils

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
)

var ReportRetentionTime = 24 * time.Hour

// used to replace http:// or https:// from registry url
var httpReplacer = strings.NewReplacer(
	"http://", "",
	"https://", "",
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

func RunCommand(cmd *exec.Cmd) (*bytes.Buffer, error) {
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	errorOnRun := cmd.Run()
	if errorOnRun != nil {
		return nil, errors.New(fmt.Sprint(errorOnRun) + ": " + stderr.String())
	}
	return &out, nil
}

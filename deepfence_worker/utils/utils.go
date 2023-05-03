package utils

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	sdkUtils "github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

var ReportRetentionTime = 24 * time.Hour

func TimeRangeFilter(key string, start, end time.Time) []reporters.CompareFilter {
	return []reporters.CompareFilter{
		{
			FieldName:   key,
			FieldValue:  strconv.FormatInt(start.UnixMilli(), 10),
			GreaterThan: true,
		},
		{
			FieldName:   key,
			FieldValue:  strconv.FormatInt(end.UnixMilli(), 10),
			GreaterThan: false,
		},
	}
}

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

func GetScheduledJobHash(schedule postgresqlDb.Scheduler) string {
	var payload map[string]string
	json.Unmarshal(schedule.Payload, &payload)
	message := map[string]interface{}{"action": schedule.Action, "payload": payload, "cron": schedule.CronExpr}
	scheduleStr, _ := json.Marshal(message)
	return sdkUtils.GenerateHashFromString(string(scheduleStr))
}

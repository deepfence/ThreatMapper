package cronjobs

import (
	"reflect"
	"sync"
	"unsafe"

	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var recordLock sync.Mutex
var TopicData map[string]kafka.PartitionOffset

func GetTopicData() map[string]kafka.PartitionOffset {
	recordLock.Lock()
	defer recordLock.Unlock()
	retVal := make(map[string]kafka.PartitionOffset)
	for k, v := range TopicData {
		retVal[k] = v
	}
	return retVal
}

func RecordOffsets(msg *message.Message) {
	if msg == nil {
		return
	}

	topic := message.SubscribeTopicFromCtx(msg.Context())
	if len(topic) == 0 {
		log.Debug().Msgf("Failed to get the topic from message Context")
		return
	}

	partionId, ok1 := kafka.MessagePartitionFromCtx(msg.Context())
	partitionOffset, ok2 := kafka.MessagePartitionOffsetFromCtx(msg.Context())
	if !ok1 || !ok2 {
		return
	}

	ts, _ := kafka.MessageTimestampFromCtx(msg.Context())

	recordLock.Lock()
	defer recordLock.Unlock()

	_, found := TopicData[topic]

	if !found {
		TopicData[topic] = make(map[int32]int64)
	}

	TopicData[topic][partionId] = partitionOffset

	log.Debug().Msgf("RecordOffsets for %s , pid:%d, offset:%d, ts:%v",
		topic, partionId, partitionOffset, ts)
}

// Utility function to print the contents of the context
// Used ONLY for DEBUGGING
func printContextInternals(ctx interface{}, inner bool) {
	contextValues := reflect.ValueOf(ctx).Elem()
	contextKeys := reflect.TypeOf(ctx).Elem()

	if !inner {
		log.Info().Msgf("Fields for %s.%s", contextKeys.PkgPath(), contextKeys.Name())
	}

	if contextKeys.Kind() == reflect.Struct {
		for i := 0; i < contextValues.NumField(); i++ {
			reflectValue := contextValues.Field(i)
			reflectValue = reflect.NewAt(reflectValue.Type(), unsafe.Pointer(reflectValue.UnsafeAddr())).Elem()

			reflectField := contextKeys.Field(i)

			if reflectField.Name == "Context" {
				printContextInternals(reflectValue.Interface(), true)
			} else {
				log.Info().Msgf("field name: %+v", reflectField.Name)
				log.Info().Msgf("field value: %+v", reflectValue.Interface())
			}
		}
	} else {
		log.Info().Msgf("context is empty (int)")
	}
}

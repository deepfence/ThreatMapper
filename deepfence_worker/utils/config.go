package utils

type Config struct {
	Debug                 bool     `default:"false"`
	Mode                  string   `default:"worker" required:"true"`
	MetricsPort           string   `default:"8181" split_words:"true"`
	KafkaBrokers          []string `default:"deepfence-kafka-broker:9092" required:"true" split_words:"true"`
	KafkaTopicPartitions  int32    `default:"1" split_words:"true"`
	KafkaTopicReplicas    int16    `default:"1" split_words:"true"`
	KafkaTopicRetentionMs string   `default:"86400000" split_words:"true"`
	RedisHost             string   `default:"deepfence-redis" required:"true" split_words:"true"`
	RedisDbNumber         int      `default:"0" split_words:"true"`
	RedisPort             string   `default:"6379" split_words:"true"`
	RedisPassword         string   `default:"" split_words:"true"`
	TasksConcurrency      int      `default:"50" split_words:"true"`
	ProcessQueues         []string `split_words:"true"`
	MaxScanWorkload       int      `default:"5" split_words:"true"`
}

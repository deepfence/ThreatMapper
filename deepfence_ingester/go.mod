module github.com/deepfence/ThreatMapper/deepfence_ingester

go 1.18

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../deepfence_utils/

require (
	github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000
	github.com/lib/pq v1.10.7
	github.com/neo4j/neo4j-go-driver/v4 v4.4.4
	github.com/sirupsen/logrus v1.9.0
)

require (
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/go-redis/redis/v8 v8.11.5 // indirect
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/hibiken/asynq v0.23.0 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.16 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.4 // indirect
	github.com/prometheus/client_model v0.3.0 // indirect
	github.com/prometheus/common v0.37.0 // indirect
	github.com/prometheus/procfs v0.8.0 // indirect
	github.com/robfig/cron/v3 v3.0.1 // indirect
	github.com/rs/zerolog v1.28.0 // indirect
	github.com/spf13/cast v1.5.0 // indirect
	github.com/stretchr/testify v1.8.1 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.2.0 // indirect
	golang.org/x/crypto v0.4.0 // indirect
	golang.org/x/time v0.3.0 // indirect
	google.golang.org/protobuf v1.28.1 // indirect
)

require (
	github.com/klauspost/compress v1.15.12 // indirect
	github.com/pierrec/lz4/v4 v4.1.17 // indirect
	github.com/prometheus/client_golang v1.14.0
	github.com/twmb/franz-go v1.10.3
	github.com/twmb/franz-go/pkg/kadm v1.6.0
	golang.org/x/sys v0.3.0 // indirect
)

module github.com/deepfence/ThreatMapper/deepfence_shipper

go 1.25.5

replace github.com/deepfence/golang_deepfence_sdk/client => ../../../golang_deepfence_sdk/client/

replace github.com/deepfence/golang_deepfence_sdk/utils => ../../../golang_deepfence_sdk/utils

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../../../deepfence_utils/

require (
	github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000
	github.com/deepfence/golang_deepfence_sdk/client v0.0.0-00010101000000-000000000000
	github.com/deepfence/golang_deepfence_sdk/utils v0.0.0-00010101000000-000000000000
	github.com/hashicorp/go-retryablehttp v0.7.8
	github.com/kelseyhightower/envconfig v1.4.0
	github.com/nxadm/tail v1.4.11
	gopkg.in/yaml.v3 v3.0.1
)

require (
	github.com/cenkalti/backoff/v4 v4.3.0 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.4.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/fsnotify/fsnotify v1.6.0 // indirect
	github.com/goccy/go-json v0.10.3 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/hibiken/asynq v0.25.1 // indirect
	github.com/klauspost/compress v1.18.2 // indirect
	github.com/lestrrat-go/blackmagic v1.0.3 // indirect
	github.com/lestrrat-go/httpcc v1.0.1 // indirect
	github.com/lestrrat-go/httprc v1.0.6 // indirect
	github.com/lestrrat-go/iter v1.0.2 // indirect
	github.com/lestrrat-go/jwx/v2 v2.1.6 // indirect
	github.com/lestrrat-go/option v1.0.1 // indirect
	github.com/lib/pq v1.10.9 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/pierrec/lz4/v4 v4.1.22 // indirect
	github.com/redis/go-redis/v9 v9.17.2 // indirect
	github.com/robfig/cron/v3 v3.0.1 // indirect
	github.com/rs/zerolog v1.34.0 // indirect
	github.com/segmentio/asm v1.2.0 // indirect
	github.com/spf13/cast v1.7.0 // indirect
	github.com/twmb/franz-go v1.20.6 // indirect
	github.com/twmb/franz-go/pkg/kadm v1.17.1 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.12.0 // indirect
	golang.org/x/crypto v0.45.0 // indirect
	golang.org/x/sys v0.39.0 // indirect
	golang.org/x/time v0.8.0 // indirect
	google.golang.org/protobuf v1.35.2 // indirect
	gopkg.in/tomb.v1 v1.0.0-20141024135613-dd632973f1e7 // indirect
)

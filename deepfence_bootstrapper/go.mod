module github.com/deepfence/ThreatMapper/deepfence_bootstrapper

go 1.21

replace github.com/deepfence/golang_deepfence_sdk/utils => ../golang_deepfence_sdk/utils/

replace github.com/deepfence/golang_deepfence_sdk/client => ../golang_deepfence_sdk/client/

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../deepfence_utils/

replace github.com/deepfence/df-utils => ../deepfence_agent/tools/apache/deepfence/df-utils

replace github.com/deepfence/agent-plugins-grpc => ../deepfence_agent/plugins/agent-plugins-grpc

replace github.com/deepfence/compliance => ../deepfence_agent/plugins/compliance

require (
	github.com/containerd/cgroups/v3 v3.0.3
	github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000
	github.com/deepfence/agent-plugins-grpc v1.1.0
	github.com/deepfence/compliance v0.0.0-00010101000000-000000000000
	github.com/deepfence/df-utils v0.0.0-00010101000000-000000000000
	github.com/deepfence/golang_deepfence_sdk/client v0.0.0-00010101000000-000000000000
	github.com/deepfence/golang_deepfence_sdk/utils v0.0.0-00010101000000-000000000000
	github.com/deepfence/kubernetes-scanner/v2 v2.1.0
	github.com/minio/selfupdate v0.6.0
	github.com/opencontainers/runtime-spec v1.1.0
	github.com/rs/zerolog v1.31.0
	github.com/weaveworks/scope v1.13.2
	google.golang.org/grpc v1.56.1
	gopkg.in/ini.v1 v1.67.0
)

require (
	aead.dev/minisign v0.2.0 // indirect
	github.com/Azure/go-ansiterm v0.0.0-20170929234023-d6e3b3328b78 // indirect
	github.com/c9s/goprocinfo v0.0.0-20151025191153-19cb9f127a9c // indirect
	github.com/cenkalti/backoff/v4 v4.2.1 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/cilium/ebpf v0.11.0 // indirect
	github.com/coreos/go-systemd/v22 v22.5.0 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.2.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/docker/docker v1.4.2-0.20180827131323-0c5f8d2b9b23 // indirect
	github.com/docker/go-units v0.4.0 // indirect
	github.com/goccy/go-json v0.10.2 // indirect
	github.com/godbus/dbus/v5 v5.0.4 // indirect
	github.com/golang/protobuf v1.5.3 // indirect
	github.com/google/uuid v1.5.0 // indirect
	github.com/gorilla/websocket v0.0.0-20160221213430-5c91b59efa23 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/hashicorp/go-retryablehttp v0.7.5 // indirect
	github.com/hibiken/asynq v0.24.1 // indirect
	github.com/k-sone/critbitgo v1.2.0 // indirect
	github.com/klauspost/compress v1.17.4 // indirect
	github.com/kr/pty v1.1.1 // indirect
	github.com/lestrrat-go/blackmagic v1.0.2 // indirect
	github.com/lestrrat-go/httpcc v1.0.1 // indirect
	github.com/lestrrat-go/httprc v1.0.4 // indirect
	github.com/lestrrat-go/iter v1.0.2 // indirect
	github.com/lestrrat-go/jwx/v2 v2.0.18 // indirect
	github.com/lestrrat-go/option v1.0.1 // indirect
	github.com/lib/pq v1.10.9 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.19 // indirect
	github.com/opentracing/opentracing-go v1.1.0 // indirect
	github.com/pierrec/lz4/v4 v4.1.19 // indirect
	github.com/redis/go-redis/v9 v9.4.0 // indirect
	github.com/robfig/cron/v3 v3.0.1 // indirect
	github.com/segmentio/asm v1.2.0 // indirect
	github.com/sirupsen/logrus v1.9.3 // indirect
	github.com/spf13/cast v1.3.1 // indirect
	github.com/twmb/franz-go v1.15.4 // indirect
	github.com/twmb/franz-go/pkg/kadm v1.10.0 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.7.0 // indirect
	github.com/ugorji/go v0.0.0-20170918222552-54210f4e076c // indirect
	github.com/weaveworks/common v0.0.0-20200310113808-2708ba4e60a4 // indirect
	github.com/weaveworks/ps v0.0.0-20160725183535-70d17b2d6f76 // indirect
	github.com/willdonnelly/passwd v0.0.0-20141013001024-7935dab3074c // indirect
	golang.org/x/crypto v0.17.0 // indirect
	golang.org/x/exp v0.0.0-20230224173230-c95f2b4c22f2 // indirect
	golang.org/x/net v0.19.0 // indirect
	golang.org/x/sys v0.15.0 // indirect
	golang.org/x/text v0.14.0 // indirect
	golang.org/x/time v0.0.0-20190308202827-9d24e82272b4 // indirect
	google.golang.org/genproto v0.0.0-20230410155749-daa745c078e1 // indirect
	google.golang.org/protobuf v1.31.0 // indirect
)

module github.com/deepfence/ThreatMapper/deepfence_worker

go 1.19

replace github.com/deepfence/golang_deepfence_sdk/client => ../golang_deepfence_sdk/client/

replace github.com/deepfence/golang_deepfence_sdk/utils => ../golang_deepfence_sdk/utils/

replace github.com/deepfence/df-utils => ../deepfence_agent/tools/apache/deepfence/df-utils

replace github.com/deepfence/package-scanner => ../deepfence_agent/plugins/package-scanner

replace github.com/deepfence/SecretScanner => ../deepfence_agent/plugins/SecretScanner

replace github.com/deepfence/YaraHunter => ../deepfence_agent/plugins/YaraHunter

replace github.com/deepfence/ThreatMapper/deepfence_server => ../deepfence_server/

replace github.com/deepfence/agent-plugins-grpc => ../deepfence_agent/plugins/agent-plugins-grpc

require (
	github.com/Masterminds/sprig/v3 v3.2.3
	github.com/SebastiaanKlippert/go-wkhtmltopdf v1.9.0
	github.com/ThreeDotsLabs/watermill v1.2.0
	github.com/ThreeDotsLabs/watermill-kafka/v2 v2.2.2
	github.com/anchore/syft v0.75.0
	github.com/aws/aws-sdk-go v1.44.232
	github.com/deepfence/SecretScanner v0.0.0-00010101000000-000000000000
	github.com/deepfence/ThreatMapper/deepfence_server v0.0.0-00010101000000-000000000000
	github.com/deepfence/YaraHunter v0.0.0-00010101000000-000000000000
	github.com/deepfence/agent-plugins-grpc v1.0.1
	github.com/deepfence/golang_deepfence_sdk/utils v0.0.0-20230330091304-8f99282832d7
	github.com/deepfence/package-scanner v0.0.0-00010101000000-000000000000
	github.com/hillu/go-yara/v4 v4.2.4
	github.com/kelseyhightower/envconfig v1.4.0
	github.com/minio/minio-go/v7 v7.0.49
	github.com/neo4j/neo4j-go-driver/v4 v4.4.7
	github.com/prometheus/client_golang v1.14.0
	github.com/robfig/cron/v3 v3.0.1
	github.com/rs/zerolog v1.29.0
	github.com/twmb/franz-go v1.13.1
	github.com/twmb/franz-go/pkg/kadm v1.8.0
	go.opentelemetry.io/otel v1.14.0
	go.opentelemetry.io/otel/exporters/jaeger v1.14.0
	go.opentelemetry.io/otel/sdk v1.14.0
)

require (
	github.com/CycloneDX/cyclonedx-go v0.7.1-0.20221222100750-41a1ac565cce // indirect
	github.com/Masterminds/goutils v1.1.1 // indirect
	github.com/Masterminds/semver/v3 v3.2.0 // indirect
	github.com/Microsoft/go-winio v0.6.0 // indirect
	github.com/Microsoft/hcsshim v0.9.6 // indirect
	github.com/Shopify/sarama v1.32.0 // indirect
	github.com/XSAM/otelsql v0.20.0 // indirect
	github.com/acobaugh/osrelease v0.1.0 // indirect
	github.com/anchore/go-logger v0.0.0-20220728155337-03b66a5207d8 // indirect
	github.com/anchore/go-struct-converter v0.0.0-20221118182256-c68fdcfa2092 // indirect
	github.com/anchore/packageurl-go v0.1.1-0.20230104203445-02e0a6721501 // indirect
	github.com/anchore/stereoscope v0.0.0-20230301191755-abfb374a1122 // indirect
	github.com/andybalholm/brotli v1.0.4 // indirect
	github.com/becheran/wildmatch-go v1.0.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/bmatcuk/doublestar/v4 v4.6.0 // indirect
	github.com/cenkalti/backoff/v3 v3.2.2 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/containerd/cgroups v1.0.4 // indirect
	github.com/containerd/containerd v1.6.18 // indirect
	github.com/containerd/continuity v0.3.0 // indirect
	github.com/containerd/fifo v1.0.0 // indirect
	github.com/containerd/stargz-snapshotter/estargz v0.12.1 // indirect
	github.com/containerd/ttrpc v1.1.0 // indirect
	github.com/containerd/typeurl v1.0.2 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.1.0 // indirect
	github.com/deepfence/golang_deepfence_sdk/client v0.0.0-20230330091304-8f99282832d7 // indirect
	github.com/deepfence/vessel v0.9.2 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/docker/cli v20.10.20+incompatible // indirect
	github.com/docker/distribution v2.8.1+incompatible // indirect
	github.com/docker/docker v23.0.1+incompatible // indirect
	github.com/docker/docker-credential-helpers v0.7.0 // indirect
	github.com/docker/go-connections v0.4.0 // indirect
	github.com/docker/go-events v0.0.0-20190806004212-e31b211e4f1c // indirect
	github.com/docker/go-units v0.5.0 // indirect
	github.com/dsnet/compress v0.0.2-0.20210315054119-f66993602bf5 // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/eapache/go-resiliency v1.2.0 // indirect
	github.com/eapache/go-xerial-snappy v0.0.0-20180814174437-776d5712da21 // indirect
	github.com/eapache/queue v1.1.0 // indirect
	github.com/facebookincubator/nvdtools v0.1.5 // indirect
	github.com/fatih/color v1.14.1 // indirect
	github.com/flier/gohs v1.2.1 // indirect
	github.com/gabriel-vasile/mimetype v1.4.0 // indirect
	github.com/go-chi/jwtauth/v5 v5.1.0 // indirect
	github.com/go-logr/logr v1.2.3 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.12.0 // indirect
	github.com/goccy/go-json v0.10.2 // indirect
	github.com/gogo/googleapis v1.4.0 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.3 // indirect
	github.com/golang/snappy v0.0.4 // indirect
	github.com/google/go-cmp v0.5.9 // indirect
	github.com/google/go-containerregistry v0.13.0 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/hashicorp/go-multierror v1.1.1 // indirect
	github.com/hashicorp/go-retryablehttp v0.7.2 // indirect
	github.com/hashicorp/go-uuid v1.0.2 // indirect
	github.com/huandu/xstrings v1.3.3 // indirect
	github.com/imdario/mergo v0.3.12 // indirect
	github.com/jcmturner/aescts/v2 v2.0.0 // indirect
	github.com/jcmturner/dnsutils/v2 v2.0.0 // indirect
	github.com/jcmturner/gofork v1.0.0 // indirect
	github.com/jcmturner/gokrb5/v8 v8.4.2 // indirect
	github.com/jcmturner/rpc/v2 v2.0.3 // indirect
	github.com/jinzhu/copier v0.3.5 // indirect
	github.com/jmespath/go-jmespath v0.4.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/k-sone/critbitgo v1.4.0 // indirect
	github.com/klauspost/compress v1.16.3 // indirect
	github.com/klauspost/cpuid/v2 v2.2.3 // indirect
	github.com/klauspost/pgzip v1.2.5 // indirect
	github.com/leodido/go-urn v1.2.2 // indirect
	github.com/lestrrat-go/blackmagic v1.0.1 // indirect
	github.com/lestrrat-go/httpcc v1.0.1 // indirect
	github.com/lestrrat-go/httprc v1.0.4 // indirect
	github.com/lestrrat-go/iter v1.0.2 // indirect
	github.com/lestrrat-go/jwx/v2 v2.0.9 // indirect
	github.com/lestrrat-go/option v1.0.1 // indirect
	github.com/lib/pq v1.10.7 // indirect
	github.com/lithammer/shortuuid/v3 v3.0.7 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.17 // indirect
	github.com/mattn/go-runewidth v0.0.13 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.4 // indirect
	github.com/mholt/archiver/v3 v3.5.1 // indirect
	github.com/minio/md5-simd v1.1.2 // indirect
	github.com/minio/sha256-simd v1.0.0 // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/go-homedir v1.1.0 // indirect
	github.com/mitchellh/hashstructure/v2 v2.0.2 // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/moby/locker v1.0.1 // indirect
	github.com/moby/sys/mountinfo v0.5.0 // indirect
	github.com/moby/sys/signal v0.6.0 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/nwaples/rardecode v1.1.0 // indirect
	github.com/oklog/ulid v1.3.1 // indirect
	github.com/olekukonko/tablewriter v0.0.5 // indirect
	github.com/opencontainers/go-digest v1.0.0 // indirect
	github.com/opencontainers/image-spec v1.1.0-rc2 // indirect
	github.com/opencontainers/runc v1.1.2 // indirect
	github.com/opencontainers/runtime-spec v1.0.3-0.20210326190908-1c3f411f0417 // indirect
	github.com/opencontainers/selinux v1.10.1 // indirect
	github.com/pelletier/go-toml v1.9.5 // indirect
	github.com/pierrec/lz4 v2.6.1+incompatible // indirect
	github.com/pierrec/lz4/v4 v4.1.17 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/prometheus/client_model v0.3.0 // indirect
	github.com/prometheus/common v0.39.0 // indirect
	github.com/prometheus/procfs v0.9.0 // indirect
	github.com/rcrowley/go-metrics v0.0.0-20201227073835-cf1acfcdf475 // indirect
	github.com/redis/go-redis/v9 v9.0.2 // indirect
	github.com/rivo/uniseg v0.2.0 // indirect
	github.com/rs/xid v1.4.0 // indirect
	github.com/samber/mo v1.8.0 // indirect
	github.com/scylladb/go-set v1.0.3-0.20200225121959-cc7b2070d91e // indirect
	github.com/shopspring/decimal v1.2.0 // indirect
	github.com/sirupsen/logrus v1.9.0 // indirect
	github.com/spdx/tools-golang v0.5.0-rc1 // indirect
	github.com/spf13/afero v1.9.5 // indirect
	github.com/spf13/cast v1.5.0 // indirect
	github.com/sylabs/sif/v2 v2.8.1 // indirect
	github.com/sylabs/squashfs v0.6.1 // indirect
	github.com/therootcompany/xz v1.0.1 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.4.0 // indirect
	github.com/ulikunitz/xz v0.5.10 // indirect
	github.com/vbatts/tar-split v0.11.2 // indirect
	github.com/wagoodman/go-partybus v0.0.0-20210627031916-db1f5573bbc5 // indirect
	github.com/wagoodman/go-progress v0.0.0-20230301185719-21920a456ad5 // indirect
	github.com/xi2/xz v0.0.0-20171230120015-48954b6210f8 // indirect
	go.opencensus.io v0.23.0 // indirect
	go.opentelemetry.io/contrib/instrumentation/github.com/Shopify/sarama/otelsarama v0.31.0 // indirect
	go.opentelemetry.io/otel/metric v0.37.0 // indirect
	go.opentelemetry.io/otel/trace v1.14.0 // indirect
	golang.org/x/crypto v0.7.0 // indirect
	golang.org/x/exp v0.0.0-20230202163644-54bba9f4231b // indirect
	golang.org/x/mod v0.9.0 // indirect
	golang.org/x/net v0.8.0 // indirect
	golang.org/x/sync v0.1.0 // indirect
	golang.org/x/sys v0.6.0 // indirect
	golang.org/x/text v0.8.0 // indirect
	golang.org/x/tools v0.7.0 // indirect
	google.golang.org/genproto v0.0.0-20230110181048-76db0878b65f // indirect
	google.golang.org/grpc v1.54.0 // indirect
	google.golang.org/protobuf v1.30.0 // indirect
	gopkg.in/ini.v1 v1.67.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

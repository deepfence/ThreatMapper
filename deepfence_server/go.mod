module github.com/deepfence/ThreatMapper/deepfence_server

go 1.23.2

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../deepfence_utils

require (
	github.com/Jeffail/tunny v0.1.4
	github.com/Masterminds/sprig/v3 v3.3.0
	github.com/PagerDuty/go-pagerduty v1.8.0
	github.com/andygrunwald/go-jira v1.16.0
	github.com/aws/aws-sdk-go v1.55.5
	github.com/casbin/casbin/v2 v2.100.0
	github.com/cenkalti/backoff/v4 v4.3.0
	github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000
	github.com/docker/docker v27.3.1+incompatible
	github.com/go-chi/chi/v5 v5.2.1
	github.com/go-chi/jwtauth/v5 v5.3.3
	github.com/go-playground/locales v0.14.1
	github.com/go-playground/pkg/v5 v5.30.0
	github.com/go-playground/universal-translator v0.18.1
	github.com/go-playground/validator/v10 v10.22.1
	github.com/google/uuid v1.6.0
	github.com/hibiken/asynq v0.25.1
	github.com/jellydator/ttlcache/v3 v3.3.0
	github.com/json-iterator/go v1.1.12
	github.com/k-sone/critbitgo v1.4.0
	github.com/klauspost/compress v1.17.11
	github.com/lestrrat-go/jwx/v2 v2.1.3
	github.com/minio/minio-go/v7 v7.0.80
	github.com/neo4j/neo4j-go-driver/v5 v5.25.0
	github.com/pkg/errors v0.9.1
	github.com/prometheus/client_golang v1.20.5
	github.com/redis/go-redis/v9 v9.7.0
	github.com/riandyrn/otelchi v0.10.1
	github.com/rs/zerolog v1.33.0
	github.com/samber/lo v1.47.0
	github.com/samber/mo v1.13.0
	github.com/sashabaranov/go-openai v1.32.5
	github.com/sendgrid/sendgrid-go v3.16.0+incompatible
	github.com/spf13/cast v1.7.0
	github.com/swaggest/openapi-go v0.2.44
	github.com/twmb/franz-go v1.18.0
	github.com/ugorji/go/codec v1.2.12
	go.opentelemetry.io/otel v1.31.0
	go.opentelemetry.io/otel/exporters/jaeger v1.17.0
	go.opentelemetry.io/otel/sdk v1.31.0
	go.opentelemetry.io/otel/trace v1.31.0
	golang.org/x/crypto v0.31.0
	golang.org/x/mod v0.17.0
	golang.org/x/term v0.27.0
	gotest.tools v2.2.0+incompatible
	k8s.io/api v0.31.2
	k8s.io/apimachinery v0.31.2
	k8s.io/client-go v0.31.2
	k8s.io/metrics v0.31.2
	k8s.io/utils v0.0.0-20240921022957-49e7df575cb6
)

require (
	dario.cat/mergo v1.0.1 // indirect
	github.com/Masterminds/goutils v1.1.1 // indirect
	github.com/Masterminds/semver/v3 v3.3.0 // indirect
	github.com/Microsoft/go-winio v0.4.14 // indirect
	github.com/VirusTotal/gyp v0.9.0 // indirect
	github.com/XSAM/otelsql v0.35.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/bmatcuk/doublestar/v4 v4.6.1 // indirect
	github.com/casbin/govaluate v1.2.0 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/containerd/log v0.1.0 // indirect
	github.com/davecgh/go-spew v1.1.2-0.20180830191138-d8f796af33cc // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.3.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/distribution/reference v0.6.0 // indirect
	github.com/docker/go-connections v0.5.0 // indirect
	github.com/docker/go-units v0.5.0 // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/emicklei/go-restful/v3 v3.11.0 // indirect
	github.com/fatih/structs v1.1.0 // indirect
	github.com/felixge/httpsnoop v1.0.4 // indirect
	github.com/fxamacker/cbor/v2 v2.7.0 // indirect
	github.com/gabriel-vasile/mimetype v1.4.3 // indirect
	github.com/go-ini/ini v1.67.0 // indirect
	github.com/go-logr/logr v1.4.2 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-openapi/jsonpointer v0.19.6 // indirect
	github.com/go-openapi/jsonreference v0.20.2 // indirect
	github.com/go-openapi/swag v0.22.4 // indirect
	github.com/go-playground/assert/v2 v2.2.0 // indirect
	github.com/go-playground/form/v4 v4.2.1 // indirect
	github.com/goccy/go-json v0.10.3 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang-jwt/jwt/v4 v4.4.2 // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	github.com/google/gnostic-models v0.6.8 // indirect
	github.com/google/go-cmp v0.6.0 // indirect
	github.com/google/go-querystring v1.1.0 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/huandu/xstrings v1.5.0 // indirect
	github.com/imdario/mergo v0.3.11 // indirect
	github.com/jmespath/go-jmespath v0.4.0 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/klauspost/cpuid/v2 v2.2.8 // indirect
	github.com/leodido/go-urn v1.4.0 // indirect
	github.com/lestrrat-go/blackmagic v1.0.2 // indirect
	github.com/lestrrat-go/httpcc v1.0.1 // indirect
	github.com/lestrrat-go/httprc v1.0.6 // indirect
	github.com/lestrrat-go/iter v1.0.2 // indirect
	github.com/lestrrat-go/option v1.0.1 // indirect
	github.com/lib/pq v1.10.9 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/minio/md5-simd v1.1.2 // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/moby/docker-image-spec v1.3.1 // indirect
	github.com/moby/term v0.5.0 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/morikuni/aec v1.0.0 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/opencontainers/go-digest v1.0.0 // indirect
	github.com/opencontainers/image-spec v1.1.0 // indirect
	github.com/pierrec/lz4/v4 v4.1.21 // indirect
	github.com/prometheus/client_model v0.6.1 // indirect
	github.com/prometheus/common v0.55.0 // indirect
	github.com/prometheus/procfs v0.15.1 // indirect
	github.com/raito-io/neo4j-tracing v0.0.5 // indirect
	github.com/robfig/cron/v3 v3.0.1 // indirect
	github.com/rs/xid v1.6.0 // indirect
	github.com/segmentio/asm v1.2.0 // indirect
	github.com/sendgrid/rest v2.6.9+incompatible // indirect
	github.com/shopspring/decimal v1.4.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	github.com/swaggest/jsonschema-go v0.3.72 // indirect
	github.com/swaggest/refl v1.3.0 // indirect
	github.com/trivago/tgo v1.0.7 // indirect
	github.com/twmb/franz-go/pkg/kadm v1.14.0 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.9.0 // indirect
	github.com/x448/float16 v0.8.4 // indirect
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.56.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.31.0 // indirect
	go.opentelemetry.io/otel/metric v1.31.0 // indirect
	golang.org/x/net v0.30.0 // indirect
	golang.org/x/oauth2 v0.21.0 // indirect
	golang.org/x/sync v0.10.0 // indirect
	golang.org/x/sys v0.28.0 // indirect
	golang.org/x/text v0.21.0 // indirect
	golang.org/x/time v0.8.0 // indirect
	google.golang.org/protobuf v1.35.2 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	gotest.tools/v3 v3.5.1 // indirect
	k8s.io/klog/v2 v2.130.1 // indirect
	k8s.io/kube-openapi v0.0.0-20240228011516-70dd3763d340 // indirect
	sigs.k8s.io/json v0.0.0-20221116044647-bc3834ca7abd // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.4.1 // indirect
	sigs.k8s.io/yaml v1.4.0 // indirect
)

module github.com/deepfence/ThreatMapper/deepfence_worker

go 1.21.1

toolchain go1.22.0

replace github.com/deepfence/golang_deepfence_sdk/client => ../golang_deepfence_sdk/client/

replace github.com/deepfence/golang_deepfence_sdk/utils => ../golang_deepfence_sdk/utils

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../deepfence_utils/

replace github.com/deepfence/df-utils => ../deepfence_agent/tools/apache/deepfence/df-utils

replace github.com/deepfence/package-scanner => ../deepfence_agent/plugins/package-scanner

replace github.com/deepfence/SecretScanner => ../deepfence_agent/plugins/SecretScanner

replace github.com/deepfence/YaraHunter => ../deepfence_agent/plugins/YaraHunter

replace github.com/deepfence/ThreatMapper/deepfence_server => ../deepfence_server/

replace github.com/deepfence/agent-plugins-grpc => ../deepfence_agent/plugins/agent-plugins-grpc

// Do not upgrade the version. This should be in sync with https://github.com/deepfence/syft.
require github.com/anchore/syft v1.3.0

require (
	github.com/aws/aws-sdk-go v1.49.16
	github.com/cenkalti/backoff/v3 v3.2.2
	github.com/deepfence/SecretScanner v0.0.0-00010101000000-000000000000
	github.com/deepfence/ThreatMapper/deepfence_server v0.0.0-00010101000000-000000000000
	github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000
	github.com/deepfence/YaraHunter v0.0.0-00010101000000-000000000000
	github.com/deepfence/agent-plugins-grpc v1.1.0
	github.com/deepfence/golang_deepfence_sdk/utils v0.0.0-20240626143546-e4ec9311fdf9
	github.com/deepfence/match-scanner v0.0.0-20240701181002-ece6f13f296f
	github.com/deepfence/package-scanner v0.0.0-00010101000000-000000000000
	github.com/go-chi/chi/v5 v5.0.8
	github.com/hibiken/asynq v0.24.1
	github.com/jellydator/ttlcache/v3 v3.2.0
	github.com/johnfercher/maroto/v2 v2.0.0-beta.17
	github.com/kelseyhightower/envconfig v1.4.0
	github.com/minio/minio-go/v7 v7.0.70
	github.com/neo4j/neo4j-go-driver/v5 v5.20.0
	github.com/pkg/errors v0.9.1
	github.com/pressly/goose/v3 v3.17.0
	github.com/prometheus/client_golang v1.18.0
	github.com/robfig/cron/v3 v3.0.1
	github.com/rs/zerolog v1.32.0
	github.com/sourcegraph/conc v0.3.0
	github.com/spdx/tools-golang v0.5.4
	github.com/twmb/franz-go v1.16.1
	github.com/twmb/franz-go/pkg/kadm v1.11.0
	github.com/xuri/excelize/v2 v2.8.0
	go.opentelemetry.io/otel v1.27.0
	go.opentelemetry.io/otel/exporters/jaeger v1.17.0
	go.opentelemetry.io/otel/sdk v1.26.0
	go.opentelemetry.io/otel/trace v1.27.0
	golang.org/x/mod v0.17.0
)

require (
	github.com/AdaLogics/go-fuzz-headers v0.0.0-20230811130428-ced1acdcaa24 // indirect
	github.com/AdamKorcz/go-118-fuzz-build v0.0.0-20231105174938-2b5cbb29f3e2 // indirect
	github.com/CycloneDX/cyclonedx-go v0.8.0 // indirect
	github.com/Jeffail/tunny v0.1.4 // indirect
	github.com/Masterminds/goutils v1.1.1 // indirect
	github.com/Masterminds/semver v1.5.0 // indirect
	github.com/Masterminds/semver/v3 v3.2.0 // indirect
	github.com/Masterminds/sprig/v3 v3.2.3 // indirect
	github.com/Microsoft/go-winio v0.6.2 // indirect
	github.com/Microsoft/hcsshim v0.12.4 // indirect
	github.com/PagerDuty/go-pagerduty v1.7.0 // indirect
	github.com/XSAM/otelsql v0.31.0 // indirect
	github.com/acobaugh/osrelease v0.1.0 // indirect
	github.com/anchore/go-logger v0.0.0-20230725134548-c21dafa1ec5a // indirect
	github.com/anchore/go-struct-converter v0.0.0-20221118182256-c68fdcfa2092 // indirect
	github.com/anchore/packageurl-go v0.1.1-0.20240312213626-055233e539b4 // indirect
	github.com/anchore/stereoscope v0.0.3-0.20240423181235-8b297badafd5 // indirect
	github.com/andybalholm/brotli v1.0.6 // indirect
	github.com/andygrunwald/go-jira v1.16.0 // indirect
	github.com/aymanbagabas/go-osc52/v2 v2.0.1 // indirect
	github.com/becheran/wildmatch-go v1.0.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/bmatcuk/doublestar/v4 v4.6.1 // indirect
	github.com/boombuler/barcode v1.0.1 // indirect
	github.com/casbin/casbin/v2 v2.81.0 // indirect
	github.com/casbin/govaluate v1.1.0 // indirect
	github.com/cenkalti/backoff/v4 v4.3.0 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/charmbracelet/lipgloss v0.10.0 // indirect
	github.com/containerd/cgroups/v3 v3.0.3 // indirect
	github.com/containerd/containerd v1.7.18 // indirect
	github.com/containerd/continuity v0.4.3 // indirect
	github.com/containerd/errdefs v0.1.0 // indirect
	github.com/containerd/fifo v1.1.0 // indirect
	github.com/containerd/log v0.1.0 // indirect
	github.com/containerd/ttrpc v1.2.5 // indirect
	github.com/containerd/typeurl/v2 v2.1.1 // indirect
	github.com/davecgh/go-spew v1.1.2-0.20180830191138-d8f796af33cc // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.3.0 // indirect
	github.com/deepfence/golang_deepfence_sdk/client v0.0.0-20240626143546-e4ec9311fdf9 // indirect
	github.com/deepfence/vessel v0.12.3 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/distribution/reference v0.6.0 // indirect
	github.com/docker/cli v24.0.7+incompatible // indirect
	github.com/docker/docker v27.0.2+incompatible // indirect
	github.com/docker/docker-credential-helpers v0.7.0 // indirect
	github.com/docker/go-connections v0.5.0 // indirect
	github.com/docker/go-events v0.0.0-20190806004212-e31b211e4f1c // indirect
	github.com/docker/go-units v0.5.0 // indirect
	github.com/dsnet/compress v0.0.2-0.20210315054119-f66993602bf5 // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/emicklei/go-restful/v3 v3.11.0 // indirect
	github.com/f-amaral/go-async v0.3.0 // indirect
	github.com/facebookincubator/nvdtools v0.1.5 // indirect
	github.com/fatih/color v1.16.0 // indirect
	github.com/fatih/structs v1.1.0 // indirect
	github.com/felixge/httpsnoop v1.0.4 // indirect
	github.com/gabriel-vasile/mimetype v1.4.4 // indirect
	github.com/github/go-spdx/v2 v2.2.0 // indirect
	github.com/go-chi/jwtauth/v5 v5.3.1 // indirect
	github.com/go-logr/logr v1.4.2 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-openapi/jsonpointer v0.19.6 // indirect
	github.com/go-openapi/jsonreference v0.20.2 // indirect
	github.com/go-openapi/swag v0.22.3 // indirect
	github.com/go-playground/assert/v2 v2.2.0 // indirect
	github.com/go-playground/form/v4 v4.2.1 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/pkg/v5 v5.22.0 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.16.0 // indirect
	github.com/goccy/go-json v0.10.2 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang-jwt/jwt/v4 v4.5.0 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	github.com/golang/snappy v0.0.4 // indirect
	github.com/google/gnostic-models v0.6.8 // indirect
	github.com/google/go-cmp v0.6.0 // indirect
	github.com/google/go-containerregistry v0.19.1 // indirect
	github.com/google/go-querystring v1.1.0 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/hashicorp/go-multierror v1.1.1 // indirect
	github.com/hashicorp/go-retryablehttp v0.7.7 // indirect
	github.com/hhrutter/lzw v1.0.0 // indirect
	github.com/hhrutter/tiff v1.0.1 // indirect
	github.com/hillu/go-yara/v4 v4.3.2 // indirect
	github.com/huandu/xstrings v1.3.3 // indirect
	github.com/imdario/mergo v0.3.16 // indirect
	github.com/jinzhu/copier v0.4.0 // indirect
	github.com/jmespath/go-jmespath v0.4.0 // indirect
	github.com/johnfercher/go-tree v1.0.5 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/jung-kurt/gofpdf v1.16.2 // indirect
	github.com/k-sone/critbitgo v1.4.0 // indirect
	github.com/klauspost/compress v1.17.9 // indirect
	github.com/klauspost/cpuid/v2 v2.2.7 // indirect
	github.com/klauspost/pgzip v1.2.5 // indirect
	github.com/leodido/go-urn v1.2.4 // indirect
	github.com/lestrrat-go/blackmagic v1.0.2 // indirect
	github.com/lestrrat-go/httpcc v1.0.1 // indirect
	github.com/lestrrat-go/httprc v1.0.5 // indirect
	github.com/lestrrat-go/iter v1.0.2 // indirect
	github.com/lestrrat-go/jwx/v2 v2.0.21 // indirect
	github.com/lestrrat-go/option v1.0.1 // indirect
	github.com/lib/pq v1.10.9 // indirect
	github.com/lucasb-eyer/go-colorful v1.2.0 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/mattn/go-runewidth v0.0.15 // indirect
	github.com/matttproud/golang_protobuf_extensions/v2 v2.0.0 // indirect
	github.com/mholt/archiver/v3 v3.5.1 // indirect
	github.com/minio/md5-simd v1.1.2 // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/go-homedir v1.1.0 // indirect
	github.com/mitchellh/hashstructure/v2 v2.0.2 // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/moby/docker-image-spec v1.3.1 // indirect
	github.com/moby/locker v1.0.1 // indirect
	github.com/moby/sys/mountinfo v0.7.1 // indirect
	github.com/moby/sys/sequential v0.5.0 // indirect
	github.com/moby/sys/signal v0.7.0 // indirect
	github.com/moby/sys/user v0.1.0 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/mohae/deepcopy v0.0.0-20170929034955-c48cc78d4826 // indirect
	github.com/muesli/reflow v0.3.0 // indirect
	github.com/muesli/termenv v0.15.2 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/nlepage/go-tarfs v1.2.1 // indirect
	github.com/nwaples/rardecode v1.1.0 // indirect
	github.com/olekukonko/tablewriter v0.0.5 // indirect
	github.com/opencontainers/go-digest v1.0.0 // indirect
	github.com/opencontainers/image-spec v1.1.0 // indirect
	github.com/opencontainers/runtime-spec v1.2.0 // indirect
	github.com/opencontainers/selinux v1.11.0 // indirect
	github.com/pdfcpu/pdfcpu v0.6.0 // indirect
	github.com/pierrec/lz4/v4 v4.1.21 // indirect
	github.com/prometheus/client_model v0.5.0 // indirect
	github.com/prometheus/common v0.45.0 // indirect
	github.com/prometheus/procfs v0.12.0 // indirect
	github.com/raito-io/neo4j-tracing v0.0.5 // indirect
	github.com/redis/go-redis/v9 v9.5.1 // indirect
	github.com/richardlehane/mscfb v1.0.4 // indirect
	github.com/richardlehane/msoleps v1.0.3 // indirect
	github.com/rivo/uniseg v0.4.7 // indirect
	github.com/rs/xid v1.5.0 // indirect
	github.com/samber/lo v1.39.0 // indirect
	github.com/samber/mo v1.11.0 // indirect
	github.com/sashabaranov/go-openai v1.17.10 // indirect
	github.com/scylladb/go-set v1.0.3-0.20200225121959-cc7b2070d91e // indirect
	github.com/segmentio/asm v1.2.0 // indirect
	github.com/sendgrid/rest v2.6.9+incompatible // indirect
	github.com/sendgrid/sendgrid-go v3.14.0+incompatible // indirect
	github.com/sethvargo/go-retry v0.2.4 // indirect
	github.com/shopspring/decimal v1.3.1 // indirect
	github.com/sirupsen/logrus v1.9.3 // indirect
	github.com/spf13/afero v1.11.0 // indirect
	github.com/spf13/cast v1.6.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	github.com/swaggest/jsonschema-go v0.3.64 // indirect
	github.com/swaggest/openapi-go v0.2.44 // indirect
	github.com/swaggest/refl v1.3.0 // indirect
	github.com/sylabs/squashfs v0.6.1 // indirect
	github.com/therootcompany/xz v1.0.1 // indirect
	github.com/trivago/tgo v1.0.7 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.7.0 // indirect
	github.com/ugorji/go/codec v1.2.12 // indirect
	github.com/ulikunitz/xz v0.5.11 // indirect
	github.com/wagoodman/go-partybus v0.0.0-20230516145632-8ccac152c651 // indirect
	github.com/wagoodman/go-progress v0.0.0-20230925121702-07e42b3cdba0 // indirect
	github.com/xi2/xz v0.0.0-20171230120015-48954b6210f8 // indirect
	github.com/xuri/efp v0.0.0-20230802181842-ad255f2331ca // indirect
	github.com/xuri/nfp v0.0.0-20230819163627-dc951e3ffe1a // indirect
	go.opencensus.io v0.24.0 // indirect
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.52.0 // indirect
	go.opentelemetry.io/otel/metric v1.27.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/crypto v0.24.0 // indirect
	golang.org/x/exp v0.0.0-20231108232855-2478ac86f678 // indirect
	golang.org/x/image v0.15.0 // indirect
	golang.org/x/net v0.26.0 // indirect
	golang.org/x/oauth2 v0.18.0 // indirect
	golang.org/x/sync v0.7.0 // indirect
	golang.org/x/sys v0.21.0 // indirect
	golang.org/x/term v0.21.0 // indirect
	golang.org/x/text v0.16.0 // indirect
	golang.org/x/time v0.5.0 // indirect
	google.golang.org/appengine v1.6.8 // indirect
	google.golang.org/genproto v0.0.0-20240624140628-dc46fd24d27d // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240624140628-dc46fd24d27d // indirect
	google.golang.org/grpc v1.64.0 // indirect
	google.golang.org/protobuf v1.34.2 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/ini.v1 v1.67.0 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	k8s.io/api v0.29.0 // indirect
	k8s.io/apimachinery v0.29.0 // indirect
	k8s.io/client-go v0.29.0 // indirect
	k8s.io/klog/v2 v2.110.1 // indirect
	k8s.io/kube-openapi v0.0.0-20231010175941-2dd684a91f00 // indirect
	k8s.io/metrics v0.29.0 // indirect
	k8s.io/utils v0.0.0-20240102154912-e7106e64919e // indirect
	sigs.k8s.io/json v0.0.0-20221116044647-bc3834ca7abd // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.4.1 // indirect
	sigs.k8s.io/yaml v1.4.0 // indirect
)

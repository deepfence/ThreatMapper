module github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/fluentbit/out_deepfence

go 1.20

replace github.com/deepfence/golang_deepfence_sdk/client => ../../../../../golang_deepfence_sdk/client

replace github.com/deepfence/golang_deepfence_sdk/utils => ../../../../../golang_deepfence_sdk/utils/

require (
	github.com/deepfence/golang_deepfence_sdk/client v0.0.0-00010101000000-000000000000
	github.com/deepfence/golang_deepfence_sdk/utils v0.0.0-00010101000000-000000000000
	github.com/fluent/fluent-bit-go v0.0.0-20230515084116-b93d969da46d
	github.com/hashicorp/go-retryablehttp v0.7.4
)

require (
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.2.0 // indirect
	github.com/goccy/go-json v0.10.2 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/klauspost/compress v1.16.5 // indirect
	github.com/lestrrat-go/blackmagic v1.0.1 // indirect
	github.com/lestrrat-go/httpcc v1.0.1 // indirect
	github.com/lestrrat-go/httprc v1.0.4 // indirect
	github.com/lestrrat-go/iter v1.0.2 // indirect
	github.com/lestrrat-go/jwx/v2 v2.0.11 // indirect
	github.com/lestrrat-go/option v1.0.1 // indirect
	github.com/mattn/go-colorable v0.1.12 // indirect
	github.com/mattn/go-isatty v0.0.14 // indirect
	github.com/pierrec/lz4/v4 v4.1.17 // indirect
	github.com/rs/zerolog v1.29.1 // indirect
	github.com/segmentio/asm v1.2.0 // indirect
	github.com/twmb/franz-go v1.13.5 // indirect
	github.com/twmb/franz-go/pkg/kadm v1.8.1 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.4.0 // indirect
	github.com/ugorji/go/codec v1.1.7 // indirect
	golang.org/x/crypto v0.9.0 // indirect
	golang.org/x/sys v0.8.0 // indirect
)

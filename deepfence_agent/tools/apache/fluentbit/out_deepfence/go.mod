module github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/fluentbit/out_deepfence

go 1.18

replace github.com/deepfence/ThreatMapper/deepfence_server_client => ../../../../../deepfence_server_client/

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../../../../../deepfence_utils/

require (
	github.com/deepfence/ThreatMapper/deepfence_server_client v0.0.0-00010101000000-000000000000
	github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000
	github.com/fluent/fluent-bit-go v0.0.0-20221129124408-1c1d505c91a5
	github.com/hashicorp/go-retryablehttp v0.7.1
)

require (
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.1.0 // indirect
	github.com/goccy/go-json v0.9.11 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.1 // indirect
	github.com/lestrrat-go/blackmagic v1.0.1 // indirect
	github.com/lestrrat-go/httpcc v1.0.1 // indirect
	github.com/lestrrat-go/httprc v1.0.4 // indirect
	github.com/lestrrat-go/iter v1.0.2 // indirect
	github.com/lestrrat-go/jwx/v2 v2.0.8 // indirect
	github.com/lestrrat-go/option v1.0.0 // indirect
	github.com/ugorji/go/codec v1.1.7 // indirect
	golang.org/x/crypto v0.0.0-20220722155217-630584e8d5aa // indirect
)

module github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/fluentbit/out_deepfence

go 1.18

replace github.com/deepfence/ThreatMapper/deepfence_server_client => ../../../../../deepfence_server_client/

require (
	github.com/deepfence/ThreatMapper/deepfence_server_client v0.0.0-00010101000000-000000000000
	github.com/fluent/fluent-bit-go v0.0.0-20221129124408-1c1d505c91a5
	github.com/hashicorp/go-retryablehttp v0.7.1
)

require (
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/ugorji/go/codec v1.2.7 // indirect
)

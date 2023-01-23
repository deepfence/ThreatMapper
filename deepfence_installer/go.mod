module github.com/deepfence/deepfence_installer

go 1.19

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../deepfence_utils/

replace github.com/deepfence/ThreatMapper/deepfence_server_client => ../deepfence_server_client

require github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000

require (
	github.com/deepfence/ThreatMapper/deepfence_server_client v0.0.0-00010101000000-000000000000 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/hashicorp/go-retryablehttp v0.7.2 // indirect
	github.com/mattn/go-colorable v0.1.12 // indirect
	github.com/mattn/go-isatty v0.0.14 // indirect
	github.com/rs/zerolog v1.28.0 // indirect
	golang.org/x/sys v0.2.0 // indirect
)

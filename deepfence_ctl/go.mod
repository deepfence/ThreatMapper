module github.com/deepfence/ThreatMapper/deepfence_ctl

go 1.19

replace github.com/deepfence/ThreatMapper/deepfence_server_client => ../deepfence_server_client

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../deepfence_utils

require (
	github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000
	github.com/spf13/cobra v1.6.1
)

require (
	github.com/deepfence/ThreatMapper/deepfence_server_client v0.0.0-00010101000000-000000000000 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.1 // indirect
	github.com/hashicorp/go-retryablehttp v0.7.1 // indirect
	github.com/inconshreveable/mousetrap v1.0.1 // indirect
	github.com/mattn/go-colorable v0.1.12 // indirect
	github.com/mattn/go-isatty v0.0.14 // indirect
	github.com/rs/zerolog v1.28.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	golang.org/x/sys v0.0.0-20211216021012-1d35b9e2eb4e // indirect
)

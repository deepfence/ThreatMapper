module github.com/deepfence/ThreatMapper/deepfence_ctl

go 1.19

replace github.com/deepfence/ThreatMapper/deepfence_server_client => ../deepfence_server_client

require github.com/spf13/cobra v1.6.1

require (
	github.com/inconshreveable/mousetrap v1.0.1 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
)

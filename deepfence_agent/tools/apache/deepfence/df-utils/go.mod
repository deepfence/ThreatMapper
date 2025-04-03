module github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/deepfence/df-utils

go 1.23.2

replace github.com/deepfence/ThreatMapper/deepfence_utils => ../../../../../deepfence_utils

require github.com/deepfence/ThreatMapper/deepfence_utils v0.0.0-00010101000000-000000000000

require (
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/rs/zerolog v1.33.0 // indirect
	golang.org/x/sys v0.27.0 // indirect
)

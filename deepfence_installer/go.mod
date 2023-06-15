module github.com/deepfence/deepfence_installer

go 1.20

replace github.com/deepfence/golang_deepfence_sdk/utils => ../golang_deepfence_sdk/utils

replace github.com/deepfence/golang_deepfence_sdk/client => ../golang_deepfence_sdk/client

require github.com/deepfence/golang_deepfence_sdk/utils v0.0.0-00010101000000-000000000000

require (
	github.com/deepfence/golang_deepfence_sdk/client v0.0.0-00010101000000-000000000000 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/hashicorp/go-retryablehttp v0.7.4 // indirect
	github.com/mattn/go-colorable v0.1.12 // indirect
	github.com/mattn/go-isatty v0.0.14 // indirect
	github.com/rs/zerolog v1.29.1 // indirect
	golang.org/x/sys v0.8.0 // indirect
)

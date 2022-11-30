all: vendor deepfence_worker

vendor:
	go mod tidy -v
	go mod vendor

deepfence_worker: ./*.go ./**/*.go
	go build

.PHONY: vendor

all: vendor deepfence_ingester

vendor:
	go mod tidy -v
	go mod vendor

deepfence_ingester:
	CGO_ENABLED=0 go build

clean:
	rm deepfence_ingester

.PHONY: vendor clean

all: vendor deepfence_server

vendor:
	go mod tidy -v
	go mod vendor

deepfence_server: ./*.go ./**/*.go
	go build

clean:
	rm deepfence_server

.PHONY: vendor clean

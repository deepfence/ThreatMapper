all: vendor deepfence_worker

vendor:
	go mod tidy -v
	go mod vendor

deepfence_worker: ./*.go ./**/*.go
	go build -buildvcs=false

clean:
	rm deepfence_worker

.PHONY: vendor clean

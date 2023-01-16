all: vendor deepfencectl

vendor:
	go mod tidy -v
	go mod vendor

deepfencectl: ./*.go ./**/*.go
	CGO_ENABLED=0 go build -o deepfencectl

clean:
	rm deepfencectl

.PHONY: vendor clean

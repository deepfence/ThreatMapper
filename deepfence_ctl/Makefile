all: deepfencectl

vendor: go.mod $(shell find ../deepfence_utils -path ../deepfence_utils/vendor -prune -o -name '*.go')
	go mod tidy -v
	go mod vendor

deepfencectl: vendor $(shell find . -path ./vendor -prune -o -name '*.go')
	CGO_ENABLED=0 go build -ldflags="-s -w -X main.Version=${VERSION} -extldflags=-static" -buildvcs=false -o deepfencectl

clean:
	-rm deepfencectl

.PHONY: all clean

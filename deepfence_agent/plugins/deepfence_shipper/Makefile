.PHONY: deepfence_shipper

VERSION?=v`git rev-parse --short HEAD`

all: deepfence_shipper

local: deepfence_shipper

vendor: go.mod $(shell find ../../../deepfence_utils -path ../../../deepfence_utils/vendor -prune -o -name '*.go')
	go mod tidy -v
	go mod vendor

deepfence_shipper: vendor $(shell find . -path ./vendor -prune -o -name '*.go')
	CGO_ENABLED=0 go build -buildvcs=false -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${VERSION} -X main.BuildTime=$(shell date +"%s%d%m%y") -extldflags=-static"

clean:
	-rm deepfence_shipper
	-rm -rf ./vendor

.PHONY: all clean local

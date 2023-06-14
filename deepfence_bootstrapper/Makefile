VERSION=`git describe --tags`

all: ./**/*.go
	go mod tidy -v
	go mod vendor
	GOOS=linux go build -ldflags="-s -w -X main.Version=${VERSION}"
	-upx ./deepfence_bootstrapper

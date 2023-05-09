all: ./**/*.go
	go mod tidy -v
	go mod vendor
	GOOS=linux go build -ldflags="-s -w"
	-upx ./deepfence_bootstrapper

module github.com/deepfence/ThreatMapper/deepfence_bootstrapper

go 1.19

replace github.com/deepfence/golang_deepfence_sdk/utils => ../golang_deepfence_sdk/utils/

replace github.com/deepfence/golang_deepfence_sdk/client => ../golang_deepfence_sdk/client/

require (
	github.com/containerd/cgroups/v3 v3.0.1
	github.com/deepfence/golang_deepfence_sdk/utils v0.0.0-20230520084733-80a8ef45b860
	github.com/minio/selfupdate v0.6.0
	github.com/opencontainers/runtime-spec v1.0.2
	gopkg.in/ini.v1 v1.67.0
)

require (
	aead.dev/minisign v0.2.0 // indirect
	github.com/cilium/ebpf v0.9.1 // indirect
	github.com/coreos/go-systemd/v22 v22.5.0 // indirect
	github.com/docker/go-units v0.4.0 // indirect
	github.com/godbus/dbus/v5 v5.0.4 // indirect
	github.com/mattn/go-colorable v0.1.12 // indirect
	github.com/mattn/go-isatty v0.0.14 // indirect
	github.com/rs/zerolog v1.29.1 // indirect
	github.com/sirupsen/logrus v1.9.0 // indirect
	github.com/stretchr/testify v1.8.3 // indirect
	golang.org/x/crypto v0.7.0 // indirect
	golang.org/x/sys v0.7.0 // indirect
	google.golang.org/protobuf v1.27.1 // indirect
)

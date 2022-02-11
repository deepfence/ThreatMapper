all: localinit go bin/open_tracer bin/vulnerability_sbom_plugin

localinit:
	$(PWD)/bootstrap.sh

bin/open_tracer: ./open-tracer/**/*.rs
	(cd open-tracer/open-tracer-ebpf && cargo build --release)
	(cd open-tracer/open-tracer-usr && OPEN_TRACER_EBPF_BIN_ABS_PATH=$(PWD)/open-tracer/target/bpfel-unknown-none/release/open-tracer-ebpf cargo build --release)
	cp $(PWD)/open-tracer/target/release/open-tracer $(PWD)/bin

go: ./agent-plugins-grpc/proto/*.proto
	(cd agent-plugins-grpc && make go)
	cp agent-plugins-grpc/proto/*.go $(PWD)/proto

bin/vulnerability_sbom_plugin: ./vulnerability-sbom-plugin/agent-plugins-grpc/proto/*.proto
	(cd vulnerability-sbom-plugin && make)
	cp vulnerability-sbom-plugin/agent-plugins-grpc/proto/*.go $(PWD)/proto

clean:
	-rm $(PWD)/bin/open_tracer
	cargo clean --manifest-path=./open-tracer/Cargo.toml
	(cd agent-plugins-grpc && make clean)

.PHONY: clean localinit

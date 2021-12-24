all: bin/open_tracer localinit

localinit:
	$(PWD)/bootstrap.sh

bin/open_tracer: ./open-tracer/**/*.rs
	(cd open-tracer && cargo xtask build-ebpf --release)
	(cd open-tracer && OPEN_TRACER_EBPF_BIN_ABS_PATH=$(PWD)/open-tracer/target/4.11/bpfel-unknown-none/release/echo cargo build --release)
	cp $(PWD)/open-tracer/target/release/echo $(PWD)/bin/open_tracer

clean:
	-rm $(PWD)/bin/open_tracer
	cargo clean --manifest-path=./open-tracer/Cargo.toml

.PHONY: clean localinit

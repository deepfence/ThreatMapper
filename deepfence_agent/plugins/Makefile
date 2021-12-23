TARGET=bin/open_tracer

all: $(TARGET)
	-mkdir $(PWD)/bin
	cp $(PWD)/open-tracer/target/release/echo bin/open_tracer

bin/open_tracer: check-and-reinit-submodules-open-tracer
	(cd open-tracer && cargo xtask build-ebpf --release)
	(cd open-tracer && OPEN_TRACER_EBPF_BIN_ABS_PATH=$(PWD)/open-tracer/target/4.11/bpfel-unknown-none/release/echo cargo build --release)

clean:
	-rm -rf $(PWD)/bin
	cargo clean --manifest-path=./open-tracer/Cargo.toml

realclean:
	-rm -rf $(PWD)/bin
	-rm -rf $(PWD)/open-tracer

.PHONY: check-and-reinit-submodules-open-tracer clean
check-and-reinit-submodules-open-tracer:
	@if git submodule status ./open-tracer | egrep -q '^[-]|^[+]' ; then \
		echo "INFO: Need to reinitialize git submodules"; \
		git submodule update --init --remote ./open-tracer; \
	fi

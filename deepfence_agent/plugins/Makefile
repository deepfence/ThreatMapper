all: localinit

localinit:

clean:
	-rm -rf $(PWD)/bin/secret-scanner/
	-rm -rf $(PWD)/bin/yara-hunter/
	-rm $(PWD)/bin/package-scanner
	-rm $(PWD)/bin/compliance
	-(cd agent-plugins-grpc && make clean)
	-(rm -rf $(PWD)/fluent-bit/build && mkdir $(PWD)/fluent-bit/build)
	-(cd $(PWD)/fluent-bit/plugins/out_deepfence && make clean)

.PHONY: clean localinit all

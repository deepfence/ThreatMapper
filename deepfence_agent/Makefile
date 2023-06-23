#
# DEEPFENCE.IO CONFIDENTIAL
# _________________________
#
# [2014 - 2022] deepfence Inc
# All Rights Reserved.
#
# NOTICE:  All information contained herein is, and remains
# the property of deepfence.io and its suppliers,
# if any.  The intellectual and technical concepts contained
# herein are proprietary to deepfence.io
# and its suppliers and may be covered by U.S. and Foreign Patents,
# patents in process, and are protected by trade secret or copyright law.
# Dissemination of this information or reproduction of this material
# is strictly forbidden unless prior written permission is obtained
# from deepfence.io.
#

.PHONY: agent

GOFLAGS += --ldflags
GOFLAGS += '-extldflags "-static"'

LN = ln
MKDIR = mkdir
CD = cd
CP = cp

all:: gocode

gocode:
	echo "Building go binary for cloud metadata instance id..."
	$(CD) tools/apache/deepfence/df-utils/get_cloud_instance_id && env CGO_ENABLED=0 go build -o getCloudInstanceId $(GOFLAGS) .

install:

agent:
	($(CD) tools/apache/scope && \
		go mod tidy -v && \
		go mod vendor && \
		env GOGC=off \
		go build \
		-ldflags "-X main.version=$(shell git rev-parse --short HEAD)  -X github.com/weaveworks/scope/probe/host.agentCommitID=$(shell git rev-parse --short HEAD) -X github.com/weaveworks/scope/probe/host.agentBuildTime=$(shell date +"%s%d%m%y") -s -w" \
		-tags 'netgo osusergo unsafe' \
		-o docker/deepfence_exe \
		./prog)

clean:
	$(RM) tools/apache/deepfence/df-utils/getCloudInstanceId
	$(RM) tools/apache/compliance_check/deepfence_compliance_check
	$(RM) tools/apache/scope/docker/deepfence_exe
	(cd plugins && make clean)

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

GOFLAGS += --ldflags
GOFLAGS += '-extldflags "-static"'

LN = ln
MKDIR = mkdir
CD = cd
CP = cp

#all:: prep libs deepfenced install gocode
all:: gocode

gocode:
	# go build -o tools/apache/licensegen/licensegen tools/apache/licensegen/licensegen.go

	echo "Building agent authenticator..."
	$(CD) tools/apache/deepfence/df-utils/agent_auth && env CGO_ENABLED=0 go build -o agentAuth $(GOFLAGS) .

	echo "Building go binary for cloud metadata instance id..."
	$(CD) tools/apache/deepfence/df-utils/get_cloud_instance_id && env CGO_ENABLED=0 go build -o getCloudInstanceId $(GOFLAGS) .

	echo "Building compliance checker"
	$(CD) tools/apache/compliance_check/ && env CGO_ENABLED=0 go build -o deepfence_compliance_check $(GOFLAGS) *.go

install:

clean:
	$(RM) tools/apache/deepfence/df-utils/agentAuth
	$(RM) tools/apache/deepfence/df-utils/getCloudInstanceId
	cd tools/apache/scope && make realclean

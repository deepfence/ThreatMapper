FROM golang:1.14-buster

RUN apt-get update
RUN apt-get install -y bash make git gcc libc-dev
RUN mkdir /home/deepfence
COPY check-deps.sh /home/deepfence/
COPY build/gocode-build.sh /home/deepfence/

ARG DF_AGENT_SRC=/go/src/github.com/deepfence/deepfence_agent
WORKDIR $DF_AGENT_SRC

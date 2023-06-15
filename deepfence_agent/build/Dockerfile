FROM golang:1.20-bullseye

RUN apt-get update
RUN apt-get install -y bash make git gcc libc-dev lsb-release software-properties-common libz-dev apt-utils protobuf-compiler libhyperscan-dev  \
    ca-certificates libpcap-dev time file shellcheck curl
RUN apt-get update  \
    && apt-get -qq -y --no-install-recommends install build-essential automake libtool make gcc pkg-config libssl-dev git protoc-gen-go \
    libjansson-dev libmagic-dev \
    && cd /root  \
    && wget https://github.com/VirusTotal/yara/archive/refs/tags/v4.3.2.tar.gz \
    && tar -zxf v4.3.2.tar.gz \
    && cd yara-4.3.2 \
    && ./bootstrap.sh \
    && ./configure --prefix=/usr/local/yara --disable-dotnet --enable-magic --enable-cuckoo \
    && make \
    && make install \
    && cd /usr/local/ \
    && tar -czf yara.tar.gz yara
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.30.0
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0
RUN mkdir /home/deepfence
COPY build/*.sh /home/deepfence/

ARG DF_AGENT_SRC=/go/src/github.com/deepfence/deepfence_agent
WORKDIR $DF_AGENT_SRC

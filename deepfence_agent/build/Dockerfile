FROM golang:1.19-bullseye

RUN apt-get update
RUN apt-get install -y bash make git gcc libc-dev lsb-release software-properties-common libz-dev apt-utils protobuf-compiler libhyperscan-dev
RUN apt-get update  \
    && apt-get -qq -y --no-install-recommends install build-essential automake libtool make gcc pkg-config libssl-dev git protoc-gen-go \
    libjansson-dev libmagic-dev \
    && cd /root  \
    && wget https://github.com/VirusTotal/yara/archive/refs/tags/v4.2.1.tar.gz \
    && tar -zxf v4.2.1.tar.gz \
    && cd yara-4.2.1 \
    && ./bootstrap.sh \
    && ./configure --prefix=/usr/local/yara --disable-dotnet --enable-magic --enable-cuckoo \
    && make \
    && make install \
    && cd /usr/local/ \
    && tar -czf yara.tar.gz yara
#RUN wget https://apt.llvm.org/llvm.sh
#RUN chmod +x llvm.sh
#RUN ./llvm.sh 12
#RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
#ENV PATH="/root/.cargo/bin:${PATH}"
#RUN rustup install stable
#RUN rustup install nightly
#RUN rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
#RUN rustup default nightly
#RUN chmod +x llvm.sh
#RUN ./llvm.sh 12
#RUN cargo install bpf-linker
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.27.1
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2.0
RUN mkdir /home/deepfence
COPY build/*.sh /home/deepfence/

ARG DF_AGENT_SRC=/go/src/github.com/deepfence/deepfence_agent
WORKDIR $DF_AGENT_SRC

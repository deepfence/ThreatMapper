FROM golang:1.19-alpine3.17 AS build
RUN apk add --no-cache git
ADD . /go/diagnosis/
WORKDIR /go/diagnosis/
RUN go build -o diagnosis *.go

FROM alpine:3.17
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

COPY --from=build /go/diagnosis/diagnosis /home/
RUN apk update --no-cache && apk upgrade --no-cache \
    && apk add --no-cache curl \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod u+x kubectl && mv kubectl /usr/local/bin/kubectl \
    && apk del curl \
    && rm -rf /var/cache/apk/*

ENTRYPOINT ["/home/diagnosis"]

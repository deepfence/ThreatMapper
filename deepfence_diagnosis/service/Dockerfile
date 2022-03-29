FROM golang:1.18-alpine3.15 AS build
RUN apk add --no-cache git
ADD . /go/diagnosis/
WORKDIR /go/diagnosis/
RUN go build -o diagnosis *.go

FROM alpine:3.15
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

COPY --from=build /go/diagnosis/diagnosis /home/
RUN apk update \
    && apk add --no-cache curl \
    && curl -LO "https://dl.k8s.io/release/v1.22.2/bin/linux/amd64/kubectl" \
    && chmod u+x kubectl && mv kubectl /bin/kubectl \
    && apk del curl \
    && rm -rf /var/cache/apk/*

ENTRYPOINT ["/home/diagnosis"]

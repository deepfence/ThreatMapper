FROM golang:1.18-alpine3.15 AS build
RUN apk add --no-cache git \
    && apk add gcc libc-dev libffi-dev bash
ADD . /go/vulnerability_mapper/
WORKDIR /go/vulnerability_mapper/
RUN go mod tidy \
    && go build -o /tmp/vulnerability_mapper

FROM alpine:3.15
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

COPY --from=build /tmp/vulnerability_mapper /usr/local/bin/vulnerability_mapper
COPY grype.yaml /root/.grype.yaml
COPY entrypoint.sh /entrypoint.sh
RUN apk add --no-cache --update bash curl \
    && apk upgrade \
    && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.40.1 \
    && echo "0 */4 * * * /usr/local/bin/grype db update" >> /etc/crontabs/root \
    && chmod +x /entrypoint.sh
EXPOSE 8001
ENTRYPOINT ["/entrypoint.sh"]
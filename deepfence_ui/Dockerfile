# docker build -t deepfenceio/alpine-node:10 -f Dockerfile.node .
FROM node:14.18.1-alpine3.14 AS build

ADD . /home/deepfence/
ENV NPM_CONFIG_LOGLEVEL=warn NPM_CONFIG_PROGRESS=false NODE_OPTIONS="--max_old_space_size=4096"
RUN apk update \
  && apk add --no-cache git bash python2 make g++ \
  && cd /home/deepfence && yarn --pure-lockfile \
  && cd /home/deepfence && yarn run build \
  && cd /home/deepfence \
  && rm -rf app docs test webpack.* \
  && rm README.md Dockerfile \
  && apk del git python2 make g++ \
  && rm -rf /usr/lib/python*/ensurepip /usr/local/lib/python*/ensurepip \
  && rm -rf /var/cache/apk/* \
  && yarn cache clean


FROM alpine:3.14.2
LABEL deepfence.role=system

WORKDIR /home/deepfence
ENV BACKEND_PORT=8004 YARN_VERSION=latest NPM_CONFIG_LOGLEVEL=warn NPM_CONFIG_PROGRESS=false
RUN apk update && apk add --no-cache yarn && rm -rf /var/cache/apk/*
COPY --from=build /usr/local/bin/node /usr/bin/
COPY --from=build /home/deepfence/build /home/deepfence/build
COPY --from=build /home/deepfence/console_version.txt /home/deepfence/console_version.txt
COPY --from=build /home/deepfence/entrypoint.sh /home/deepfence/entrypoint.sh
COPY --from=build /home/deepfence/node_modules /home/deepfence/node_modules
COPY --from=build /home/deepfence/yarn.lock /home/deepfence/yarn.lock
COPY --from=build /home/deepfence/package.json /home/deepfence/package.json
COPY --from=build /home/deepfence/server.js /home/deepfence/server.js
ENTRYPOINT [ "/home/deepfence/entrypoint.sh" ]

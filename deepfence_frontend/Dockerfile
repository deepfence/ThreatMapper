FROM node:16.11-bullseye-slim as build

WORKDIR /home/deepfence/
ADD . /home/deepfence/
RUN apt-get update \
    && npm install turbo pnpm typescript -g \
    && pnpm install \
    && pnpm run build

FROM nginx:1.23-alpine
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

RUN apk upgrade --no-cache -U \
    && rm /usr/share/nginx/html/*
COPY --from=build /home/deepfence/apps/dashboard/dist/ /usr/share/nginx/html

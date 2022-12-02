ARG DF_IMG_TAG=latest
ARG IMAGE_NAME=deepfence_ui_build
FROM $IMAGE_NAME:$DF_IMG_TAG AS build

FROM nginx:1.23-alpine
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

RUN apk upgrade --no-cache -U \
    && rm /usr/share/nginx/html/*
COPY --from=build /home/deepfence/apps/dashboard/dist/ /usr/share/nginx/html

FROM nginx:1.23-alpine
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

RUN apk upgrade --no-cache -U \
    && rm /usr/share/nginx/html/*
COPY ./apps/dashboard/dist/ /usr/share/nginx/html

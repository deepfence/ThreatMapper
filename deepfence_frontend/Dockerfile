FROM nginx:1.23-alpine
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

RUN apk upgrade --no-cache -U \
    && rm /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ./apps/dashboard/dist/ /usr/share/nginx/html
COPY ./product_version.txt /usr/share/nginx/html/
COPY ./console_version.txt /usr/share/nginx/html/

EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]

#!/bin/sh

if [ ! -f certs/ssl/filebeat.crt ]; then
    echo "SSL certificate not found! Grenerating SSL certificate...."
    mkdir -p certs/ssl
    sudo openssl genrsa -out certs/ssl/filebeat.key 2048
    sudo openssl req -new -x509 -config self-signed-certificate.cnf -nodes -days 365 -key certs/ssl/filebeat.key -out certs/ssl/filebeat.crt
    sudo chmod a+r certs/ssl/filebeat*
else
    echo "SSL certificate found"
    ls -l certs/ssl/*
fi
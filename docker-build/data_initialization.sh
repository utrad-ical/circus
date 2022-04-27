#!/bin/bash

mkdir -p /var/circus/data/api-store/logs
mkdir /var/circus/data/api-store/blobs
mkdir /var/circus/data/dicom
mkdir /var/circus/data/labels
mkdir /var/circus/data/plugin-results
mkdir /var/circus/data/cs-tmp
mkdir /var/circus/data/downloads

mkdir /var/circus/data/mongodb
mkdir /var/circus/data/mongodb_dump
mkdir -p /var/circus/data/logs/mongodb
mkdir /var/circus/data/logs/nginx

mongod --config /etc/mongod.conf &
echo "rs.initiate();" | mongosh

cd /var/circus/packages/circus-api
node circus migrate

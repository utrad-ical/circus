#!/bin/bash

DATA_PATH=`docker inspect --format='{{json .Mounts}}' $HOSTNAME | jq -r '.[] | select(.Source != "/var/run/docker.sock") | .Source'`

mkdir -p $DATA_PATH/api-store/logs
mkdir $DATA_PATH/api-store/blobs
mkdir $DATA_PATH/dicom
mkdir $DATA_PATH/labels
mkdir $DATA_PATH/plugin-results
mkdir $DATA_PATH/cs-tmp
mkdir $DATA_PATH/downloads

mkdir $DATA_PATH/mongodb
mkdir $DATA_PATH/mongodb_dump
mkdir -p $DATA_PATH/logs/mongodb
mkdir $DATA_PATH/logs/nginx

mongod --config /etc/mongod.conf &

cd /var/circus/packages/circus-api
node circus migrate

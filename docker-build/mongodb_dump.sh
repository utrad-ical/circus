#!/bin/bash

DATA_PATH=`docker inspect --format='{{json .Mounts}}' $HOSTNAME | jq -r '.[] | select(.Source != "/var/run/docker.sock") | .Source'`
DATE_TIME=$(date "+%Y%m%d_%H%M%S")

mongodump -d circus-api --gzip --archive=$DATA_PATH/mongodb_dump/circus_mongo_archive_$DATE_TIME.gz
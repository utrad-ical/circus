#!/bin/bash

DATE_TIME=$(date "+%Y%m%d_%H%M%S")

mongodump -d circus-api --gzip --archive=/var/circus/data/mongodb_dump/circus_mongo_archive_$DATE_TIME.gz
#!/bin/bash

mongod --config /etc/mongod.conf
/usr/sbin/nginx -c /etc/nginx/nginx.conf

cd /var/circus/packages/circus-api
IP=0.0.0.0 pm2 start server.js --node-args="server.js"

if [ $AUTO_BOOT_JOB_MANAGER = 1 ]; then
    cd /var/circus/packages/circus-cs-core
    pm2 start daemon.js --name circus-cs-job-manager
fi

tail -f /dev/null

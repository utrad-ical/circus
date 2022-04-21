#!/bin/bash

mongod --config /etc/mongod.conf --replSet replset
/usr/sbin/nginx -c /etc/nginx/nginx.conf

cd /var/circus/packages/circus-api
pm2 start server.js --node-args="server.js"

tail -f /dev/null

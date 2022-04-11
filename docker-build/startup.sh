#!/bin/bash

DATA_PATH=`docker inspect --format='{{json .Mounts}}' $HOSTNAME | jq -r '.[] | select(.Source != "/var/run/docker.sock") | .Source'`

LOCAL_HOST_IP=`getent hosts hostmachine | awk '{print $1}'`

sed -i '13s/localhost/'$LOCAL_HOST_IP'/g' /var/circus/circus.config.js

if [ $DATA_PATH != "/var/circus/data" ]; then
    sed -i 's@/var/circus/data@'$DATA_PATH'@g' /var/circus/circus.config.js    
    ln -s $DATA_PATH /var/circus/data
fi    

if [ $DAEMON_MODE = 1 ]; then
  /root/services.sh
else
  /bin/bash
fi


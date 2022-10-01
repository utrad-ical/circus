#!/bin/bash

# Set IP address of host machine
LOCAL_HOST_IP=`getent hosts hostmachine | awk '{print $1}'`

# Set doodHostWorkingDirectory option for pluginJobRunner
MY_CONTAINER_ID=`basename "$(head /proc/1/cgroup)"`
DOOD_HOST_WORKING_PATH=`docker inspect -f '{{json .Mounts }}' $MY_CONTAINER_ID | jq -r '.[] | select (.Destination == "/var/circus/data").Source'`

if [ $DAEMON_MODE = 1 ]; then
  /circus/services.sh
else
  /bin/bash
fi

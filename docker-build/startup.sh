#!/bin/bash

# Set IP address of host machine
LOCAL_HOST_IP=`getent hosts hostmachine | awk '{print $1}'`

if [ $DAEMON_MODE = 1 ]; then
  /circus/services.sh
else
  /bin/bash
fi

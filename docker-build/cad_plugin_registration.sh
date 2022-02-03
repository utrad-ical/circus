#!/bin/bash

echo $1
PLUGIN_ID=`docker image inspect --format='{{.Id}}' $1 | sed -e 's/^sha256://g'`
echo $PLUGIN_ID

cd /var/circus/packages/circus-api
node circus register-cad-plugin $PLUGIN_ID
#!/bin/sh

cd $(dirname "$0")

create_test_image() {
NAME="$1"
echo "-------------------------------------------------"
echo " Create image circus-mock/${NAME}:1.0"
echo "-------------------------------------------------"

docker image rm circus-mock/${NAME}:1.0 ./ 2>/dev/null


cat <<DOCKER_FILE > Dockerfile
FROM alpine:latest

LABEL version="1.0"
LABEL description="CIRCUS Plug-in mock ${NAME}"

RUN mkdir -p /circus/in /circus/out

ADD run.sh /run.sh
ADD results /results

CMD [ "/bin/sh", "/run.sh", "${NAME}" ]
DOCKER_FILE

docker build -t circus-mock/${NAME}:1.0 ./

}

create_test_image error
create_test_image timeout

for result in $(find ./results/ -maxdepth 1 -type d); do
  TARGET=$(basename ${result})
  if [ ${TARGET} == "results" ]; then
    continue
  fi
  echo ${TARGET}
  create_test_image ${TARGET}
done

rm -f Dockerfile
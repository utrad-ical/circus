#!/bin/sh

WORK_DIR=$(dirname "$0")
RESULTS_DIR=${WORK_DIR}/results
IN_DIR=${WORK_DIR}/circus/in
OUT_DIR=${WORK_DIR}/circus/out

if [ ! -d ${OUT_DIR} ]; then
  mkdir -p ${OUT_DIR}
fi

case "$1" in
  "timeout" ) sleep 24 * 3600 ;;
  "error" )
    echo 'Something wrong' 1>&2
    exit 1;
    ;;
esac

if [ -f "${RESULTS_DIR}/$1/_outputs" ]; then
  while read line
  do
    case ${line:0:6} in
      "error:" ) echo ${line:6} 1>&2 ;;
      * ) echo ${line}
    esac
    usleep 300000
  done < "${RESULTS_DIR}/$1/_outputs"
fi

if [ -d "${RESULTS_DIR}/$1" ]; then
  cp -aR ${RESULTS_DIR}/$1/* ${OUT_DIR}
  find ${OUT_DIR} -type f -name _outputs | xargs rm -f
fi

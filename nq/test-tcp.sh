#!/bin/bash
set -e -u

HOSTNAME="localhost"

TARGET_PROTOCOL="tcp"
TARGET_PORT=7799
TARGET_HOST="${TARGET_PROTOCOL}://${HOSTNAME}:${TARGET_PORT}"

PROTOCOL="http"
PORT=8877
HOST="${PROTOCOL}://${HOSTNAME}:${PORT}"

echo ""
echo START NEW SERVER
echo ${HOST}
echo ${TARGET_PROTOCOL}
echo 
RESP=`curl "${HOST}/nq/new" \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{
          "protocol": "'${TARGET_PROTOCOL}'"
        , "port": '${TARGET_PORT}'
      }'`

echo ${RESP} | json-prettify
UUID=`echo ${RESP} | json-prettify | grep resource | cut -d'"' -f 4`

# can see empty metadata
echo ""
echo EMPTY METADATA
curl -s "${HOST}/nq/${UUID}" | json-prettify

# can post data
echo ""
echo POST
# TODO listen for the output... or not
echo nc ${HOSTNAME} ${TARGET_PORT}
echo "hello world" | nc ${HOSTNAME} ${TARGET_PORT}
echo "done"

# TODO cannot post too much data

# can see metadata
echo ""
echo METADATA
curl -s "${HOST}/nq/${UUID}" | json-prettify

# can see data
echo ""
echo DATA
curl "${HOST}/nq/${UUID}/0" \
  -X DELETE \
  #-o /dev/null

# can see that deleting data removes the metadata
echo ""
echo METADATA
curl -s "${HOST}/nq/${UUID}" | json-prettify

# can be closed by uuid-holder
echo ""
echo CLOSE
curl "${HOST}/nq/${UUID}" \
  -X DELETE \
  | json-prettify
#echo $RESP

#curl "${}"

# TODO 
# test that server quits at staletime
# test that server doesn't quit 5 seconds before staletime

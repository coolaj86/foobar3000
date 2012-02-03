#!/bin/bash

set -e -u

HOSTNAME="http://localhost"
PORT=8877
HOST="${HOSTNAME}:${PORT}"
TARGET_PORT=7799
TARGET_HOST="${HOSTNAME}:${TARGET_PORT}"


echo ""
echo START NEW SERVER
RESP=`curl -s "${HOST}/nq/new" \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{
          "protocol": "http"
        , "port": 7799
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
curl -s "${TARGET_HOST}/anything-i-want" \
  -X POST \
  -d 'blardy=blarg&nblargle=blar' \
  | json-prettify

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
echo "data above"

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
# test what happens if the id is bad

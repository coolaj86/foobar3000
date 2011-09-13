curl echo.foobar3000.com/meta \
  -H 'Content-Type: application/json' \
  -d '{ 
          "headers": ["Content-Type: text/plain"]
        , "body": "Hello World!"
        , "pathname": "/hello"
        , "session": "NTU1MTM1MzMzMTQ4"
      }'

curl echo.foobar3000.com/hello?session=NTU1MTM1MzMzMTQ4


curl "echo.foobar3000.com/meta/?session=NTU1MTM1MzMzMTQ4&headers=Content-Type%3A%20application%2Foctet-stream&pathname=%2Fhello" \
  -H 'Content-Type: application/octet-stream' \
  -d 'Hello World!'

curl echo.foobar3000.com/hello?session=NTU1MTM1MzMzMTQ4

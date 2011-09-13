FooBar3000
===

The world's most advanced HTTP Echo Server!

Installation & Usage
---

    npm install connect btoa
    node app.js

Examples
===

    HOST=foobar3000.com

Echo
---

Gives back a JSON representation of your request:

    curl -v "http://${HOST}/?foo=bar&baz=qux&baz=quux"

Manipulate Response Headers
---

Gives you back the headers you want:

    curl -v "http://${HOST}/?headers=X-Test-Header%3A%20Hello%2FWorld"

    curl -v "http://${HOST}" -d 'headers=X-Test-Header%3A%20Hello%2FWorld'

    curl -v "http://${HOST}" \
      -H 'Content-Type: application/json' \
      -d '{
            "headers": [
              "X-Test-Header: Hello World"
            ]
          }'

Manipulate Response Body
---

Gives you back the body you want (instead of echo-ing)

    curl -v "http://${HOST}" \
      -H 'Content-Type: application/json' \
      -d '{
              "headers": [
                  "Content-Type: text/plain"
              ]
            , "body": "Hello World!"
          }'

Manipulate Binary Response Body
---

    curl -v "http://${HOST}/?rawBody=true&headers=Content-Type%3A%20application%2Foctet-stream" \
      -H 'Content-Type: application/octet-stream' \
      -d 'Hello World!'

Manipulate Raw TCP Stream
---

Gives you back exactly what you want:

    curl -v "http://${HOST}" \
      -H 'Content-Type: application/json' \
      -d '{
            "raw": "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 12\r\nConnection: keep-alive\r\n\r\nHello World\n"
          }'

    curl -v "http://${HOST}/?rawResponse=true" \
      -H 'Content-Type: application/octet-stream' \
      -d @hello.http.bin

Note: `hello.http.bin` represents a file with proper `CRLF` endings

    HTTP/1.1 200 OK\r\n
    Content-Type: text/plain; charset=utf-8\r\n
    Content-Length: 12\r\n
    Connection: keep-alive\r\n
    \r\n
    Hello World\n

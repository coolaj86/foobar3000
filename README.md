FooBar3000
===

The world's most advanced HTTP Echo Server!

Installation & Usage
---

    npm install connect btoa
    node app.js

Examples
===

Echo
---

Gives back a JSON representation of your request:

    curl -v "http://foobar3000.coolaj86.info/?foo=bar&baz=qux&baz=quux"

Manipulate Response Headers
---

Gives you back the headers you want:

    curl -v "http://foobar3000.coolaj86.info/?headers=X-Test-Header%3A%20Hello%2FWorld"

    curl -v "http://foobar3000.coolaj86.info" -d 'headers=X-Test-Header%3A%20Hello%2FWorld'

    curl -v "http://foobar3000.coolaj86.info" \
      -H 'Content-Type: application/json' \
      -d '{
            "headers": [
              "X-Test-Header: Hello World"
            ]
          }'

Manipulate Response Body
---

Gives you back the body you want (instead of echo-ing)

    curl -v "http://foobar3000.coolaj86.info" \
      -H 'Content-Type: application/json' \
      -d '{
              "headers": [
                  "Content-Type: text/plain"
              ]
            , "body": "Hello World!"
          }'

Manipulate Raw TCP Stream
---

Gives you back exactly what you want:

    curl -v "http://foobar3000.coolaj86.info" \
      -H 'Content-Type: application/json' \
      -d '{
            "raw": "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: 12\r\nDate: Wed, 12 Jan 2011 19:22:51 GMT\r\nX-Response-Time: 0ms\r\nConnection: keep-alive\r\n\r\nHello World\n"
          }'

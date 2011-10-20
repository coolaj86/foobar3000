FooBar3000
===

The world's most advanced Echo Server!

HTTP is supported.

TCP and UDP are in the works.

Installation
===

    git clone git://github.com/coolaj86/foobar3000.git
    cd foobar3000

    npm install -g spark clean-css ender
    npm install

    ender build json-storage jQuery Array.prototype.forEachAsync jeesh reqwest ahr2
    mv ender.* assets/
    cleancss assets/style.css > assets/style.min.css

    spark app.js

Examples
===

More Examples: http://foobar3000.com

    HOST=foobar3000.com

Echo
---

Gives back a JSON representation of your request:

    curl "http://${HOST}/?foo=bar&baz=qux&baz=quux"

Specify Response Headers
---

Gives you back the headers you specify.

form-urlencoded:

    curl -v "http://${HOST}/?headers=X-Test-Header%3A%20Hello%2FWorld"

    curl -v "http://${HOST}" -d 'headers=X-Test-Header%3A%20Hello%2FWorld'

JSON:

    curl -v "http://${HOST}" \
      -H 'Content-Type: application/json' \
      -d '{
            "headers": [
              "X-Test-Header: Hello World"
            ]
          }'

Specify Text or Binary Response Body
---

Gives you back the body you want (instead of echo-ing)

Text:

    curl -v "http://${HOST}" \
      -H 'Content-Type: application/json' \
      -d '{
              "headers": [
                  "Content-Type: text/plain"
              ]
            , "body": "Hello World!"
          }'

Binary:

    curl -v "http://${HOST}/?rawBody=true&headers=Content-Type%3A%20application%2Foctet-stream" \
      -H 'Content-Type: application/octet-stream' \
      -d 'Hello World!'

Specify Raw Text or Binary TCP Stream
---

Gives you back exactly what you want:

Text:

    curl -v "http://${HOST}" \
      -H 'Content-Type: application/json' \
      -d '{
            "raw": "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 12\r\nConnection: keep-alive\r\n\r\nHello World\n"
          }'

Binary:

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

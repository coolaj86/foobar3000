Overview
===

NetQueue is a tcp/udp/http over http GET (one-way) proxy.

What this means is that you can tell NetQueue to open a listner
(http, tcp, or udp) on a particular port and then use HTTP GET
to retrieve the packets that are being sent to that port.

The basic operations supported are:

    POST      /nq/new                   # create server
    DELETE    /nq/{{resource}}          # delete server
    GET       /nq/{{resource}}          # get meta data
    DELETE    /nq/{{resource}}/{{id}}   # get and delete single item

Variations between listener Protocols
===

`HTTP` is the best protocol to use, as all of the big questions -
connection, packet start/end, compression, etc -
are already answered and it works as you would expect.

> TODO - pass any `content-encoding` header so that browsers will automatically gunzip / deflate the data

`TCP` assumes that a data transmission is finished when the remote closes the socket.

`UDP` assumes that a data transmission is contained in a single packet. Reassembly must be done on the client-side.

Create a listener
===

    POST /nq/new

To create a server that listens on port

**Request**:

    curl ${HOST}/nq/new \
      -X POST \
      -H 'Content-Type: application/json' \
      -d '{ 
              "protocol": "http:"
            , "port": 5555
          }'

**Response**:

    {
        "userSession": "xyz"
        "errors": []
        "result": {
            "resource": "6e3f4c54-2bf2-4d92-81a5-bf775eb5f3a4"
          , "port": 5566
          , "protocol": 5566
        }
    }

Note that on error `resource` is not present and `errors` will have message(s)

Closing a listener
===

    DELETE /nq/{{resource}}

When you're done with your listener, you should destroy it to free up the port
and other resources on the server immediately.

However, if this listener is not used for 10 minutes, it will be killed automatically.

**Request**

    curl ${HOST}/nq/{{resource}} \
      -X DELETE

**Response**

    {
        "result": "the server was removed from port {{number}}"
    }

Retrieving meta data
===

    GET /nq/{{resource}}

The meta data contains an array of information about each packet
received - such as the byte length of the message, any http headers,
and a timestamp of when the message was enqueued.

**Request**

    curl ${HOST}/nq/{{resource}}

**Response**

    {
        "result": [
            {
                "length": 1024
              , "timestamp": 1328294622456
              , "method": "POST"
              , "url": "/foo/bar?baz=corge&qux"
              , "headers": {
                    "user-agent": "curl/7.19.0"
                }
            }
        ]
    }


Retrieving data
===

    DELETE /nq/{{resource}}/{{id}}

The only way to retrieve the data is to delete it.

There is a max upload limit of 1 MiB per packet,
a total upload limit of 10 MiB,
and the data will be deleted when the listener is killed.

**Request**

    curl ${HOST}/nq/{{resource}} \
      -X DELETE

**Response**

The response will be the raw binary bytes that were sent to the listener.

Errors
===

  * `EADDRINUSE` will be issued if there's already a listener on that socket

        {
            "code":"EADDRINUSE"
          , "errno":"EADDRINUSE"
          , "syscall":"listen"
        }


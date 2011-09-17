(function () {
  "use strict"

  var net = require("net")
    , server
    , port = 32000
    ;

  function onListen() {
      console.log("[Server] On Listen. [" + server.address() + "]");
  }

  function formatBody(data) {
    var body;

    body = data.body || data;

    if (data.error) {
      return data.error;
    }

    if ('string' !== typeof body) {
      body = JSON.stringify(body);
    }

    return body;
  }

  function onConnection(stream) {
    console.log("[Server] On Connection. [" + server.connections + "]");

    stream.setTimeout(60 * 1000);
    // stream.setNoDelay();
    // stream.setKeepAlive();

    console.log("\t[Stream] readyState: " + stream.readyState);

    stream.on('connect', function () {
      // useless here, only clients get this message
      console.log("\t[Stream] On Connect");
    });

    stream.on('secure', function () {
      console.log("\t[Stream] On Secure");
    });

    stream.on('data', function (data) {
      console.log("\t[Stream] On Data");

      var i = 0;
      while (/\s/.exec(String.fromCharCode(data[i]))) {
        i += 1;
      }

      if ('{' === String.fromCharCode(data[i])) {
        try {
          data = JSON.parse(data);
        } catch(e) {
          // ignore
          console.log('\t[Stream] JSON Parse Error');
        }

        if (undefined !== data.keepalive) {
          stream.setKeepAlive(data.keepalive);
        }

        if (parseInt(data.port)) {
          console.log('[New Client] On Create Connection', stream.remoteAddress + ':' + data.port);

          var client = net.createConnection(data.port, stream.remoteAddress)
            ;

          client.on('error', function (err) {
            data.error = err.message;
            console.log('[New Client] On Error', data.error);
            stream.write(formatBody(data));
          });

          client.on('connect', function () {
            console.log('[New Client] On Connect', data.error);
            client.write(data.body || data);
            //stream.write("reconnected to " + stream.remoteAddress + ":" + data.port);
            onConnection(client);
          });

          return;
        }

        if (data.body) {
          data = data.body;
          if ('string' !== typeof data) {
            data = JSON.stringify(data);
          }
        }
      }

      stream.write(data);
    });

    stream.on('end', function () {
      console.log("\t[Stream] On End (received FIN).\n\t\treadyState: " + stream.readyState);
    });

    stream.on('timeout', function () {
      console.log("\t[Stream] On Timeout");
      stream.write("[timeout 60] Thank you, come again!");
      stream.end();
      console.log("\t[Stream] Closing (sent FIN).\n\t\treadyState: " + stream.readyState);
    });

    stream.on('drain', function () {
      // Ignoring possible upload/download mismatch for this echo server
      console.log("\t[Stream] On Drain");
    });

    stream.on('error', function (err) {
      // not used in this example
      console.log("\t[Stream] On Error", err.message, stream.remotePort);
    });

    stream.on('close', function (had_error) {
      console.log("\t[Stream] On Close (file descriptor closed). State: " + stream.readyState);
      // 'closed', 'open', 'opening', 'readOnly', or 'writeOnly'
      if ('open' === stream.readyState) {
        stream.write("cause error");
      }
    });
  }

  function onClose() {
    console.log("[Server] closing, but waiting for all streams to close");
  }

  server = net.createServer(onConnection);
  //server.on('connection', onConnection);
  // TODO close every 15 minutes or so and relisten (just for fun)
  server.on('close', onClose);
  // TODO issue warning to users when approaching N
  server.maxConnections = 1000;
  server.listen(port);
  //server.listen('/tmp/tcp-echo.' + process.getuid() + '.sock');
  //server.listen(3355, 'localhost');
  //server.listenFD(some_fd);
  console.log("[Server] listening on", port);
}());

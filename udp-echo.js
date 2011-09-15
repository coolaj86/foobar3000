// http://nodejs.org/docs/v0.4.11/api/dgram.html
(function () {
  "use strict";

  var dgram = require("dgram")
    , port = 32000
    , server
    ;

  function onCreatedSocket() {
    console.log("[Listener] On Created Socket: port", port);
  }

  function onSent(err, bytes) {
    if (err) {
      console.error(err);
      return;
    }

    console.log("[Response] On Sent: Wrote " + bytes + " bytes to socket.");
  }

  function onMessage(message, rinfo) {
    console.log("[Listener] On Message: " + message + " from " + rinfo.address + ":" + rinfo.port);
    server.send(message, 0, message.length, rinfo.port, rinfo.address, onSent);
  }

  function onListening() {
    var address = server.address();
    console.log("[Listener] On Listening: server listening " + address.address + ":" + address.port);
  }

  server = dgram.createSocket("udp4", onCreatedSocket)
  server.on("listening", onListening);
  server.on("message", onMessage);

  // This may throw if the port is already bound
  server.bind(port);
  // server listening 0.0.0.0:41234
}());

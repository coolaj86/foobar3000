// http://nodejs.org/docs/v0.4.11/api/dgram.html
(function () {
  "use strict";

  var dgram = require("dgram")
    , port = 32000
    , server
    ;

  function formatBody(data) {
    var body;

    body = data;

    if (data.error) {
      return data.error;
    }

    if ('string' !== typeof body) {
      body = JSON.stringify(body);
    }

    return body;
  }

  function parseJson(data) {
    var i = 0;

    while (/\s/.exec(String.fromCharCode(data[i]))) {
      i += 1;
    }

    if ('{' !== String.fromCharCode(data[i])) {
      return;
    }

    try {
      data = JSON.parse(data);
    } catch(e) {
      // ignore
      console.log('\t[Stream] JSON Parse Error');
      data = undefined;
    }

    return data;
  }

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

    var json
      , client
      ;

    function onRedial() {
      var message = new Buffer('[Info] Sent message to ' + rinfo.address + ':' + rinfo.port + '\n');
      server.send(message, 0, message.length, rinfo.port, rinfo.address, onSent);
    }

    json = parseJson(message);

    if (!json) {
      server.send(message, 0, message.length, rinfo.port, rinfo.address, onSent);
      return;
    }

    json.body = new Buffer(json.body && formatBody(json.body) || '[Error] must specify `body` to send\n');
    //console.log('JSON', json.body, json.body.length);

    if (json.redial) {
      // TODO On Error
      client = dgram.createSocket("udp4", onClientCreatedSocket);
      client.send(json.body, 0, json.body.length, parseInt(json.port) || rinfo.port, rinfo.address, onRedial);
    } else {
      server.send(json.body, 0, json.body.length, parseInt(json.port) || rinfo.port, rinfo.address, onSent);
    }
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

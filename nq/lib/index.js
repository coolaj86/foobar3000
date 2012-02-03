(function () {
  "use strict";

  // extends the Buffer prototype
  require('bufferjs');

  var connect = require('steve')
    , net = require('net')
    , udp = require('dgram')
    , UUID = require('node-uuid')
    , mainServer
    , DB = {}
    , listeners = {}
    , sdb = {}
    , servers = {}
    , UPLOAD_BYTE_LIMIT = 1 * 1024 * 1024
    , TOTAL_UPLOAD_BYTE_LIMIT = 10 * 1024 * 1024
    , LISTENER_STALETIME = 1 * 60 * 1000
    //, LISTENER_STALETIME = 10 * 60 * 1000
    ;

  DB.create = function () {
    var db = {};

    return {
        "get": function (key) {
          return db[key];
        }
      , "set": function (key, val) {
          db[key] = val;
        }
      , "delete": function (key) {
          delete db[key];
        }
    }
  };

  function getBodyData(req, res, next) {
    var chunks = []
      , size = UPLOAD_BYTE_LIMIT
      ;

    // TODO handle errors?
    req.on('data', function (chunk) {
      size -= chunk.length;

      if (!(size >= 0)) {
        req.pause();
        res.error("Exceeded upload limit of " + String(UPLOAD_BYTE_LIMIT) + " bytes");
        res.json();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', function (chunk) {
      req.body = Buffer.concat(chunks);
      next();
    });
  }

  listeners.http = function (cb, silo) {
    var server
      , port = silo.targetPort
      ;

    function abstractHttpAndStore(req, res) {
      var data = req.body || new Buffer(0)
        ;

      silo.add(data, {
          headers: req.headers
        , method: req.method
        , url: req.url
        , remoteAddress: req.socket.remoteAddress
        , remotePort: req.socket.remotePort
      });

      // send the request back empty
      res.json("got data");
    }

    function createServer() {
      return connect.createServer(
          function (req, res, next) {
            silo.keepAlive();
            next();
          }
        , getBodyData
        , abstractHttpAndStore
      )
    }
    server = createServer();
    server.on('error', silo.revelInBirth);
    server.listen(silo.targetPort, silo.revelInBirth);

    silo.server = server;
  };


  listeners.tcp = function (cb, silo) {
    var server
      , port = silo.targetPort
      ;

    function acceptClients(client) {
      var chunks = []
        ;

      function abstractTcpAndStore(data) {
        silo.add(data, {
            remoteAddress: client.remoteAddress
          , remotePort: client.remotePort
        });

        // send the request back empty
        // TODO mention port
        client.end("server closed successfully and port is available for use");
        console.log("server closed successfully and port is available for use");
      }

      silo.keepAlive();
      
      client.on('error', function (err) {
        client.destroy();
      });

      client.on('data', function (chunk) {
        chunks.push(chunk);
      });

      client.on('end', function () {
        abstractTcpAndStore(Buffer.concat(chunks));
      });
    }

    server = net.createServer(acceptClients);
    server.on('error', silo.revelInBirth);
    server.listen(silo.targetPort, silo.revelInBirth);

    silo.server = server;
  };

  function create(req, res, next) {
    var handler
      , protocol
      , port
      ;

    if (!/application\/json/i.exec(req.headers['content-type'])) {
      res.error("Content-Type (http header) is not set to 'application/json'");
      res.json();
      return;
    }

    if (!req.body) {
      res.error("request body is empty (or an empty string); it should contain JSON");
      res.json();
      return;
    }

    // negating > is better than < because it catches NaN as well
    port = parseInt(req.body.port, 10);
    if (!(port > 1023)) {
      res.error("The port must be a decimal integer >= 1024. The lower \"well known\" ports are reserved for system use. Octal and hex are not supported");
      res.json();
      return;
    }

    // HTTP: -> http, Tcp -> tcp
    protocol = String(req.body.protocol).toLowerCase().replace(/:$/, '');
    
    req.body.protocol = protocol + ':';
    req.body.port = port;

    function respond(err, params) {
      if (err) {
        res.error(err);
        res.json(params);
        return;
      }

      res.json(params);
    }

    createSilo(respond, protocol, port);
  }

  function createSilo(cb, protocol, port) {
    var uuid = UUID.v1()
      , silo = sdb[uuid] = {}
      , responseMeta = {
            "protocol": protocol
          , "port": port
        }
      , handler
      ;

    silo.targetPort = port;
    silo.uuid = uuid;
    silo.storageLength = 0;
    silo.requestIndex = 0;
    silo.requestIndexHead = 0;

    silo.add = function (data, meta) {
      silo.storageLength += data.length;
      while (!(silo.storageLength <= TOTAL_UPLOAD_BYTE_LIMIT)) {
        silo.remove();
      }

      meta.id = silo.requestIndex;
      meta.timestamp = Date.now();
      meta.length = data.length;

      silo[silo.requestIndex] = {
          data: data
        , meta: meta
      };

      silo.requestIndex += 1;
    };

    silo.revelInBirth = function (err) {
      var uuid = silo.uuid
        ;

      if (!err) {
        silo.keepAlive();
        responseMeta.resource = uuid;
      } else {
        silo.closeServer();
        uuid = undefined;
      }

      silo.server.removeListener('error', silo.revelInBirth);

      cb(err, responseMeta);
    };

    silo.keepAlive = function () {
      clearTimeout(silo.timeoutToken);
      silo.timeoutToken = setTimeout(silo.closeServer, LISTENER_STALETIME);
    }

    silo.closeServer = function (onServerClose) {
      clearTimeout(silo.timeoutToken);
      if (!silo.server) {
        if (onServerClose) {
          onServerClose("no server exists");
        }
        return;
      }

      // TODO targetPort
      console.info('closing server on ' + silo.targetPort);

      if (onServerClose) {
        silo.server.on('close', onServerClose);
      }

      silo.server.close();
      silo.destroy();
    }

    silo.remove = function (index) {
      var payload
        ;

      if (undefined === index || index === silo.requestIndexHead) {
        index = silo.requestIndexHead;
        silo.requestIndexHead += 1;
      }

      payload = silo[index];
      if (!payload) {
        return;
      }
      silo.storageLength -= payload.length;

      delete silo[index];
    };

    silo.destroy = function () {
      delete sdb[uuid];
    };

    handler = listeners[protocol];

    if (!handler) {
      cb("The protocol must be one of \"http:\", \"tcp:\", or \"udp:\". Note that the letters must be lowercase and have a trailing \":\"");
      return;
    }

    handler(function (err, params) {
      params.resource = err ? undefined : silo.uuid;
      cb(err, params);
    }, silo);
  }

  function hasGreaterTimestamp(a, b) {
    return (a.meta.timestamp > b.meta.timestamp) ? 1 : -1;
  }

  function isNumber(x) {
    // this simplistic test only works
    // for extremely simple, well-known data sets
    // do not copy this elsewhere
    return !isNaN(x);
  }

  function meta(req, res, next) {
    var uuid = req.params.resource
      , silo
      , metas
      ;

    // I'm not ready to commit to the idea that 'id'
    // will always be the same as the array index
    // (perhaps I'll switch to a uuid in the future)

    silo = sdb[uuid];

    if (!silo) {
      res.error("No listener exists for " + silo.uuid + ". Remember that unused listeners are deleted after " + LISTENER_STALETIME + "ms");
      res.json();
      return;
    }

    metas = [];
    Object.keys(silo)
      .filter(isNumber)
      .sort(hasGreaterTimestamp)
      .forEach(function (index) {
        metas.push(silo[index].meta);
      });
    
    res.json(metas);
  }

  function closeServer(req, res, next) {
    var silo = sdb[req.params.resource]
      ;

    if (!silo) {
      res.error("No listener exists for " + silo.uuid + ". Remember that unused listeners are deleted after " + LISTENER_STALETIME + "ms");
      res.json();
      return;
    }

    silo.closeServer(function () {
      // TODO tell which port
      res.json("server closed successfully and port is available for use");
    });
  }

  function get(req, res, next) {
    var silo
      , payload
      ;

    silo = sdb[req.params.resource];
    if (!silo) {
      res.error("No listener exists for " + silo.uuid + ". Remember that unused listeners are deleted after " + LISTENER_STALETIME + "ms");
      res.json();
      return;
    }

    payload = silo[req.params.index];
    if (!payload) {
      res.error("No payload exists at index " + silo.uuid + ".");
      res.json();
      return;
    }

    res.end(payload.data);
    silo.remove([req.params.index]);
  }

  function router(app) {
    app.post('/new', create);
    app.put('/new', create);
    app.get('/:resource', meta);
    app.delete('/:resource', closeServer);
    app.delete('/:resource/:index', get);
  }

  mainServer = connect.createServer(
      connect.bodyParser()
    , connect.router(router)
  );

  module.exports = mainServer;
}());

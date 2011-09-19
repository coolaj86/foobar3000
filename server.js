(function () {
  "use strict";

  require('bufferjs');

  require('./tcp-echo');
  require('./udp-echo');

  var config = require('./config')
    , connect = require('connect')
    , btoa = require('btoa')
    , url = require('url')
    , server
    , echoServer
    , whatsmyip
    , sessions = {}
    ;

  // clear out sessions occasionally
  setInterval(function () {
    Object.keys(sessions).forEach(function (sessionToken) {
      var session = sessions[sessionToken];
      if (Date.now() - session.timestamp >= 10 * 60 * 1000) {
        delete sessions[sessionToken];
      }
    });
  }, 10 * 60 * 1000);

  function randomize() {
    return 0.5 - Math.random();
  }

  function newToken() {
    return btoa(String(Date.now()).split('').sort(randomize).join('')).substr(0,16);
  }

  var ipcheck = /^\/(whatsmy|my|check)?ip($|\?|\/|#)/
    ;

  function echo(req, res, next) {
    var urlObj = {}
      , params
      , sessionToken
      , session
      , resHeaders
      , resBody
      ;

    console.log('Echo Echo Echo...');

    if (/GET/i.exec(req.method) && '/' === req.url && !req.body || /assets/.exec(req.url)) {
      return next();
    }

    // If the user just wants the IP address
    if (ipcheck.exec(req.url)) {
      res.setHeader('Content-Type', 'text/plain');
      res.end(req.socket.remoteAddress);
      return;
    }

    //
    // Parse QUERY and BODY
    //
    urlObj = url.parse(req.url, true, true);
    console.log(urlObj);
    delete urlObj.search;
    urlObj.httpVersion = req.httpVersion;
    urlObj.method = req.method;
    urlObj.headers = req.headers;
    urlObj.trailers = req.trailers;

    urlObj.remoteAddress = req.socket.remoteAddress;
    urlObj.remotePort = req.socket.remotePort;

    params = (!(req.body instanceof Buffer) && 'object' === typeof req.body && req.body) || urlObj.query;
    if (params.rawResponse) {
      params.raw = req.body;
    } else if (params.rawBody) {
      params.body = req.body || urlObj.body;
    }

    /*
    console.log(req.connection === req.socket); // true
    console.log(req.connection === req.client); // true
    console.log(req.client === req.socket); // true
    */

    // how can we determine these?
    urlObj.protocol = req.protocol || 'http:';
    urlObj.host = req.headers.host;
    urlObj.hostname = urlObj.host.split(':')[0];
    urlObj.port = urlObj.host.split(':')[1];

    urlObj.href = url.format(urlObj);


    // TODO If not params load index.html, else echo

    //
    // Set RAW
    //
    if (params.raw) {
      // the connection is most likely keepalive
      // calling .end is not necessary?
      res.socket.write(params.raw);
      return;
    }


    //
    // Get Session
    //
    sessionToken = params.session || req.headers['X-Foobar3k-Session'] || newToken();
    session = { headers: [], resources: {} };
    session = sessions[sessionToken] = sessions[sessionToken] || session;
    session.timestamp = Date.now();
    urlObj.session = sessionToken;
    res.setHeader('X-Foobar3k-Session', sessionToken);



    // If the user wants to post a resource to get later
    // TODO test against pathname instead?
    if (params.pathname && /^\/meta\/?(\?.*)?$/.exec(req.url)) {
      res.setHeader('content-type', 'application/json');

      if (/GET|DELETE/.exec(req.method)) {
        if (/DELETE/.exec(req.method)) {
          delete session.resources[params.pathname];
        }
        res.end(JSON.stringify({
            "error": false
          , "errors": []
          , "success": true
          , "resources": session.resources
          , "status": "ok"
        }));
        return;
      }

      // TODO OPTIONS, HEAD

      session.resources[params.pathname] = params;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
          "error": false
        , "errors": []
        , "success": true
        , "resource": params
        , "status": "ok"
      }));

      return;
    }

    // If this is a resource that the user previously posted
    // give it back now
    // TODO normalize trailing '/'
    if (urlObj.pathname && session.resources[urlObj.pathname]) {
      params = session.resources[urlObj.pathname];
    }


    //
    // Set HEADERS
    //
    function setHeader(header) {
      var key = (header.split(':')[0]||'').trim()
        , val = (header.split(':')[1]||'').trim()
        ;

      if (val) {
        res.setHeader(key, val);
      } else {
        res.removeHeader(key, val);
      }
    }
    // for all requests with this session
    session.headers = params.defaultHeaders || session.headers;
    session.headers.forEach(setHeader);
    resHeaders = params.headers || [];
    resHeaders = Array.isArray(resHeaders) ? resHeaders : [resHeaders];
    resHeaders.forEach(setHeader);


    //
    // set STATUS
    //
    res.statusCode = params.status || res.statusCode;


    //
    // Set BODY
    //
    resBody = params.body || urlObj;
    /*
    if (/HEAD|OPTIONS/.exec(req.method)) {
      resBody = undefined;
    }
    */
    if (resBody === urlObj) {
      if (!res.getHeader('content-type')) {
        res.setHeader('content-type', 'application/json');
      }
      console.log('!rawBody', urlObj);
      res.end(JSON.stringify(urlObj, null, '  '));
    } else {
      console.log('rawBody');
      res.end(resBody);
    }
  }

  function bodySnatcher(req, res, next) {
    var data = []
      ;

    if (req.body || !(req.headers['transfer-encoding'] || req.headers['content-length'])) {
      console.log('No Body');
      return next();
    }

    req.on('data', function (chunk) {
      data.push(chunk);
    });

    req.on('end', function () {
      req.body = Buffer.concat(data);
      console.log('Has Body');
      next();
    });
  }

  server = connect.createServer(
      function (req, res, next) {
        console.log('Echo Blah');
        console.log(req.subdomains);
        next();
      }
    , connect.favicon()
    , connect.bodyParser()
    , bodySnatcher
    , echo
    , connect.static(__dirname + '/')
  );

  echoServer = connect.createServer(
      function (req, res, next) {
        console.log('Echo Server');
        next();
      }
    , connect.favicon()
    , connect.bodyParser()
    , bodySnatcher
    , echo
  );

  /*
    server.listen(config.port);
    console.log('Started on ' + config.port || 80);
  */

  whatsmyip = connect.createServer(function (req, res, next) {
    // yes, it's that simple
    res.setHeader('Content-Type', 'text/plain');
    res.end(req.socket.remoteAddress);
  });

  // TODO enhance vhost with regex checkin'
  var middleware
    ;

  middleware = [];

  // TODO inspect subdomains instead of using vhost a second time
  middleware = middleware.concat([
    , connect.vhost('whatsmyip.*', whatsmyip)
    , connect.vhost('checkip.*', whatsmyip)
    , connect.vhost('myip.*', whatsmyip)
    , connect.vhost('ip.*', whatsmyip)
    , connect.vhost('*helloworld3000', server)
    , connect.vhost('*foobar3000', server)
    , connect.vhost('*', server)
  ]);

  module.exports = connect.createServer.apply(connect, middleware);

  try {
    module.exports.listen(8080);
  } catch(e) {
    console.warn('[WARN] probably already bound on 8080');
  }
}());

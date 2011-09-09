(function () {
  "use strict";

  var connect = require('connect')
    , btoa = require('btoa')
    , url = require('url')
    , server
    , port = 8000
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


  function echo(req, res, next) {
    var urlObj = {}
      , sessionToken
      , session
      , resHeaders
      , resBody
      , rawBody
      ;

    console.log('Echo Echo Echo...');


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
    urlObj.body = req.body;

    urlObj.remoteAddress = req.socket.remoteAddress;
    urlObj.remotePort = req.socket.remotePort;

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


    //
    // Get Session
    //
    sessionToken = urlObj.query.session || (urlObj.body && urlObj.body.session) || req.headers['X-Foobar3k-Session'] || newToken();
    session = { headers: [] };
    session = sessions[sessionToken] = sessions[sessionToken] || session;
    session.timestamp = Date.now();
    urlObj.session = sessionToken;
    res.setHeader('X-Foobar3k-Session', sessionToken);


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
    session.headers = urlObj.query.defaultHeaders || urlObj.body && urlObj.body.defaultHeaders || [];
    session.headers.forEach(setHeader);
    resHeaders = (urlObj.query.headers) || (urlObj.body && urlObj.body.headers) || session.headers;
    resHeaders = Array.isArray(resHeaders) ? resHeaders : [resHeaders];
    resHeaders.forEach(setHeader);


    //
    // Set RAW
    //
    rawBody = (urlObj.query.raw) || (urlObj.body && urlObj.body.raw) || undefined;
    if (rawBody) {
      // the connection is most likely keepalive
      // calling .end is not necessary?
      res.socket.write(rawBody);
      return;
    }


    //
    // Set BODY
    //
    resBody = (urlObj.query.body) || (urlObj.body && urlObj.body.body) || urlObj;
    /*
    if (/HEAD|OPTIONS/.exec(req.method)) {
      resBody = undefined;
    }
    */
    if (resBody === urlObj) {
      if (!res.getHeader('content-type')) {
        res.setHeader('content-type', 'application/json');
      }
      console.log(urlObj);
      res.end(JSON.stringify(urlObj, null, '  '));
    } else {
      res.end(resBody);
    }
  }


  server = connect.createServer(
      function (req, res, next) {
        console.log('Echo Blah');
        next();
      }
    , connect.favicon()
    , connect.bodyParser()
    , connect.static(__dirname + '/')
    , echo
  );

  server.listen(port);
  console.log('Started on ' + port);

  module.exports = server;
}());

(function () {
  "use strict";
  
  var server = require('./lib/index')
    , connect = require('steve')
    , port = 8877
    , bigServer
    ;

  bigServer = connect.createServer();
  bigServer.use('/nq', server);

  bigServer.listen(port, function () {
    console.log('listening on', port);
  });
}());

// Developed independently from
// http://www.gnucitizen.org/blog/javascript-port-scanner/
// but later rewritten and hence has some influence
//
// Also check FTP?
// http://www.gearthhacks.com/forums/showthread.php?11243-using-FTP-in-IMG-SRC
//
// How many requests
// http://stackoverflow.com/questions/561046/how-many-concurrent-ajax-xmlhttprequest-requests-are-allowed-in-popular-browser
// http://www.stevesouders.com/blog/2008/03/20/roundup-on-parallel-connections/
//
// http://stackoverflow.com/questions/930237/javascript-cancel-stop-image-requests
(function () {
  "use strict";

  var $ = require('ender')
    , request = require('ahr2')
    , Image = require('Image')
    ;

  function ping(options, cb) {
    var img = new Image()
      , timeout = options.timeout || 2000
      , protocol = options.protocol || (options.secure || '443' === options.port) ? 'https:' : 'http:' // TODO ftp
      , hostname = options.hostname
      , port = options.port
      , href = options.href
      , complete = false
      , timeoutToken = 0
      ;

    function onComplete(timeout, loaded) {
      if (complete) {
        return;
      }
      complete = true;

      clearTimeout(timeoutToken);

      cb(timeout, loaded);
    }

    function onError() {
      onComplete(null, false);
    }

    function onLoad() {
      onComplete(null, true);
    }

    function onTimeout() {
      onComplete(true, false);
    }

    if ('string' === typeof options) {
      href = options;
    }

    if (!href) {
      href = (protocol + '//' + hostname + ':' + port + (options.pathname || ''));
    }

    timeoutToken = setTimeout(onTimeout, timeout);
    img.onerror = onError;
    img.onload = onLoad;
    img.src = href;
  }

  // turn 1; 1-3; 1,3; 1,2-5,6; etc into lists
  // naturalNumberList("1");
  // naturalNumberList("1-4");
  // naturalNumberList("1,4");
  // naturalNumberList("1,4,5-9");
  function naturalNumberList(list) {
    var numbers = []
      ;

    list.split(',').forEach(function (range) {
      var start
        , end
        , subset = []
        ;

      end = range.split('-');
      start = parseInt((end[0]||'').trim(), 10);
      end = parseInt((end[1]||'').trim(), 10);

      if (!start) {
        return;
      }

      if (!end) {
        end = start;
      }

      if (!(start <= end)) {
        return;
      }

      while (start < end + 1) {
        numbers.push(start);
        start += 1;
      }
    });

    return numbers;
  }

  function log(err, loaded) {
    console.log('failed:', err, 'loaded:', loaded);
  }

  ping({ hostname: '192.168.1.1', port: '80' }, log);
  ping({ hostname: '192.168.1.1', port: '70' }, log);
  ping({ hostname: '192.168.1.1', port: '3000' }, log);
  ping({ hostname: '192.168.1.111', port: '80' }, log);
  ping({ hostname: 'example.com', port: '80' }, log);

  function onDomReady() {
    $('body').delegate('form#ping', 'submit', function (ev) {
      ev.preventDefault();

      ping({
          hostname: $('form#ping input[name=hostname]').val()
        , port: $('form#ping input[name=port]').val()
      }, log);
    });

    $('body').delegate('form#ipscan', 'submit', function (ev) {
      ev.preventDefault();

      var port = $('form#ping input[name=port]').val()
        , ipNetwork = $('form#ping input[name=ip-network]').val()
        , ipRange = $('form#ping input[name=ip-range]').val()
        ;

      if (!(startIp < endIp) || !(startIp < 255) || !(endIp > 0)) {
        alert('IP address must be between 1 and 254');
      }

      function pingEachNumber(ip) {
        ping({
            hostname: ipNetwork + '.' + ip
          , port: port
        }, log);
      }

      naturalNumberList(ipRange).forEach(pingEachNumber);
    });
  }

  $.domReady(onDomReady);
}());

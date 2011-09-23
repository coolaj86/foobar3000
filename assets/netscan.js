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

  require('Array.prototype.forEachAsync');

  var $ = require('ender')
    , EventEmitter = require('events.node').EventEmitter
    , Future = require('future')
    , Join = require('join')
    , request = require('ahr2')
    , Image = require('Image')
    , window = require('window')
    ;

/*
  window.onerror = function (a, b, c) {
    console.error('window.onerror', a, b, c);
  };
*/

  function ping(options) {
    var future = Future()
      , img = new Image()
      , timeout = options.timeout || 500
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

      future.fulfill(timeout, loaded);
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
      href = (protocol + '//' + hostname + ':' + port + (options.pathname || '/favicon.ico'));
    }

    timeoutToken = setTimeout(onTimeout, timeout);
    img.onerror = onError;
    img.onload = onLoad;
    img.src = href;

    return future.passable();
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

  /*
  ping({ hostname: '192.168.1.1', port: '80' }, log);
  ping({ hostname: '192.168.1.1', port: '70' }, log);
  ping({ hostname: '192.168.1.1', port: '3000' }, log);
  ping({ hostname: '192.168.1.111', port: '80' }, log);
  ping({ hostname: 'example.com', port: '80' }, log);
  */
  // http://www.techspot.com/guides/287-default-router-ip-addresses/
  /*
    3Com  192.168.1.1
    Apple 10.0.1.1
    Asus  192.168.1.1, 192.168.1.220
    Belkin  192.168.2.1, 10.1.1.1
    Buffalo 192.168.11.1
    Dell  192.168.1.1
    D-Link  192.168.0.1, 0.30, 0.50, 1.1, 10.1.1.1
    Linksys 192.168.0.1, 1.1
    Microsoft 192.168.2.1
    Motorola  192.168.10.1, 20.1, 30.1, 62.1, 100.1, 102.1, 1.254
    MSI 192.168.1.254
    Netgear 192.168.0.1, 0.227
    Senao 192.168.0.1
    SpeedTouch  10.0.0.138, 192.168.1.254
    Trendnet  192.168.0.1, 1.1, 2.1, 10.1,
    U.S. Robotics 192.168.1.1, 2.1, 123.254
    Zyxel 192.168.1.1, 2.1, 4.1, 10.1, 1.254, 10.0.0.2, 0.138
    Ubuntu ICS , "10.42.43.1"
    Apple ICS , "192.168.2.1"
  */
  var commonRouterAddresses
    ;
 
  commonRouterAddresses = [
      "192.168.0.1"
    , "192.168.1.1"
    , "192.168.2.1"
    , "192.168.25.1"
    , "10.1.1.1"
    , "10.0.1.1"
    , "10.0.0.1"
  ];

  // http://stackoverflow.com/questions/5018566/catching-xmlhttprequest-cross-domain-errors
  // http://stackoverflow.com/questions/4844643/is-it-possible-to-trap-cors-errors
  //
  // xhr.onerror might catch an error that xhr.addEventListener('error') may not
  function testConnection(ip) {
    var future = Future()
      ;

    request.get('http://' + ip + '/give-me-404-please', null, {
        timeout: 500
    }).when(function (err, ahr, data) {
      if (data) {
        console.log('web data', data);
        future.fulfill(null, true);
      } else {
        future.fulfill(true);
      }
    });

    return future.passable();
  }

  function createScanner(ips, corsScan) {
    var future = Future()
      , emitter = new EventEmitter()
      , found = []
      ;

    emitter.when = future.when;
    emitter.on('data', function (ip) {
      found.push(ip);
    });
    emitter.on('end', function () {
      future.fulfill(null, found);
    })

    ips.forEachAsync(function (next, ip, i) {
      var port = 80
        , future
        ;
      // Why port 42? It's arbitrary
      // A request port 80 may come up with http auth
      // A request to port 42 probably won't
      // However, port 42 will likely be refused except
      // by some firewalls that drop rather than rejecting
      // so we can still tell if the host exists
      // without triggering http auth
      if (corsScan) {
        future = testConnection(ip)
      } else {
        future = ping({ hostname: ip, port: port });
      }

      future.when(function (err, loaded) {
        console.log(ip, err, loaded);
        if (!err) { // || loaded) {
          emitter.emit('data', ip);
        }
        emitter.emit('progress', { loaded: i, total: ips.length });
        next();
      });
    }).then(function () {
      emitter.emit('progress', { loaded: ips.length, total: ips.length });
      emitter.emit('end');
    });

    return emitter;
  }

  // todo calculate with netmask
  function allAddressesOnSameNetwork(ip, list) {
    var ipOctets = ip.split('.')
      , ipNetwork
      , nums = naturalNumberList(list || "1-254")
      , ips = []
      ;

    // throw away last octet
    ipOctets.pop();
    ipNetwork = ipOctets.join('.');
    nums.forEach(function (num) {
      ips.push(ipNetwork + '.' + num);
    });
    return ips;
  }

  function handleScan(ips) {
    var emitter;

    emitter = createScanner(ips);
    emitter.on('data', function (ip) {
      console.log('Oh Happy Day! ', ip);
    });
    emitter.on('progress', function (progress) {
      console.log((progress.loaded / progress.total * 100).toFixed(1) + '%');
    });
    emitter.when(function (err, found) {
      console.log('Completed Scan', found);
    });
  }


  function onDomReady() {
    var routerListTpl = $('#router-list').html().trim()
      , routerList = []
      , deviceListTpl = $('#device-list').html().trim()
      , deviceList = []
      ;


    function populateRouterList() {
      $('#router-list').html('');
      routerList.forEach(function (ip) {
        var routerItem = $(routerListTpl);
        routerItem.find('.router-address').html(ip)

        $('#router-list').append(routerItem);
      });
    }

    function populateDeviceList() {
      $('#device-list').html('');
      deviceList.forEach(function (ip) {
        var deviceItem = $(deviceListTpl);
        deviceItem.find('.device-address').html(ip)

        $('#device-list').append(deviceItem);
      });
    }

    function handleRouterScan(ips) {
      var emitter;

      emitter = createScanner(ips);
      emitter.on('data', function (ip) {
        routerList.push(ip);
        populateRouterList();
      });
      emitter.on('progress', function (progress) {
    //$('#router-stuff progress').attr('max', commonRouterAddresses.length);
        $('#router-stuff progress')
          .attr('max', progress.total)
          .attr('value', progress.loaded)
          ;
        
        console.log((progress.loaded / progress.total * 100).toFixed(1) + '%');
      });
      emitter.when(function (err, found) {
        console.log('Completed Scan', found);
      });
    }

    function handleDeviceScan(ips) {
      var emitter;

      emitter = createScanner(ips, true);
      emitter.on('data', function (ip) {
        deviceList.push(ip);
        populateDeviceList();
      });
      emitter.on('progress', function (progress) {
    //$('#router-stuff progress').attr('max', commonRouterAddresses.length);
        $('#router-stuff progress')
          .attr('max', progress.total)
          .attr('value', progress.loaded)
          ;
        
        console.log((progress.loaded / progress.total * 100).toFixed(1) + '%');
      });
      emitter.when(function (err, found) {
        console.log('Completed Scan', found);
      });
    }

    $('body').delegate('form#router-finder', 'submit', function (ev) {
      ev.preventDefault();

      console.log('Beginning Scan');
      handleRouterScan(commonRouterAddresses);
    });

    $('body').delegate('form#device-finder', 'submit', function (ev) {
      ev.preventDefault();

      var ip = $('form#device-finder input[name=router-ip]').val()
        , ips = allAddressesOnSameNetwork(ip)
        ;

      console.log('Beginning Scan of ' + ip + '\'s network');
      handleScan(ips);
    });

    $('body').delegate('ul#router-list button', 'click', function () {
      
      var ip = $(this).closest('li').find('.router-address').html().trim()
        , ips = allAddressesOnSameNetwork(ip, "14-30")
        ;

      console.log('Beginning Scan of ' + ip + '\'s network');
      handleDeviceScan(ips);
    });

    $('body').delegate('ul#device-list button', 'click', function () {
      var ip = $(this).closest('li').find('.device-address').html().trim()
        ;

      window.open('http://' + ip + '/', 'device-' + ip, "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes");
    });

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

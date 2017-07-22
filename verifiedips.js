
const proxies0 = [
    { ip: 'localhost' },
{"ip":"180.97.235.30","port":"80","speed":133},
{"ip":"101.200.44.5","port":"8888","speed":271},
{"ip":"111.13.2.131","port":"80","speed":295},
{"ip":"120.77.154.246","port":"3128","speed":320},

{"ip":"111.13.7.116","port":"80","speed":296},
{"ip":"220.248.229.45","port":"3128","speed":189},
{"ip":"111.13.141.99","port":"80","speed":333},
{"ip":"218.201.98.196","port":"3128","speed":386},

{"ip":"120.27.211.217","port":"3128","speed":114},
{ ip: '115.29.2.139', port: '80', speed: 115 },
{ ip: '122.13.15.8', port: '80', speed: 290 },
{ ip: '202.108.14.87', port: '8080', speed: 306 },
{ ip: '183.232.223.10', port: '80', speed: 309 },
{ ip: '111.13.7.121', port: '80', speed: 309 },
{ ip: '111.13.7.118', port: '80', speed: 323 },
{ ip: '14.29.92.8', port: '80', speed: 339 },
{ ip: '111.13.109.27', port: '80', speed: 344 },
{ ip: '122.13.15.10', port: '80', speed: 370 },
{"ip":"61.152.81.193","port":"9100","speed":588},
{"ip":"111.155.116.236","port":"8123","speed":712},
{ ip: '111.13.7.117', port: '80', speed: 1420 }


];
exports.proxies0 = proxies0;

const proxies1 = [

    { ip: '111.13.7.123', port: '80', speed: 330 },
    
    { ip: '183.232.223.8', port: '80', speed: 352 },
    { ip: '183.232.223.9', port: '80', speed: 355 },
    {"ip":"111.207.228.252","port":"8080","speed":351},
    {"ip":"180.106.37.111","port":"8118","speed":449},

      {"ip":"119.9.105.210","port":"9000","speed":667}
    , { ip: '111.13.2.138', port: '80', speed: 339 }
    , { ip: '111.13.7.120', port: '80', speed: 342 }
    , { ip: '111.13.7.122', port: '80', speed: 342 }
    
    , { "ip": "42.51.26.79", "port": "3128", "speed": 361 }
    , { "ip": "1.82.216.135", "port": "80", "speed": 445 }
    , { "ip": "221.202.251.217", "port": "8118", "speed": 706 }
    , { ip: '111.13.7.119', port: '80', speed: 349 }
    , { ip: '122.13.15.9', port: '80', speed: 289 }
    , { "ip": "223.68.1.38", "port": "8000", "speed": 721 }
    , { "ip": "117.176.62.148", "port": "3128", "speed": 900 }
    , { "ip": "118.190.14.107", "port": "3128", "speed": 951 }
    , {"ip":"139.129.94.241","port":"3128","speed":174}
    
    , {"ip":"123.56.142.9","port":"8080","speed":282}
    , { "ip": "119.29.126.115", "port": "80", "speed": 388 }
    , { "ip": "1.82.216.134", "port": "80", "speed": 435 }
    , { ip: '166.111.77.32', port: '80', speed: 357 }
    , { ip: '111.13.7.121', port: '80', speed: 358 }
    , { ip: '218.106.205.145', port: '8080', speed: 658 }

    ,{ "ip": "223.83.130.38", "port": "3128", "speed": 239 }
    , {"ip":"59.111.80.139","port":"80","speed":112}
    
, { ip: '116.225.10.56', port: '9797', speed: 5775 }
];
exports.proxies1 = proxies1;

const proxymap = {};
exports.proxyMap = proxymap;


function dedupe(proxies) {
    proxies.forEach(function (item) {
        if (!proxymap[item.ip]) {
            proxymap[item.ip] = item;
        } else {
            console.log("duplicated ip", item);
        }
    });
}

dedupe(proxies0);
dedupe(proxies1);

const proxies0 = [
    { ip: 'localhost' }
    , { ip: '115.29.2.139', port: '80', speed: 87 }
    , { ip: '61.160.233.8', port: '80', speed: 232 }
    , { ip: '122.13.15.10', port: '80', speed: 289 }
    , { ip: '122.13.15.9', port: '80', speed: 289 }
    , { ip: '183.232.223.10', port: '80', speed: 304 }
    , { ip: '202.108.14.87', port: '8080', speed: 306 }
    , { ip: '183.232.223.8', port: '80', speed: 320 }
    , { ip: '183.232.223.9', port: '80', speed: 323 }
    , { ip: '122.13.15.8', port: '80', speed: 329 }
    , { ip: '111.13.7.123', port: '80', speed: 330 }
    , { ip: '111.13.2.138', port: '80', speed: 339 }
    , { ip: '111.13.7.120', port: '80', speed: 342 }
    , { ip: '111.13.7.122', port: '80', speed: 342 }

];
exports.proxies0 = proxies0;

const proxies1 = [
    { ip: 'localhost' }
    , { ip: '111.13.7.118', port: '80', speed: 347 }
    , { ip: '111.13.7.117', port: '80', speed: 348 }
    , { ip: '111.13.7.119', port: '80', speed: 349 }
    , { ip: '111.13.109.27', port: '80', speed: 354 }
    , { ip: '166.111.77.32', port: '80', speed: 357 }
    , { ip: '111.13.7.121', port: '80', speed: 358 }
    , { ip: '14.29.92.8', port: '80', speed: 375 }
    , { ip: '111.13.7.116', port: '80', speed: 516 }
    , { ip: '120.132.71.212', port: '80', speed: 588 }
    , { ip: '218.106.205.145', port: '8080', speed: 658 }
    , { "ip": "61.152.81.193", "port": "9100", "speed": 1088 }
    , { ip: '111.155.124.70', port: '8123', speed: 1583 }
    , { ip: '119.23.77.146', port: '8080', speed: 15057 }
    , { ip: '111.155.116.217', port: '8123', speed: 2338 }
    , { ip: '111.155.116.233', port: '8123', speed: 3129 }
    , { ip: '111.155.124.81', port: '8123', speed: 568 }
    , { ip: '116.225.10.56', port: '9797', speed: 5775 }
    , { ip: '111.155.116.209', port: '8123', speed: 710 }

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
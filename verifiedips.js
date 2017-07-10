const proxies0 = [
    { ip: 'localhost' }
    , { "ip": "61.152.81.193", "port": "9100", "speed": 490 }
    , { ip: '115.29.2.139', port: '80', speed: 88 }
    , { ip: '61.160.233.8', port: '80', speed: 231 }
    , { ip: '202.108.14.87', port: '8080', speed: 301 }
    , { ip: '183.232.223.10', port: '80', speed: 309 }
    , { ip: '119.23.77.146', port: '8080', speed: 310 }
    , { ip: '14.29.92.8', port: '80', speed: 314 }
    , { ip: '183.232.223.8', port: '80', speed: 325 }
    , { ip: '111.13.7.122', port: '80', speed: 338 }
    , { ip: '111.13.7.117', port: '80', speed: 342 }
    , { ip: '111.13.7.120', port: '80', speed: 342 }
    , { ip: '111.13.7.118', port: '80', speed: 343 }
    , { ip: '111.13.2.138', port: '80', speed: 344 }
    , { ip: '111.13.7.119', port: '80', speed: 348 }
    , { ip: '183.232.223.9', port: '80', speed: 349 }
    , { ip: '111.13.7.123', port: '80', speed: 353 }
    , { ip: '111.13.7.121', port: '80', speed: 361 }
    , { ip: '111.13.109.27', port: '80', speed: 366 }
    , { ip: '183.245.147.10', port: '135', speed: 418 }
    , { ip: '111.13.7.116', port: '80', speed: 528 }
    , { ip: '218.106.205.145', port: '8080', speed: 663 }
    , { ip: '120.132.71.212', port: '80', speed: 766 }
    , { ip: '122.13.15.9', port: '80', speed: 886 }
    , { ip: '166.111.77.32', port: '80', speed: 942 }
];
exports.proxies0 = proxies0;

const proxies1 = [
    { "ip": "180.173.109.149", "port": "8118", "speed": 392 },
    { "ip": "101.86.86.101", "port": "8118", "speed": 307 },
    { "ip": "61.160.233.8", "port": "80", "speed": 409 },
    { "ip": "180.118.32.212", "port": "808", "speed": 458 },
    { "ip": "113.121.255.71", "port": "808", "speed": 613 },
    { "ip": "218.173.149.16", "port": "53281", "speed": 718 },
    { "ip": "123.163.129.44", "port": "808", "speed": 2889 },
    { "ip": "116.225.10.56", "port": "9797", "speed": 5775 },
    { "ip": "220.179.99.56", "port": "808", "speed": 675 },
    { ip: '111.13.109.27', port: '80', speed: 279 }
    , { ip: '115.29.2.139', port: '80', speed: 306 }
    , { ip: '183.232.223.8', port: '80', speed: 398 }
    , { ip: '119.23.77.146', port: '8080', speed: 414 }
    , { ip: '122.13.15.10', port: '80', speed: 424 }
    , { ip: '122.13.15.8', port: '80', speed: 429 }
    , { ip: '122.13.15.9', port: '80', speed: 482 }
    , { ip: '183.232.223.9', port: '80', speed: 489 }
    , { ip: '183.232.223.10', port: '80', speed: 506 }
    , { ip: '111.155.124.81', port: '8123', speed: 568 }
    , { ip: '111.155.124.70', port: '8123', speed: 618 }
    , { ip: '111.155.116.209', port: '8123', speed: 710 }
    , { ip: '111.155.116.217', port: '8123', speed: 2338 }
    , { ip: '111.155.116.233', port: '8123', speed: 3129 }
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
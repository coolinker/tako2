// :7305
// 36.26.145.238:7305
// 36.26.146.33:7305
// 36.26.148.37:7305
// 36.26.150.151:7305
// 36.26.151.57:7305
// 36.26.147.179:7305
// 36.26.145.109:7305
// 36.26.146.71:7305
// 36.26.148.233:7305

const proxies = [{
    ip: '36.26.144.99',
    port: '7305'
}, {
    ip: '36.26.146.33',
    port: '7305'
}, {
    ip: '36.26.148.37',
    port: '7305'
}, {
    ip: '36.26.150.151',
    port: '7305'
}, {
    ip: '36.26.151.57',
    port: '7305'
}, {
    ip: '36.26.147.179',
    port: '7305'
}, {
    ip: '183.245.147.10',
    port: '135'
}, {
    ip: '218.106.205.145',
    port: '8080'
}, {
    ip: '119.84.15.210',
    port: '9001'
}];

const REUSE_INTERVAL = 30 * 60 * 1000;
let currentIndex = 0;

exports.next = next;
function next() {
    currentIndex++;
    if (currentIndex >= proxies.length) currentIndex = 0;
    console.log("next proxy", currentIndex);
    const cur = getCurrent();

    if (!cur || cur.time && new Date() - cur.time < REUSE_INTERVAL) return null;
    return cur;
}

function getCurrent() {
    const n = proxies[currentIndex];
    return n;
}

exports.getCurrentUrl = getCurrentUrl;
function getCurrentUrl(type) {
    type = type || 'http';
    const n = getCurrent();
    if (!n) return null;
    n.time = new Date();
    return type + '://' + n.ip + ':' + n.port;
}
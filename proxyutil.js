let proxies;

const REUSE_INTERVAL = 5 * 60 * 1000;
let currentIndex = 0;

exports.config = config;
function config(pid){
    proxies = require('./verifiedips.js')[pid];
    return this;
}

exports.next = next;
function next() {
    currentIndex++;
    if (currentIndex >= proxies.length) currentIndex = 0;
    const cur = getCurrent();
    console.log("next proxy", currentIndex, cur);

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
    return n.ip.indexOf('http')>=0 ? ( n.ip + ':' + n.port) : (type + '://' + n.ip + ':' + n.port);
}


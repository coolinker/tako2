const simplehttp = require('./simplehttp');
const proxyMap = require('./verifiedips.js').proxyMap;
const htmlparser = require('./htmlparser');
const transferjob = require('./transfer');
const util = require('util');
var exitHook = require('exit-hook');

exitHook(function (e) {
    console.log('exiting------------', e);
});

const fs = require('fs');
const EOL = process.platform === 'win32' ? '\r\n' : '\n';

function randomNumber() {
    return Math.round(Math.random() * 100000);
}
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRawIPs(cities) {
    let all = [];
    for (let i = 0; i < cities.length; i++) {
        const ips = await getCityRawIPs(cities[i]);
        console.log(cities[i], ips.length, 'IPs');
        all = all.concat(ips);
    }
    console.log("raw ips all:", all.length)
    return all;
}

async function getCityRawIPs(city) {
    const options = {
        timeout: 2000
    };

    //%C9%CF%BA%A3

    const { err, res, body } = await simplehttp.GET('http://www.66ip.cn/nmtq.php?getnum=100&isp=0&anonymoustype=0&start=&ports=&export=808&ipaddress='
        + city + '&area=1&proxytype=1&api=66ip', options);

    const availablePrt = htmlparser.getValueFromBody('var sogou_ad_width=960;', '</div>', body);
    const arr = availablePrt.split('\r\n');
    const ips = [];
    for (let i = 0; i < arr.length; i++) {
        const m = arr[i].match(/(\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,10})/);
        if (!m) continue;
        ips.push(m[0]);
    }

    return ips;
}

async function verifyIP(ip) {
    console.log("\r\nveirfying...", ip)
    let timecost = 0;
    const c = 3;
    for (let i = 0; i < c; i++) {
        const s = new Date();
        try {
            const re = await transferjob.listTransferM3024('http://' + ip, true);
        } catch (e) {
            return null;
        }

        // if (util.isString(re)) {
        //     return null;
        // }

        timecost += new Date() - s;
    }

    return Math.round(timecost / c);

}

async function test() {
    try {
        /**
         * 
         *北京:%B1%B1%BE%A9, 上海:%C9%CF%BA%A3,
         *浙江:%D5%E3%BD%AD, 江苏:%BD%AD%CB%D5, 安徽:%B0%B2%BB%D5
         *广东:%B9%E3%B6%AB，福建:%B8%A3%BD%A8
        */
        const ips = await getRawIPs(['%C9%CF%BA%A3', '%B1%B1%BE%A9', '%BD%AD%CB%D5', '%D5%E3%BD%AD', '%B8%A3%BD%A8' ]);
        const arr = [];
        console.log("ips:", ips.length);
        for (let i = 0; i < ips.length; i++) {
            const ip = ips[i];
            const t = await verifyIP(ip);
            if (t) {
                const sub = ip.split(':');
                arr.push({ ip: sub[0], port: sub[1], speed: t });
            }
            console.log(ip, t, 'ms');
        }

        arr.sort(function (i1, i2) {
            return i1.speed - i2.speed;
        });

        console.log('---------------------');
        arr.forEach(function (i) {
            if (proxyMap[i.ip]) {
                console.log("ip existed:", i);
                return;
            }

            proxyMap[i.ip] = i;
            console.log(JSON.stringify(i) + ',');
        })

    } catch (e) {
        console.log("e", e)
    }

}

test();


async function verifyIPsTxt(file) {
    let ips = fs.readFileSync(file, 'utf-8');
    const verified = [];
    const map = {};

    ips = ips.split(EOL);
    for (let i = 0; i < ips.length; i++) {
        ip = ips[i].trim();
        const m = ip.match(/(\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,10})/);
        if (!m) continue;
        ip = m[0];
        const options = {
            start: new Date(),
            timeout: 1000,
            proxyip: ip,
            proxy: 'http://' + ip
        };

        // const { err, res, body } = await simplehttp.GET('https://user.lu.com/user/login', options);
        console.log('\r\nVerifying...', ip)
        simplehttp.GET('https://user.lu.com/user/service/parameter/get-parameter?name=loginswitch&_=' + randomNumber(), options).then(function ({ err, res, body }) {

            if (!err) {

                const t = new Date() - res.request.__options.start;
                const proxy = res.request.__options.proxyip;
                console.log(t, 'ms', proxy);
                if (body.indexOf('成功') < 0) {
                    console.log(body)
                    return;
                }

                if (!map[proxy]) {
                    const ipport = proxy.split(':');
                    verified.push({
                        ip: ipport[0],
                        port: ipport[1],
                        speed: t
                    })
                }
            } else {
                //console.log(err.code, err.__options._proxy)
            }
        });

        await timeout(1000);

    }
    await timeout(1000);
    return verified;

}


async function verifyIPsJSON(file) {
    let ips = fs.readFileSync(file, 'utf-8');
    const verified = [];
    const map = {};

    ips = JSON.parse(ips);
    for (let i = 0; i < ips.length; i++) {
        const prx = ips[i];
        const options = {
            start: new Date(),
            timeout: 1000,
            proxyjson: prx,
            proxy: 'http://' + prx.ip + ':' + prx.port
        };

        // const { err, res, body } = await simplehttp.GET('https://user.lu.com/user/login', options);
        console.log('\r\nVerifying...', prx)
        simplehttp.GET('https://user.lu.com/user/service/parameter/get-parameter?name=loginswitch&_=' + randomNumber(), options).then(function ({ err, res, body }) {

            if (!err) {

                const t = new Date() - res.request.__options.start;
                const proxy = res.request.__options.proxyjson;
                console.log(t, 'ms', proxy);
                if (body.indexOf('成功') < 0) {
                    console.log(body)
                    return;
                }

                if (!map[proxy.ip]) {
                    verified.push({
                        ip: proxy.ip,
                        port: proxy.port,
                        speed: t
                    })
                }
            } else {
                //console.log(err.code, err.__options._proxy)
            }
        });

        await timeout(1000);

    }
    await timeout(1000);
    return verified;

}

async function main(filename) {
    const v = filename.indexOf('.json') > 0 ? await verifyIPsJSON(filename) : await verifyIPsTxt(filename);
    v.sort(function (i1, i2) {
        return i1.speed - i2.speed;
    })
    console.log('---------------------');
    v.forEach(function (i) {
        if (proxyMap[i.ip]) {
            console.log("ip existed:", i);
            return;
        }

        proxyMap[i.ip] = i;
        console.log(JSON.stringify(i) + ',');
    })

}

// try {
//     let filename = process.argv[2];
//     main(filename);
// } catch (e) {
//     console.log(e);
// }


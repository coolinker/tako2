const simplehttp = require('./simplehttp');
const proxyMap = require('./verifiedips.js').proxyMap;

const fs = require('fs');
const EOL = '\r\n';

function randomNumber() {
    return Math.round(Math.random() * 100000);
}
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
        simplehttp.GET('https://user.lu.com/user/service/parameter/get-parameter?name=loginswitch&_='+randomNumber(), options).then(function ({ err, res, body }) {

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
        simplehttp.GET('https://user.lu.com/user/service/parameter/get-parameter?name=loginswitch&_='+randomNumber(), options).then(function ({ err, res, body }) {

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
    const v = filename.indexOf('.json')>0? await verifyIPsJSON(filename) : await verifyIPsTxt(filename);
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

try {
    let filename = process.argv[2];
    main(filename);
} catch (e) {
    console.log(e);
}


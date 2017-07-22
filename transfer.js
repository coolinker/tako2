const simplehttp = require('./simplehttp');
const htmlparser = require('./htmlparser');
const util = require('util');
let proxyutil;

const mobileheaderutil = require('./mobileheaderutil');

let BuyPriceMax = 1.3, BuyPriceMin = 0.2;

const productIds = {};
let loopFlag = true;

let WORKINGTIME_RANGES = [
    [3, 11],
    [15, 24]
];

exports.config = config;
function config(options) {
    if (!options) options = {};
    proxyutil = require('./proxyutil').config(options.proxyGroup);
    BuyPriceMax = options.BuyPriceMax || BuyPriceMax;
    BuyPriceMin = options.BuyPriceMin || BuyPriceMin;
    WORKINGTIME_RANGES = options.WORKINGTIME_RANGES || WORKINGTIME_RANGES;
    return this;
}

function randomNumber() {
    return Math.round(Math.random() * 100000);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isWorkTime() {
    const now = new Date();
    const h = now.getHours();
    for (let i = 0; i < WORKINGTIME_RANGES.length; i++) {
        const r = WORKINGTIME_RANGES[i];
        if (h >= r[0] && h < r[1]) return true;
    }

    return false;
}

exports.listTransferM3024 = listTransferM3024;
async function listTransferM3024(proxyurl, silence) {
    //console.log("listTransferM3024...")
    const options = {
        proxy: proxyurl
    };

    options.form = {
        requestCode: "M3024",
        version: "3.4.9",
        //INTEREST_RATE_DESC TRANSFER_PRICE_ASC
        params: '{"cookieUserName":"","readListType":"trans_p2p","filterBeginInvestPeriodInDay":"10","width":720,"listType":"trans_p2p","pageSize":"15","ver":"1","isForNewUser":"false","productSortType":"INTEREST_RATE_DESC","forNewUser":"false","pageIndex":"1","filterEndTransPrice":"'
        + BuyPriceMax + '","source":"android","filterBeginTransPrice":"' + BuyPriceMin + '","currentPage":"1"}'
    };
    options.timeout = 3000;
    options.headers = mobileheaderutil.getHeaders();
    const s = new Date();
    const rsp = await simplehttp.POST('https://ma.lu.com/mapp/service/public?M3024&listType=trans_p2p?_' + randomNumber(), options);
    const e = new Date();
    if (!silence && e - s > 1000) console.log(e - s, 'ms', proxyurl);

    if (rsp.err) {
        if (!silence) {
            console.log("\r\nerror code:", rsp.err, rsp.err ? rsp.err.code : '', 'body', rsp.body);
            console.log("******error proxy:******", proxyurl);

        }
        throw rsp.err;
    }

    let bodyJson;
    try {
        bodyJson = JSON.parse(rsp.body);
    } catch (e) {
        if (!silence) {
            console.log("************parse JSON error:",proxyurl, e, rsp.body);
        }
        throw e;
    }

    if (bodyJson.code !== "0000") {
        if (!silence) console.log(new Date(), rsp.body);
        return bodyJson.code;
    }

    if (bodyJson.code === "0000" && bodyJson.result.totalCount > 0) {
        const prds = bodyJson.result.products[0].productList;
        for (let i = 0; i < prds.length; i++) {
            // console.log(prds[i].productStatus, prds[i].price, prds[i].price<6000, prds[i].interestRate)
            if (!productIds[prds[i].id] && Number(prds[i].interestRate) >= 0.084 && prds[i].price > 10000 * BuyPriceMin && prds[i].price < 10000 * BuyPriceMax) {
                if (!silence) console.log("---", prds[i].productStatus, prds[i].price, prds[i].id);
                productIds[prds[i].id] = true;
                if (prds[i].productStatus === 'ONLINE') return prds[i];

            }
        }
    }

    return null;
}

exports.serverLoop = serverLoop;
async function serverLoop(interval, cb, errcb) {
    this.__cb = cb;
    //this.loop(interval, cb, errcb);
}

exports.loop = loop;
async function loop(interval, cb, errcb) {
    console.log("transfer job start looping", BuyPriceMin, BuyPriceMax, interval);
    let product, c = 0, pc = 0, sc = 0;
    let start = new Date(), end;
    do {
        await timeout(interval);

        while(!isWorkTime()) {
            console.log("This is not working time", new Date().toLocaleTimeString())
            await timeout(300000);
        }

        try {
            product = await listTransferM3024(proxyutil.getCurrentUrl());
        } catch (e) {
            product = 'error';
        }

        if (util.isString(product)) {
            if (null === proxyutil.next()) {
                await errcb(product);
            }
            continue;
        }
        c++;
        if (c % 100 === 0) {
            end = new Date();
            console.log(c, "***", sc + '/' + pc, end - start, 'ms');
            start = end;
        }

        if (product !== null) {
            pc++;
            cb(product);
            await timeout(1000);
        }
    } while (loopFlag);

}

exports.addProductFromExternal = addProductFromExternal;
async function addProductFromExternal(product) {
    this.__cb && this.__cb(product);
}

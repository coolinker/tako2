const simplehttp = require("./simplehttp");
const htmlparser = require('./htmlparser');
const pppoeutil = require("./pppoeutil");
const util = require('util');

const mobileheaderutil = require("./mobileheaderutil");

let BuyPriceMax = 0.8, BuyPriceMin = 0.2;

const productIds = {};
let loopFlag = true;

exports.config = config;
function config(options){
    BuyPriceMax = options.BuyPriceMax || BuyPriceMax;
    BuyPriceMin = options.BuyPriceMin || BuyPriceMin;
    return this;
}

function randomNumber() {
    return Math.round(Math.random() * 100000);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function listTransferM3024() {
    //console.log("listTransferM3024...")
    const options = {};
    options.form = {
        requestCode: "M3024",
        version: "3.4.9",
        params: '{"cookieUserName":"","readListType":"trans_p2p","filterBeginInvestPeriodInDay":"10","width":720,"listType":"trans_p2p","pageSize":"15","ver":"1","isForNewUser":"false","productSortType":"INTEREST_RATE_DESC","forNewUser":"false","pageIndex":"1","filterEndTransPrice":"'
        + BuyPriceMax + '","source":"android","filterBeginTransPrice":"' + BuyPriceMin + '","currentPage":"1"}'
    };

    options.headers = mobileheaderutil.getHeaders();

    const rsp = await simplehttp.POST('https://ma.lu.com/mapp/service/public?M3024&listType=trans_p2p?_' + randomNumber(), options);

    let bodyJson;
    try {
        bodyJson = JSON.parse(rsp.body);
    } catch (e) {
        console.log("error", rsp.body, rsp.err);
        return null;
    }

    if (bodyJson.code !== "0000") {
        console.log(new Date(), rsp.body);
        return bodyJson.code;
    }

    if (bodyJson.code === "0000" && bodyJson.result.totalCount > 0) {
        const prds = bodyJson.result.products[0].productList;
        for (let i = 0; i < prds.length; i++) {
            // console.log(prds[i].productStatus, prds[i].price, prds[i].price<6000, prds[i].interestRate)
            if (!productIds[prds[i].id] && Number(prds[i].interestRate) >= 0.084 && prds[i].price > 10000 * BuyPriceMin && prds[i].price < 10000 * BuyPriceMax) {
                console.log("---", prds[i].productStatus, prds[i].price, prds[i].id);
                productIds[prds[i].id] = true;
                if (prds[i].productStatus !== 'ONLINE') return null;
                return prds[i];

            }
        }
    }

    return null;
}

exports.serverLoop = serverLoop;
async function serverLoop(interval, cb, errcb){
    this.__cb = cb;
    this.loop(interval, cb, errcb);
}

exports.loop = loop;
async function loop(interval, cb, errcb) {
    console.log("transfer job start looping", BuyPriceMin, BuyPriceMax, interval);
    let product, c = 0, pc = 0, sc = 0;

    do {
        await timeout(interval);
        product = await listTransferM3024();
        if (util.isString(product)) {
            await errcb(product);
            continue;
        }
        c++;
        if (c % 100 === 0) console.log(c, "***", sc + '/' + pc);

        if (product !== null) {
            pc++;
            cb(product);
        }
    } while (loopFlag);

}

exports.addProductFromExternal = addProductFromExternal;
async function addProductFromExternal(product){
    this.__cb && this.__cb(product);
}

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

let transferFun;

exports.config = config;
function config(options) {
    if (!options) options = {};
    proxyutil = require('./proxyutil').config(options.proxyGroup);
    BuyPriceMax = options.BuyPriceMax || BuyPriceMax;
    BuyPriceMin = options.BuyPriceMin || BuyPriceMin;
    WORKINGTIME_RANGES = options.WORKINGTIME_RANGES || WORKINGTIME_RANGES;
    transferFun = options.transferAPIType === 'app' ? listTransferM3024 : listTransferWeb;

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
exports.listTransferWeb = listTransferWeb;
async function listTransferWeb(proxyurl, silence) {
    const options = {
        proxy: proxyurl
    };

    options.timeout = 5000;

    const s = new Date();
    const rsp = await simplehttp.GET('https://list.lu.com/list/transfer-p2p?minMoney='
        + (BuyPriceMin * 10000) + '&maxMoney=' + (BuyPriceMax * 10000)
        + '&minDays=&maxDays=&minRate=&maxRate=&mode=&tradingMode=&isOverdueTransfer=&isCx=&currentPage=1&orderCondition=&isShared=&canRealized=&productCategoryEnum=&notHasBuyFeeRate=&riskLevel='
        , options);

    const e = new Date();
    if (!silence && e - s > 1000)
        console.log(e - s, 'ms', proxyurl, rsp.body ? rsp.body.length : '');

    if (rsp.err) {
        if (!silence) {
            console.log("error code:", rsp.err ? rsp.err.code : '', 'body', rsp.body);
            //console.log("******error proxy:******", proxyurl);

        }
        //throw rsp.err;
        return null
    }

    let listSection = htmlparser.getValueFromBody('<ul class="main-list" data-sk="p2p-transfer-list">', '<div class="pagination ui_complex_pagination">', rsp.body);
    if (!listSection) return null;
    listSection = listSection.replace(/\n/g, '').replace(/ /g, '');

    const productSections = htmlparser.getSubStringsFromBody('<liclass="product-listhas-bottomtransfer-listclearfix">', '</a></div></li>', listSection);
    if (!productSections) return null;

    for (let i = 0; i < productSections.length; i++) {
        const prd = parseWebProduct(productSections[i]);
        if (!productIds[prd.id] && Number(prd.interestRate) >= 0.084 && prd.price > 10000 * BuyPriceMin && prd.price < 10000 * BuyPriceMax) {
            console.log("---", prd.productStatus, prd.price, prd.id);
            productIds[prd.id] = true;
            if (prd.productStatus === 'ONLINE') return prd;

        }
    }

    return null;
}

function parseWebProduct(html) {
    //<liclass="product-listhas-bottomtransfer-listclearfix"><dlclass="product-infois-4col"><dtclass="product-name"><ahref='/list/productDetail?productId=154696135'target="_blank"title="稳盈-安e+170804098470">稳盈-安e+170804098470</a><spanclass="ld-tagld-tag-bluetooltip"title="本项目为转让项目"><spanclass="ld-tag-inner">转</span></span></dt><dd><ulclass="clearfix"><liclass="interest-rate"><spanclass="product-property-name">期望年化利率</span><pclass="num-style">8.40%</p></li><liclass="invest-period"><spanclass="product-property-name">剩余期限</span><p>25个月</p></li><liclass="product-value"><spanclass="product-property-name">项目价值</span><p><spanclass="collection-currency">7,224.79元</span></p></li><liclass="product-depreciation"><spanclass="product-property-name">调价</span><p>0.00元<spanclass="product-depreciation-text">（降价<bclass="num-style">0.00%</b>）</span></p></li></ul><divclass="acceptance-bank"><p><iclass="ld-iconld-icon-clock-cash"></i><span>预计下一收款日：2017-08-25</span></p></div></dd></dl><divclass="product-amount"><spanclass="product-property-name">转让价格</span><p><emclass="num-style">7,224.79</em>元</p></div><divclass="product-status"><ahref='/list/productDetail?productId=154696135'target="_blank"class="ld-btnld-btn-assist">暂时满额</a></div></li></ul>
    
    const pid = Number(htmlparser.getValueFromBody('productId=', '\'', html));
    const rate = Number(htmlparser.getValueFromBody('期望年化利率</span><pclass="num-style">', '%', html)) / 100;
    const price = Number(htmlparser.getValueFromBody('转让价格</span><p><emclass="num-style">', '</em>元', html).replace(',', ''))
    const status = html.indexOf('投资') > 0 ? 'ONLINE' : 'TEMPORARY_FULL';
    return {
        id: pid,
        interestRate: rate,
        price: price,
        productStatus: status
    }
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
            console.log("************parse JSON error:", proxyurl, e, rsp.body);
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

        while (!isWorkTime()) {
            console.log("This is not working time", new Date().toLocaleTimeString())
            await timeout(300000);
        }

        try {
            product = await transferFun(proxyutil.getCurrentUrl());
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

const request = require("request");
const pixelsUtil = require("get-pixels");
const captchautil = require("./captchautil");
const simplehttp = require("./simplehttp");
const htmlparser = require('./htmlparser');
const mobileheaderutil = require("./mobileheaderutil");
const pppoeutil = require("./pppoeutil");

//const fingerprint = require("./fp");

//let info = fingerprint.getAesEncriptedFingerPrintInfo();

const users = require("./users");
const RSAKey = require('./rsa.js');

const CAN_UPDATE_IP = false;
const STOP_INTERVAL = 5 * 60 * 1000;
const LOOP_INTERVAL = 500;
const myUser = process.argv[2] ? process.argv[2] : 'yang_jianhua';
console.log("User login as:", myUser)

const PRICE_RANGES = [
    //[0, 7000],
    [2000, 14000]
];

const timeRanges = process.argv[3];
const WORKINGTIME_RANGES = timeRanges ? JSON.parse(timeRanges) : [[3, 11], [15, 24]];


console.log("PRICE_RANGES:", PRICE_RANGES, "WORKINGTIME_RANGES", WORKINGTIME_RANGES);

const transferJob = require('./transfer').config();

let INVEST_LOCKED = false;
let CURRENT_USER;
const checkedInvest = {};

function randomNumber() {
    return Math.round(Math.random() * 100000);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCaptchaBySource(source, cookieJar) {
    const image = await simplehttp.image("https://user.lu.com/user/captcha/captcha.jpg?source=" + source + "&_=" + new Date().getTime(), {
        "cookieJar": cookieJar,
        type: 'image/jpeg'
    });

    return image;
}

async function captchaPreCheck(captachaStr, cookieJar) {
    const url = "https://user.lu.com/user/captcha/pre-check?inputValue=" + captachaStr + "&source=login&_=" + new Date().getTime();

    const { err, rsp, body } = await simplehttp.GET(url, {
        "cookieJar": cookieJar
    })

    json = JSON.parse(body);
    return json.result === "SUCCESS";
}

async function productDetail(pid, user) {
    const { err, res, body } = await simplehttp.GET('https://list.lu.com/list/service/product/' + pid + '/productDetail?_=' + new Date().getTime(), {
        "cookieJar": user.jar
    });
    return body;
}

async function investCheck(pid, price, user) {
    const { err, res, body } = await simplehttp.POST('https://list.lu.com/list/itrading/invest-check', {
        form: {
            productId: pid,
            investAmount: price,
            investSource: 0,
            isCheckSQ: 1
        },
        "cookieJar": user.jar
    });
    try {
        const data = JSON.parse(body).data;
        if (!data.sid) console.log(body);
        return data.sid ? data : null;
    } catch (e) {
        console.log("investCheck", body)
        return null;
    }

}

async function checkTrace(sid, pid, user, step) {
    //https://www.lup2p.com/trading/service/trade/check-trace?sid=290982241&productId=149703381&userId=1770933&curStep=TRADE_INFO&_=1497194027793
    const { err, res, body } = await simplehttp.GET('https://www.lup2p.com/trading/service/trade/check-trace?sid='
        + sid + '&productId=' + pid + '&userId=' + user.id + '&curStep=' + step + '&_=' + new Date().getTime(), {
            "cookieJar": user.jar
        });
    console.log("checkTrace:", sid, step, body)
    return body === 'true';
}

async function tradeTrace(sid, pid, user, step, timeout) {
    const { err, res, body } = await simplehttp.POST("https://www.lup2p.com/trading/service/trade/trace", {
        "timeout": timeout ? timeout : 10000,
        "cookieJar": user.jar,
        "headers": {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        "form": {
            sid: sid,
            productId: pid,
            curStep: step//"TRADE_INFO" "CONTRACT" "OTP"
        }
    });
    console.log("tradeTrace", step, err, body)

    if (err) return null;

    try {
        return JSON.parse(body).result
    } catch (e) {
        console.log('step', body)
        return false;
    }

    //return body ? JSON.parse(body).result : null;
}

async function crackTradingCaptcha(sid, pid, user) {
    //https://www.lup2p.com/trading/service/trade/captcha/create-captcha
    const { err, res, body } = await simplehttp.POST('https://www.lup2p.com/trading/service/trade/captcha/create-captcha', {
        "cookieJar": user.jar,
        "form": {
            sid: sid,
            productId: pid
        }
    });
    const imageId = JSON.parse(body).imageId;
    console.log("imageId:", imageId, body)
    if (!imageId) return null;

    const img = await simplehttp.image('https://user.lu.com/user/captcha/get-captcha?source=1&imageId=' + imageId + '&_=' + new Date().getTime(), {
        "cookieJar": user.jar,
        type: 'image/jpeg'
    });

    const captchaStr = captchautil.crackCaptcha(img);
    // https://www.lup2p.com/trading/service/trade/captcha-pre-check?captcha=VL8t&sid=294850368&imgId=25e563f08163414fbd187999a5155cf0&_=1498261082059
    const preck = await simplehttp.GET('https://www.lup2p.com/trading/service/trade/captcha-pre-check?captcha='
        + captchaStr + '&sid=' + sid + '&imgId=' + imageId + '&_=' + new Date().getTime(), {
            "cookieJar": user.jar
        });
    console.log("preck:", preck.body)
    return preck.body && JSON.parse(preck.body).result === 'SUCCESS' ? { captchaStr, imageId } : null;
}

async function investmentRequest(sid, pid, user, captcha, imageId, paymentMethod) {
    const { err, res, body } = await simplehttp.POST('https://www.lup2p.com/trading/investment-request', {
        "cookieJar": user.jar,
        "form": {
            sid: sid,
            productId: pid,
            source: 0,
            needWithholding: false,
            coinString: '',
            paymentMethod: paymentMethod,
            password: user.rsakey.encrypt(user.tradeCode),
            isSetPassword: 0,
            captcha: captcha,
            imgId: imageId
        }
    });

    return body;
}

async function getRecharge(user, pno) {
    if (!pno) pno = 1;
    const { err, res, body } = await simplehttp.GET('https://my.lu.com/my/service/api/recharge-records/v2/' + pno + '?startDate=&endDate=&_' + randomNumber(), {
        "cookieJar": user.jar
    });
    //{"totalCount":18,"totalPage":2,"prePage":0,"nextPage":2,"pageLimit":10,"currentPage":1,"data":[{"id":"136294892","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":9000,"withdrawFee":0,"actualAmount":9000,"withdrawStatus":"成功","createdAt":"2017-02-27 00:25:52","updatedAt":"2017-02-27 02:02:00","remarks":"手动取现","toAccountTime":"2017-02-27 02:02:00","bankCardNoLast4Bit":"5450"},{"id":"130764880","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":1500,"withdrawFee":0,"actualAmount":1500,"withdrawStatus":"成功","createdAt":"2016-11-29 18:23:23","updatedAt":"2016-11-29 18:29:05","remarks":"手动取现","toAccountTime":"2016-11-29 18:29:05","bankCardNoLast4Bit":"5450"},{"id":"128963620","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":29000,"withdrawFee":0,"actualAmount":29000,"withdrawStatus":"成功","createdAt":"2016-10-28 17:25:24","updatedAt":"2016-10-28 17:34:00","remarks":"手动取现","toAccountTime":"2016-10-28 17:34:00","bankCardNoLast4Bit":"5450"},{"id":"128758414","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":10000,"withdrawFee":0,"actualAmount":10000,"withdrawStatus":"成功","createdAt":"2016-10-25 14:45:05","updatedAt":"2016-10-25 14:54:17","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-10-25 14:54:17","bankCardNoLast4Bit":"5450"},{"id":"127966977","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":10000,"withdrawFee":0,"actualAmount":10000,"withdrawStatus":"成功","createdAt":"2016-10-11 21:42:56","updatedAt":"2016-10-11 21:49:03","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-10-11 21:49:03","bankCardNoLast4Bit":"5450"},{"id":"127093141","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":50000,"withdrawFee":0,"actualAmount":50000,"withdrawStatus":"成功","createdAt":"2016-09-24 17:46:32","updatedAt":"2016-09-24 17:54:01","remarks":"手动取现","toAccountTime":"2016-09-24 17:54:01","bankCardNoLast4Bit":"5450"},{"id":"126887964","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":7000,"withdrawFee":0,"actualAmount":7000,"withdrawStatus":"成功","createdAt":"2016-09-21 13:37:49","updatedAt":"2016-09-21 13:44:16","remarks":"手动取现","toAccountTime":"2016-09-21 13:44:16","bankCardNoLast4Bit":"5450"},{"id":"126645254","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":78300,"withdrawFee":0,"actualAmount":78300,"withdrawStatus":"成功","createdAt":"2016-09-17 17:57:58","updatedAt":"2016-09-17 19:32:01","remarks":"手动取现","toAccountTime":"2016-09-17 19:32:01","bankCardNoLast4Bit":"5450"},{"id":"125818900","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":5000,"withdrawFee":0,"actualAmount":5000,"withdrawStatus":"成功","createdAt":"2016-08-31 12:32:53","updatedAt":"2016-08-31 14:07:14","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-08-31 14:07:14","bankCardNoLast4Bit":"5450"},{"id":"121321032","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":8363.47,"withdrawFee":0,"actualAmount":8363.47,"withdrawStatus":"成功","createdAt":"2016-06-12 12:55:05","updatedAt":"2016-06-12 14:33:02","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-06-12 14:33:02","bankCardNoLast4Bit":"5450"}],"retCode":"000","retMsg":"success"}
    if (!err) {
        const json = JSON.parse(body);
        const data = json.data;
        let net = 0;
        for (let i = 0; i < data.length; i++) {
            net += data[i].netAmount;
        }
        return json.currentPage === json.totalPage ? Math.round(net) : (net + await getRecharge(user, pno + 1));
    }

}

async function getWidthdraw(user, pno) {
    if (!pno) pno = 1;
    const { err, res, body } = await simplehttp.GET('https://my.lu.com/my/service/api/withdraw-records/v2/' + pno + '?startDate=&endDate=&_' + randomNumber(), {
        "cookieJar": user.jar
    });
    //{"totalCount":18,"totalPage":2,"prePage":0,"nextPage":2,"pageLimit":10,"currentPage":1,"data":[{"id":"136294892","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":9000,"withdrawFee":0,"actualAmount":9000,"withdrawStatus":"成功","createdAt":"2017-02-27 00:25:52","updatedAt":"2017-02-27 02:02:00","remarks":"手动取现","toAccountTime":"2017-02-27 02:02:00","bankCardNoLast4Bit":"5450"},{"id":"130764880","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":1500,"withdrawFee":0,"actualAmount":1500,"withdrawStatus":"成功","createdAt":"2016-11-29 18:23:23","updatedAt":"2016-11-29 18:29:05","remarks":"手动取现","toAccountTime":"2016-11-29 18:29:05","bankCardNoLast4Bit":"5450"},{"id":"128963620","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":29000,"withdrawFee":0,"actualAmount":29000,"withdrawStatus":"成功","createdAt":"2016-10-28 17:25:24","updatedAt":"2016-10-28 17:34:00","remarks":"手动取现","toAccountTime":"2016-10-28 17:34:00","bankCardNoLast4Bit":"5450"},{"id":"128758414","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":10000,"withdrawFee":0,"actualAmount":10000,"withdrawStatus":"成功","createdAt":"2016-10-25 14:45:05","updatedAt":"2016-10-25 14:54:17","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-10-25 14:54:17","bankCardNoLast4Bit":"5450"},{"id":"127966977","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":10000,"withdrawFee":0,"actualAmount":10000,"withdrawStatus":"成功","createdAt":"2016-10-11 21:42:56","updatedAt":"2016-10-11 21:49:03","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-10-11 21:49:03","bankCardNoLast4Bit":"5450"},{"id":"127093141","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":50000,"withdrawFee":0,"actualAmount":50000,"withdrawStatus":"成功","createdAt":"2016-09-24 17:46:32","updatedAt":"2016-09-24 17:54:01","remarks":"手动取现","toAccountTime":"2016-09-24 17:54:01","bankCardNoLast4Bit":"5450"},{"id":"126887964","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":7000,"withdrawFee":0,"actualAmount":7000,"withdrawStatus":"成功","createdAt":"2016-09-21 13:37:49","updatedAt":"2016-09-21 13:44:16","remarks":"手动取现","toAccountTime":"2016-09-21 13:44:16","bankCardNoLast4Bit":"5450"},{"id":"126645254","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":78300,"withdrawFee":0,"actualAmount":78300,"withdrawStatus":"成功","createdAt":"2016-09-17 17:57:58","updatedAt":"2016-09-17 19:32:01","remarks":"手动取现","toAccountTime":"2016-09-17 19:32:01","bankCardNoLast4Bit":"5450"},{"id":"125818900","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":5000,"withdrawFee":0,"actualAmount":5000,"withdrawStatus":"成功","createdAt":"2016-08-31 12:32:53","updatedAt":"2016-08-31 14:07:14","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-08-31 14:07:14","bankCardNoLast4Bit":"5450"},{"id":"121321032","bankName":"中国建设银行","bankCardNo":"6217***********5450","withdrawAmount":8363.47,"withdrawFee":0,"actualAmount":8363.47,"withdrawStatus":"成功","createdAt":"2016-06-12 12:55:05","updatedAt":"2016-06-12 14:33:02","remarks":"陆金宝赎回进银行卡","toAccountTime":"2016-06-12 14:33:02","bankCardNoLast4Bit":"5450"}],"retCode":"000","retMsg":"success"}
    if (!err) {
        const json = JSON.parse(body);
        const data = json.data;
        let net = 0;
        for (let i = 0; i < data.length; i++) {
            net += data[i].actualAmount;
        }
        return json.currentPage === json.totalPage ? Math.round(net) : (net + await getWidthdraw(user, pno + 1));
    }

}

async function getNetRecharge(user) {
    const recharge = await getRecharge(user);
    const withdraw = await getWidthdraw(user);
    console.log("getNetRecharge", recharge, withdraw, 'net', recharge - withdraw);
    user.netRecharge = recharge - withdraw;
}

async function getBalanceInfo(user) {
    const { err, res, body } = await simplehttp.GET('https://my.lu.com/my/account', {
        "cookieJar": user.jar
    });
    const availablePrt = htmlparser.getValueFromBody('<h3 class="coin-point-item-header">可用余额</h3>', '元', body);
    if (availablePrt) {
        let available = htmlparser.getValueFromBody('class="coin-point-item-number security-mark-hide">', '</span>', availablePrt);
        user.available = Number(available.replace(',', ''));
    }

    const lhbPrt = htmlparser.getValueFromBody('<h3 class="coin-point-item-header"> 陆金宝T+0 </h3>', '元', body);
    if (lhbPrt) {
        let lhb = htmlparser.getValueFromBody('class="coin-point-item-number security-mark-hide">', '</span>', lhbPrt);
        lhb = Number(lhb.trim().replace(',', ''));
        user.lhb = lhb;
    }


    console.log("user info updated:", user.available, user.lhb)
}

async function login(user) {
    const cookieJar = user.jar || request.jar();
    const rsakey = user.rsakey || new RSAKey();

    const { err, res, body } = await simplehttp.GET('https://user.lu.com/user/login', {
        "cookieJar": cookieJar
    });

    const publicKey = htmlparser.getValueFromBody('id="publicKey" name="publicKey" value="', '" />', body);
    const rsaExponent = htmlparser.getValueFromBody('id="rsaExponent" name="rsaExponent" value="', '" />', body);
    rsakey.setPublic(publicKey, rsaExponent);
    const cncryptPassword = rsakey.encrypt(user.password);

    const cap_authorize = await simplehttp.POST('https://user.lu.com/user/service/login/captcha-authorize', {
        form: {
            source: 'PC',
            username: user.name
        },
        "cookieJar": cookieJar
    });

    let auth = 'false' === JSON.parse(cap_authorize.body).captcha;
    let captchaStr = '';
    while (!auth) {
        console.log("process captcha...")
        const img = await getCaptchaBySource('login', cookieJar);
        captchaStr = captchautil.crackCaptcha(img);
        auth = await captchaPreCheck(captchaStr, cookieJar);

        console.log("------------captchaPreCheck", captchaStr, auth)
    }

    const { err: err1, res: res1, body: json } = await simplehttp.POST('https://user.lu.com/user/login', {
        form: {
            userName: user.name,
            password: cncryptPassword,
            pwd: "************",
            validNum: captchaStr,
            agreeLbo: "on",
            loginagree: "on",
            isTrust: "Y",
            openlbo: 0,
            deviceKey: '66E00DCE36AB0B018E09A78A87B2BA150461F28D2E4C45308D32B5238E3CC0E6AF446210063B1803E4BDCC8857105B2A1DB77004350EFDC1088F7512824B83DF81C67E25E4ABC62F35984E68DB2152DD0ED84B7DD5FFCAC74DA36504285CBE9A70C205D5CD295A48B2966642313F95EFAC2CFE83F1114DA3B5FEDCCCD7CA6BC4',
            deviceInfo: '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'
        },
        "cookieJar": cookieJar
    });

    user.jar = cookieJar;
    user.id = JSON.parse(json).userId;
    user.rsakey = rsakey;

    user.loginTime = new Date();
    console.log("loginTime", user.loginTime)
    return user;
}

function cookieLuToP2p(user) {
    const jar = user.jar;
    const str = jar.getCookieString('https://www.lu.com');
    //let strs = ;
    for (let kv of str.split('; ')) {
        jar.setCookie(kv, 'https://www.lup2p.com');
    }
}

async function checkToInvest(product, user) {
    if (INVEST_LOCKED) {
        console.log("Invest locked", product.id, product.price)
        return false;
    }

    INVEST_LOCKED = true;
    const refun = function (b) {
        INVEST_LOCKED = false;
        return b;
    }

    // if (checkedInvest[priduct.id]) {
    //     console.log("Try to check invest again!", product.id)
    //     return refun(false);
    // }

    // checkedInvest[priduct.id] = true;

    const s = new Date();
    const invck = await investCheck(product.id, product.price, user);

    //"TRADE_INFO" "CONTRACT" "OTP"
    console.log("sid==", (invck ? invck.sid : null), new Date() - s, 'ms');
    if (!invck) return refun(false);
    const sid = invck.sid;
    const paymentMethod = invck.paymentMethod;
    cookieLuToP2p(user);

    console.log("start trace", new Date() - s, 'ms');

    const tradeinfo = await tradeTrace(sid, product.id, user, 'TRADE_INFO');
    if (tradeinfo === false) return refun(false);

    const contract = await tradeTrace(sid, product.id, user, 'CONTRACT');
    if (contract === false) return refun(false);

    console.log("before OTP", new Date() - s, 'ms')
    const otp = await tradeTrace(sid, product.id, user, 'OTP');
    console.log("otp", new Date() - s, 'ms')
    if (otp === false) return refun(false);

    const crack = await crackTradingCaptcha(sid, product.id, user);
    console.log("crack", crack, new Date() - s, 'ms')

    if (!crack) return refun(false);

    const invRes = await investmentRequest(sid, product.id, user, crack.captchaStr, crack.imageId, paymentMethod);
    console.log(invRes, '\n\n');
    const invResJson = JSON.parse(invRes);

    // {"code":"09","apiCode":"400009","message":"其他原因失败","locked":false,"needWithholding":false,"isRiskLevelMatch":false,"isCan
    // "riskVerifyLeftCount":0,"riskVerifyTotalCount":0,"virutalPartialInavailProductIdList":[],"isRiskVerifySysDefine":false,"virutal
    // mesList":[]}
    if (invResJson.code === '01') {
        user.available -= product.price;
        return refun(true);
    }

    return refun(false);
}


async function updateLogin(user) {
    if (pppoeutil.connected() && (!user.loginTime || new Date() - user.loginTime > 15 * 60 * 1000)) {
        console.log('\n\n');
        await login(user);
        await getBalanceInfo(user);
        await getNetRecharge(user);
        console.log('\n\n');
    }
}

function priceInRange(price) {
    for (let i = 0; i < PRICE_RANGES.length; i++) {
        const r = PRICE_RANGES[i];
        if (price > r[0] && price < r[1]) return r;
    }

    return null;
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

async function main(username) {
    let user = CURRENT_USER = users[username];
    let pc = 0, sc = 0;
    let working = false;
    transferJob.serverLoop(LOOP_INTERVAL, async function (product) {
        if (product && priceInRange(product.price) && product.price <= (user.available + user.lhb)) {
            pc++;

            const suc = await checkToInvest(product, user);
            if (suc) {
                sc++;
            }
        }
    }, async (errCode) => {
        console.log("timeout", STOP_INTERVAL, 'ms')
        await timeout(STOP_INTERVAL);
    });

    while (user) {
        if (isWorkTime()) {
            if (!working) console.log("Start working", new Date().toLocaleTimeString());
            working = true;
            await updateLogin(user);
        } else {
            if (working) console.log("End working", new Date().toLocaleTimeString());
            working = false;
        }
        await timeout(30000);

    }

}

main(myUser);

const serverActionHandlers = require("./server");
serverActionHandlers.produce = function (prm, cb) {
    console.log("server recieved product", prm);
    transferJob.addProductFromExternal(prm);
    cb('produce api finished:' + prm);
}


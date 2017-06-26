const request = require("request");
const pixelsUtil = require("get-pixels");
const captchautil = require("./captchautil");
const simplehttp = require("./simplehttp");
const users = require("./users");
const RSAKey = require('./rsa.js');
const mobileheaderutil = require("./mobileheaderutil");

const BuyPriceMax = 0.8, BuyPriceMin = 0.2;
//console.log(users)

function randomNumber() {
    return Math.round(Math.random() * 100000);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function securityValid() {
    const { err, res, body } = await simplehttp.GET('https://static.lufaxcdn.com/trading/resource/securityValid/main/1be866c2e005.securityValid.js');
    const publicKey = body.match(/encryptPwd\:function\(e\){var t="(.+)",n=/)[1];
    const rsaExponent = body.match(/n\.setPublic\(t,"(.+)"\),n\./)[1];
    return { publicKey, rsaExponent };
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

async function listTransferM3024() {
    console.log("listTransferM3024...")
    const options = {};
    options.form = {
        requestCode: "M3024",
        version: "3.4.9",
        params: '{"cookieUserName":"","readListType":"trans_p2p","filterBeginInvestPeriodInDay":"10","width":720,"listType":"trans_p2p","pageSize":"15","ver":"1","isForNewUser":"false","productSortType":"INTEREST_RATE_DESC","forNewUser":"false","pageIndex":"1","filterEndTransPrice":"'
        + BuyPriceMax + '","source":"android","filterBeginTransPrice":"' + BuyPriceMin + '","currentPage":"1"}'
    };

    options.headers = mobileheaderutil.getHeaders();

    const rsp = await simplehttp.POST('https://ma.lu.com/mapp/service/public?M3024&listType=trans_p2p?_' + randomNumber(), options);
    const bodyJson = JSON.parse(rsp.body);
    if (bodyJson.code !== "0000") {
        console.log(rsp.body);
        timeout(15 * 60 * 1000);
        return null
    }

    if (bodyJson.code === "0000" && bodyJson.result.totalCount > 0) {
        const prds = bodyJson.result.products[0].productList;
        for (let i = 0; i < prds.length; i++) {
            // console.log(prds[i].productStatus, prds[i].price, prds[i].price<6000, prds[i].interestRate)
            if (prds[i].productStatus === 'ONLINE' && Number(prds[i].interestRate) >= 0.084 && prds[i].price > 10000 * BuyPriceMin && prds[i].price < 10000 * BuyPriceMax) {
                console.log("---", prds[i].productStatus, prds[i].price);
                return prds[i];
            }
        }
    }

    return null;
}

async function login(username, jar) {
    const rsakey = new RSAKey();
    const user = users[username];
    const { publicKey, rsaExponent } = await securityValid();
    rsakey.setPublic(publicKey, rsaExponent);
    
    const cookieJar = jar || request.jar();
    const cncryptPassword = rsakey.encrypt(user.password);

    let success = false, captchaStr;
    do {
        const img = await getCaptchaBySource('login', cookieJar);
        captchaStr = captchautil.crackCaptcha(img);
        success = await captchaPreCheck(captchaStr, cookieJar);
        console.log("------------captchaPreCheck", captchaStr, success)
    } while (!success);


    const { err, res, body } = await simplehttp.POST('https://ma.lu.com/mapp/service/public?M8001', {
        "cookieJar": cookieJar,
        form: {
            requestCode: "M8001",
            version: "3.4.9",
            params: '{"userNameLogin":"' + username + '","password":"' + cncryptPassword + '","validNum":"' + captchaStr + '","IMVC":"","mobileSerial":"868191022314031"}'
        },
        headers: mobileheaderutil.getHeaders()
    })

    const cookie_string = cookieJar.getCookieString("https://user.lu.com");
    console.log("login status:", cookie_string.indexOf("lufaxSID") > 0, username);
    var info = JSON.parse(body);
    user.cookieJar = cookieJar;
    user.uid = info.result.userOverview.userId;
    user.loginTime = new Date();
    user.rsakey = rsakey;

    return user;
}


async function mobileGetSID(user, product) {
    // {"insuranceFeeFlag":"","amount":"6217.45","bidFee":"","salesArea":"","source":"2","productCategory":"902","ver":"1.0","isCheckSQ":"0","productId":"139263131"}
    const { err, res, body } = await simplehttp.POST("https://mapp.lu.com/mapp/service/v2/private?M3034&spCategory=" + product.productCategory + "&_" + randomNumber(), {
        "cookieJar": user.cookieJar,
        "headers": mobileheaderutil.getHeaders(user.uid),
        form: {
            requestCode: "M3034",
            version: "3.4.9",
            params: '{ "insuranceFeeFlag": "", "amount": "' + product.price + '", "bidFee": "", "salesArea": "", "source": "2", "productCategory":"' + product.productCategory + '", "ver": "1.0", "isCheckSQ": "0", "productId": "' + product.id + '" }'
        }
    });

    var info = JSON.parse(body).result;
    //if (!info.sid) {
    console.log("investCheck failed", body);
    //}

    return info.sid;

}


async function mobileTradeM3030(user, product, sid) {
    // https://mapp.lu.com/mapp/service/v2/private?M3030&spCategory=902&_68785
    const { err, res, body } = await simplehttp.POST("https://mapp.lu.com/mapp/service/v2/private?M3030&spCategory=" + product.productCategory + "&_" + randomNumber(), {
        "cookieJar": user.cookieJar,
        "headers": mobileheaderutil.getHeaders(user.uid),
        form: {
            requestCode: "M3030",
            version: "3.4.9",
            params: '{ "ver": "1.0", "source": "2", "productId":"' + product.id + '", "amount":"' + product.price + '", "sid": "' + sid + '", "hasInsurance": "", "productCode": "" }'
        }
    });

    try {
        var code = JSON.parse(body).code;

        // if (code !== '0000') {
        console.log("mobileTradeM3030 failed", new Date().toTimeString(), user.loginTime, body);
        // }

        return code === '0000';

    } catch (e) {
        console.log("mobileTradeM3030 failed", new Date().toTimeString(), body);
    }

    return false;

}



async function mobileTradeM3032(user, product, sid) {
    // https://mapp.lu.com/mapp/service/v2/private?M3032&spCategory=902&_76405
    const { err, res, body } = await simplehttp.POST("https://mapp.lu.com/mapp/service/v2/private?M3032&spCategory=" + product.productCategory + "&_" + randomNumber(), {
        "cookieJar": user.cookieJar,
        "headers": mobileheaderutil.getHeaders(user.uid),
        form: {
            requestCode: "M3032",
            version: "3.4.9",
            //{"sid":"244302157","supportedMethods":"1","productCategory":"902","isSetPassword":"0","needWithholding":false,"from":"","password":"10EACC7875481C26FD6D760594DED287581665825CDF1CB1D8D15037FD83FFCCF127CAAB8C279FDC1B8D6FF00EFFC86E610B6D1811660E93978C85A9AB3B18F1EE6A6EA7946C71A3CF9FC0460BFD0353726AA84C4F79E972838A960AC7645D98D2317159CE919804DC87F0B8C87F09F33ABD30EAD4C5D051FB3E88BED93AE924","paymentMethod":"1","productId":"139263131"}
            params: '{ "sid": "' + sid + '", "supportedMethods": "1", "productCategory": "' + product.productCategory + '", "isSetPassword": "0", "needWithholding": false, "from": "", "password": "' 
            + user.rsakey.encrypt(user.tradeCode) + '", "paymentMethod": "1", "productId": "' + product.id + '" }'
        }
    });

    try {
        var result = JSON.parse(body).result;
        // if (!result) {
        console.log("mobileTradeM3032 failed", new Date(), body);
        // }

        return result;

    } catch (e) {
        console.log("mobileTradeM3032 exception:", err, body);
    }

    return null;
}

async function start(username) {
    const user = await login(username);
    let product, c = 0;

    do {
        await timeout(1000);
        product = await listTransferM3024();

        console.log(c++, "***", product ? product.id : '');
    } while (!product);

    if (!user) return;

    let sid, resultM3030, resultM3032;
    sid = await mobileGetSID(user, product);
    console.log("sid", sid)
    if (sid) {
        relM3030 = await mobileTradeM3030(user, product, sid);
        console.log("relM3030:", relM3030)
    }

    if (relM3030) {
        await timeout(1000);
        relM3032 = await mobileTradeM3032(user, product, sid);
        console.log("relM3032:", relM3032)
    }

}

start('yang_jianhua');

var request = require("request");
const pixelsUtil = require("get-pixels");
const captchautil = require("./captchautil");
const simplehttp = require("./simplehttp");
const users = require("./users");
var RSAKey = require('./rsa.js');
var mobileheaderutil = require("./mobileheaderutil");

console.log(users)

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


async function login(username) {
    const rsakey = new RSAKey();
    const user = users[username];
    const { publicKey, rsaExponent } = await securityValid();
    rsakey.setPublic(publicKey, rsaExponent);
    const cookieJar = request.jar();
    const cncryptPassword = rsakey.encrypt(user.password);

    let success = false, captchaStr;
    do {
        const img = await getCaptchaBySource('login', cookieJar);
        captchaStr = captchautil.crackCaptcha(img);
        success = await captchaPreCheck(captchaStr, cookieJar);
    } while (!success);


    const { err, res, body } = await simplehttp.POST('https://ma.lu.com/mapp/service/public?M8001', {
        "cookieJar": cookieJar,
        form: {
            requestCode: "M8001",
            version: "3.4.9",
            params: '{"userNameLogin":"' + username + '","password":"' + cncryptPassword + '","validNum":"' + captachStr + '","IMVC":"","mobileSerial":"868191022314031"}'
        },
        headers: mobileheaderutil.getHeaders()
    })

    const cookie_string = cookieJar.getCookieString("https://user.lu.com");
    console.log("login status:", cookie_string.indexOf("lufaxSID") > 0, username);
    var info = JSON.parse(body);
    user.cookieJar = cookieJar;
    user.uid = info.result.userOverview.userId;
    user.loginTime = new Date();

    return true;
}

login('yang_jianhua');
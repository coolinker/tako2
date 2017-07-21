var request = require("request");
var HttpsProxyAgent = require('https-proxy-agent');

var pixelsUtil = require("get-pixels");
exports.GET = sendGet;

function sendGet(url, options) {
    if (!options) options = {};
    return new Promise(function (resolve, reject) {
        if (options.proxy) {
            options.agent = new HttpsProxyAgent(options.proxy);
            options._proxy = options.proxy;
            delete options.proxy;
        }
        options.uri = url;
        options.method = "GET";
        sendRequest(options, (err, res, body) => {
            if (err) err.__options = options;
            resolve({ err, res, body });
        });
    })
}

exports.POST = sendPost;
function sendPost(url, options) {
    return new Promise(function (resolve, reject) {
        if (options.proxy) {
            options.agent = new HttpsProxyAgent(options.proxy);
            options._proxy = options.proxy;
            delete options.proxy;
        }
        options.uri = url;
        options.method = "POST";

        sendRequest(options, (err, res, body) => {
            if (err) err.__options = options;
            resolve({ err, res, body });
        });
    })
}

exports.image = image;
async function image(url, options, callback) {
    options.encoding = null;
    const { err, res, body } = await sendGet(url, options);

    let type = options.type;
    if (!type) {
        if (res.getHeader !== undefined) {
            type = res.getHeader('content-type');
        } else if (res.headers !== undefined) {
            type = res.headers['content-type'];
        }
    }

    return new Promise(function (resolve, reject) {
        pixelsUtil(body, type, function (err, pixels) {
            const image = {
                width: pixels.shape[0],
                height: pixels.shape[1],
                data: pixels.data
            };
            resolve(image);
        })
    })


}


// function image(url, options, callback) {
//     options.encoding = null;
//     sendGet(url, options, function (err, response, body) {
//         if (err) {
//             callback(err)
//             return
//         }
//         // console.log("response.headers", response.headers, body)
//         var type = options.type;
//         if (!type) {
//             if (response.getHeader !== undefined) {
//                 type = response.getHeader('content-type');
//             } else if (response.headers !== undefined) {
//                 type = response.headers['content-type'];
//             }
//         }

//         //var type = "image/jpeg"//response.headers['content-type'];
//         if (!type) {
//             callback(new Error('Invalid content-type'))
//             return
//         }

//         pixelsUtil(body, type, callback)

//     })
// }

function sendRequest(options, callback) {
    if (options.cookieJar) {
        options.jar = options.cookieJar;
        delete options.cookieJar;
    }

    var req = request(options, function (error, response, body) {
        try {
            if (options.proxyTimeoutObj) {
                clearTimeout(options.proxyTimeoutObj);
                delete options.proxyTimeoutObj;
            }
            callback(error, response, body);
        } catch (e) {
            console.log("----------------e", e)
        }
    });
    req.__options = options;

    if (options.agent) {
        options.proxyTimeoutObj = setTimeout(function () {
            console.log("proxy timeout abort...")
            try {
                req.abort();
                req.destroy();

            } catch (e) {
                console.log("catch abort+++++++", e)
            }
            callback("ProxyTimeout");
        }, options.timeout)
    }
}

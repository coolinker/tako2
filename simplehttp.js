var request = require("request");
var pixelsUtil = require("get-pixels");
exports.GET = sendGet;

function sendGet(url, options) {
    if (!options) options = {};
    return new Promise(function (resolve, reject) {
        options.uri = url;
        options.method = "GET";
        sendRequest(options, (err, res, body) => {
            resolve({ err, res, body });
        });
    })
}

// function sendGet(url, options, callback) {
//     options.uri = url;
//     options.method = "GET";
//     sendRequest(options, callback);
// }

exports.POST = sendPost;
function sendPost(url, options) {
    // sendRequest(options, callback);
    return new Promise(function (resolve, reject) {
        options.uri = url;
        options.method = "POST";
        sendRequest(options, (err, res, body) => {
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
        callback(error, response, body);
    });
    req.__options = options;

}

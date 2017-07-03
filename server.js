const request = require("request");
const http = require("http");
const url = require("url");
//const fingerprint = require("./fp");

//let info = fingerprint.getAesEncriptedFingerPrintInfo();

const actionHandlers = {
    'testapi': function (json, cb) {
        console.log(json);
        cb('test api finished:' + json);
    }
};

module.exports = actionHandlers;

function handleApiRequest(request, response) {
    const query = url.parse(request.url, true).query;
    const action = query.action;
    if (!actionHandlers[action]) return false;
    if (request.method == 'POST') {
        let jsonString = '';

        request.on('data', function (data) {
            jsonString += data;
        });
        request.on('end', function () {
            const postJson = JSON.parse(jsonString);
            actionHandlers[action](postJson, function (output) {
                response.writeHead(200, {
                    "Content-Type": "application/x-javascript; charset=utf-8"
                });
                response.write(output);
                response.end();
            });
        });
    }

    return true;
}

const server = http.createServer(function (req, res) {
    const uri = url.parse(req.url).pathname;
    if (uri === "/api" && handleApiRequest(req, res)) {
        //logutil.info("443 port api call", uri)
        return;
    } else if (uri === "/test") {
        fs.readFile("test.html", "binary", function (err, file) {
            res.writeHead(200);
            res.write(file, "binary");
            res.end();
        });
    } else {
        res.writeHead(200);
        res.write("Wrong url");
        res.end();
    }
}).listen(80);


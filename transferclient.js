const simplehttp = require("./simplehttp");
// const pppoeutil = require("./pppoeutil");

const CAN_UPDATE_IP = false;
const STOP_INTERVAL = 5 * 60 * 1000;
const LOOP_INTERVAL = 10;

let priceMax = process.argv[2];
priceMax = priceMax ? Number(priceMax) : null;

const proxygroup = process.argv[3] || 'proxies0';
const transferJob = require('./transfer').config({BuyPriceMax: priceMax, proxyGroup: proxygroup});

const serverIP = process.argv[4] || 'localhost';
console.log("Transfer client started:", serverIP, CAN_UPDATE_IP, LOOP_INTERVAL);

function randomNumber() {
    return Math.round(Math.random() * 100000);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function transferClient(serverIP) {
    transferJob.loop(LOOP_INTERVAL, async function (product) {
        let s = new Date();
        const { err, res, body } = await simplehttp.POST('http://' + serverIP + ':80/api?action=produce', {
            json: {
                'id': product.id,
                'price': product.price
            },
        });
        console.log("product sent", product.id, product.price, body, new Date()-s);
    }, async (errCode) => {
        if (CAN_UPDATE_IP) {
            // await pppoeutil.updateIP();
        } else {
            console.log("timeout", STOP_INTERVAL, 'ms')
            await timeout(STOP_INTERVAL);
        }

    });

}

transferClient(serverIP);
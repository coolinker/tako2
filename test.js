const chrome = require('chrome-remote-interface');
const pixelsUtil = require("get-pixels");
const captchautil = require("./captchautil");

process.setMaxListeners(0);

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Network.responseReceived((req) => {
//   console.log("--------", req.response.url);
// });

// Wait for window.onload before doing stuff.

function navigate(Page, url) {
  Page.navigate({ url: url });
  return new Promise(function (resolve, reject) {
    Page.loadEventFired((fid) => {
      resolve(fid);
    });

  })
}

function pageOnload(Page) {
  return new Promise(function (resolve, reject) {
    Page.loadEventFired((fid) => {
      console.log("=======pageOnload", fid)
      resolve(fid);
    });

  })
}

async function responseDataOnReceived(Network, urls) {
  const resid = await responseOnReceived(Network, urls);
  const data = await Network.getResponseBody({ requestId: resid });

  return data;
}


function responseOnReceived(Network, urls) {
  return new Promise(function (resolve, reject) {
    Network.responseReceived((req) => {
      //https://www.lup2p.com/trading/service/trade/contract-list?
      const rurl = req.response.url;
      for (let i = 0; i < urls.length; i++) {
        if (rurl.indexOf(urls[i]) === 0) {
          console.log("--------req.requestId", req.requestId);
          resolve(req.requestId);
          break;
        }
      }

    });

  })
}


function Base64ToImageNArray(data) {
  return new Promise(function (resolve, reject) {    
    pixelsUtil(new Buffer(data, 'base64'), 'image/jpeg',function (err, pixels) {
      const image = {
        width: pixels.shape[0],
        height: pixels.shape[1],
        data: pixels.data
      };
      resolve(image);
    })
  })
}

async function doLogin(Page, Network, Runtime) {
  const s = new Date();
  console.log("login------------start")
  let captchaReqId;
  Network.responseReceived((req) => {
    const rurl = req.response.url;
    if (rurl.indexOf('https://user.lu.com/user/captcha/captcha.jpg?') === 0) {
      captchaReqId = req.requestId;
    }

  });

  await navigate(Page, 'https://user.lu.com/user/login?returnPostURL=https%3A%2F%2Flist.lu.com%2Flist%2Ftransfer-p2p');
  console.log("captchaReqId:", captchaReqId);

  const data = await Network.getResponseBody({ requestId: captchaReqId });
  const image = await Base64ToImageNArray(data.body);
  const captchaStr = captchautil.crackCaptcha(image);

  console.log("image---------", captchaStr)
  await Runtime.evaluate({
    expression: "document.querySelector('#userNameLogin').value='13810394811';"
  });
  // https://user.lu.com/user/service/login/captcha-authorize
  await Runtime.evaluate({
    expression: "document.querySelector('#pwd').value='B3ijingl19'"
  });

  // await Runtime.evaluate({
  //   expression: "document.querySelector('#loginBtn').click()"
  // });
  console.log("------------end", new Date() - s);
  return true;
}

async function showDetail(Page, DOM, Runtime, Network, url) {
  const prdid = url.match(/\?productId=([0-9]+)/)[1];
  console.log("showDetail prdid", prdid)
  await navigate(Page, url);

  await Runtime.evaluate({
    expression: "document.querySelector('.btns.btn_xlarge.investBtn.sk-area-trigger').click()"
  });

  const in_reqId = await responseOnReceived(Network, ['https://list.lu.com/list/itrading/invest-check']);
  const in_rep = await Network.getResponseBody({ requestId: in_reqId });
  const invest_check = JSON.parse(in_rep.body);

  console.log("invest_check", invest_check);

  //await pageOnload(Page);
  //https://trading.lu.com/trading/service/trade/product/149690091/trade-info?_=1497187665327
  //https://my.lu.com/my/insurance-account-switch?jsoncallback=jQuery17200036755654791844616_1497187665070&_=1497187665190
  await responseOnReceived(Network, ["https://trading.lu.com/trading/service/trade/product/" + prdid + "/trade-info?",
  "https://www.lup2p.com/trading/service/trade/product/" + prdid + "/trade-info?"])

  const { root: { nodeId: documentNodeId } } = await DOM.getDocument();

  const { nodeId: stepNodeId } = await DOM.querySelector({
    selector: '#stepContent',
    nodeId: documentNodeId
  });
  console.log("stepContent===", stepNodeId)

  // timeout(200);

  const { nodeId: btnNodeId } = await DOM.querySelector({
    selector: 'a.btns.btn_large',
    nodeId: stepNodeId,
  });
  console.log("btnNodeId===", btnNodeId)

  await Runtime.evaluate({
    expression: "document.querySelector('a.btns.btn_large').click()"
  });

  //trigger
  //https://www.lup2p.com/trading/service/trade/product/149799275/check-status?_=1497281624134


  // await pageOnload(Page);
  await responseOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/contract-list?",
    "https://trading.lu.com/trading/service/trade/contract-list?"])
  const { root: { nodeId: documentNodeId1 } } = await DOM.getDocument();
  const { nodeId: contractAgreeNodeId } = await DOM.querySelector({
    selector: '#contractAgree',
    nodeId: documentNodeId1,
  });

  console.log("contractAgreeNodeId", contractAgreeNodeId);

  await Runtime.evaluate({
    expression: "document.querySelector('#contractAgree').click()"
  });

  const { nodeId: submitNodeId } = await DOM.querySelector({
    selector: 'a.btns.btn_large.agreeSubmit',
    nodeId: documentNodeId1,
  });

  console.log("submitNodeId", submitNodeId);

  await Runtime.evaluate({
    expression: "document.querySelector('a.btns.btn_large.agreeSubmit').click()"
  });

  //https://www.lup2p.com/trading/service/trade/product/149703412/check-status?_=1497194882925
  const ck_reqId = await responseOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/product/" + prdid + "/check-status?"
    , "https://trading.lu.com/trading/service/trade/product/" + prdid + "/check-status?"]);

  const ck_rep = await Network.getResponseBody({ requestId: ck_reqId });
  //const ck_check = JSON.parse(ck_rep).result;
  console.log("ck_check===========", ck_rep);

  const captchaId = await responseOnReceived(Network, ['https://user.lu.com/user/captcha/get-captcha?']);
  const captcha = await Network.getResponseBody({ requestId: captchaId });
  //captcha.body = base64 image;
  const tradeCode = '19801221jy';
  await Runtime.evaluate({
    expression: "document.getElementById('tradeCode').value='" + tradeCode + "'"
  });


}

async function listTransfer(Page, DOM) {
  const s = new Date();
  console.log("listTransfer------------start")
  await navigate(Page, 'https://list.lu.com/list/transfer-p2p?minMoney=&maxMoney=&minDays=&maxDays=&minRate=&maxRate=&mode=&tradingMode=&isOverdueTransfer=&isCx=&currentPage=1&orderCondition=&isShared=&canRealized=&productCategoryEnum=&notHasBuyFeeRate=&riskLevel=');

  const { root: { nodeId: documentNodeId } } = await DOM.getDocument();
  console.log("documentNodeId", documentNodeId)
  const { nodeIds: itemNodeIds } = await DOM.querySelectorAll({
    selector: 'li.product-list.has-bottom.transfer-list.clearfix',
    nodeId: documentNodeId,
  });


  console.log("-------------itemNodeIds", itemNodeIds)
  if (itemNodeIds.length === 0) {
    return null;
  }

  for (let i = 0; i < itemNodeIds.length; i++) {
    const { outerHTML: html } = await DOM.getOuterHTML({ nodeId: itemNodeIds[i] });
    if (html.indexOf('class="ld-btn ld-btn-primary">投资</a>') < 0) continue;
    const rateMatch = html.match(/<p class="num-style">([0-9.]*)%<\/p>/);
    if (rateMatch && Number(rateMatch[1]) < 4.4) continue;
    const prcMatch = html.match(/<p><em class="num-style">([0-9.,]*)<\/em>元<\/p>/);
    if (!prcMatch) continue;
    let prc = Number(prcMatch[1].replace(',', ''));
    if (prc > 45410) continue;
    console.log("html------------", prc, Number(rateMatch[1]))

    const urlMatch = html.match(/<a href="(.+)" target="_blank" class="ld-btn ld-btn-primary">投资<\/a>/);

    console.log("---------------urlMatch", urlMatch[1])
    return 'https://list.lu.com' + urlMatch[1];
  }

  return null;

}

chrome(async protocol => {
  // Extract the parts of the DevTools protocol we need for the task.
  // See API docs: https://chromedevtools.github.io/devtools-protocol/
  const { Page, Runtime, Network, DOM } = protocol;

  // First, need to enable the domains we're going to use.
  await Promise.all([
    Page.enable(),
    Runtime.enable(),
    Network.enable(),
    DOM.enable()
  ]);//.then(() => {

  await doLogin(Page, Network, Runtime);

  // let turl = null;
  // do {
  //   await timeout(500);
  //   turl = await listTransfer(Page, DOM);
  //   console.log("listTransfer", turl)

  // } while (!turl);

  // await showDetail(Page, DOM, Runtime, Network, turl);


  console.log("---------------close")
  protocol.close();

}).on('error', err => {
  throw Error('Cannot connect to Chrome:' + err);
});

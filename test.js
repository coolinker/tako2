const chrome = require('chrome-remote-interface');
const pixelsUtil = require("get-pixels");
const captchautil = require("./captchautil");

const BuyPriceMax = 10000;
process.setMaxListeners(0);

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      resolve(fid);
    });

  })
}

function responseOnReceived(Network, urls) {
  return new Promise(function (resolve, reject) {
    Network.responseReceived((req) => {
      //https://www.lup2p.com/trading/service/trade/contract-list?
      const rurl = req.response.url;
      for (let i = 0; i < urls.length; i++) {
        if (rurl.indexOf(urls[i]) === 0) {
          console.log("responseOnReceived: req.requestId", req.requestId, rurl);
          resolve(req.requestId);
          break;
        }
      }

    });

  })
}

async function responseDataOnReceived(Network, urls) {
  const resid = await responseOnReceived(Network, urls);
  const data = await Network.getResponseBody({ requestId: resid });

  return data;
}

async function navigateUntilReceive(Page, Network, url, reurls) {
  Page.navigate({ url: url });

  if (!reurls) reurls = [url];
  const data = await responseDataOnReceived(Network, reurls);

  return data;
}

function Base64ToImageNArray(data, type) {
  return new Promise(function (resolve, reject) {
    pixelsUtil(new Buffer(data, 'base64'), type, function (err, pixels) {
      const image = {
        width: pixels.shape[0],
        height: pixels.shape[1],
        data: pixels.data
      };
      resolve(image);
    })
  })
}

async function querySelector(DOM, selector) {
  const { root: { nodeId: documentNodeId } } = await DOM.getDocument();

  const { nodeId } = await DOM.querySelector({
    selector: selector,
    nodeId: documentNodeId
  });

  return nodeId;
}

async function getDomAttributes(DOM, selector) {
  const nid = await querySelector(DOM, selector);
  if (nid===0) return null;

  const { attributes: atts } = await DOM.getAttributes({ nodeId: nid });
  const obj = {}

  for (let i = 0; i < atts.length; i += 2) {
    obj[atts[i]] = atts[i + 1];
  }
  return obj;
}

async function doLogin(DOM, Page, Network, Runtime) {
  const s = new Date();
  console.log("login------------start")

  const data = await navigateUntilReceive(Page, Network, 'https://user.lu.com/user/login?returnPostURL=https%3A%2F%2Flist.lu.com%2Flist%2Ftransfer-p2p', ['https://user.lu.com/user/captcha/captcha.jpg?']);
  const image = await Base64ToImageNArray(data.body, 'image/jpeg');

  await Runtime.evaluate({
    expression: "document.querySelector('#userNameLogin').value='15562566314';"
  });

  await Runtime.evaluate({
    expression: "document.querySelector('#pwd').value='Yangj1anhua'"
  });

  await Runtime.evaluate({
    expression: "Login_NS.doCheckUser()"
  });

  const auth = await responseDataOnReceived(Network, ['https://user.lu.com/user/service/login/captcha-authorize']);
  const authbody = JSON.parse(auth.body);
  console.log("----", authbody)
  if (authbody.captcha === 'true') {
    const captchaStr = captchautil.crackCaptcha(image);
    //const captchaAtts = await getDomAttributes(DOM, '#validNum');
    await Runtime.evaluate({
      expression: "document.querySelector('#validNum').value='" + captchaStr + "';"
    });

    console.log("validNum---------", captchaStr)
    Runtime.evaluate({
      expression: "document.querySelector('#loginBtn').click()"
    });

    const precheck = await responseDataOnReceived(Network, ['https://user.lu.com/user/captcha/pre-check?']);
    console.log("-------", precheck)
  } else {

    await Runtime.evaluate({
      expression: "document.querySelector('#loginBtn').click()"
    });
  }

  const loginres = await responseDataOnReceived(Network, ['https://user.lu.com/user/login?']);
  const loginstatus = JSON.parse(loginres.body).resultId;

  console.log("login------------end", loginstatus, new Date() - s);
  return loginstatus === '00';
}

async function showDetail(Page, DOM, Runtime, Network, url) {
  const prdid = url.match(/\?productId=([0-9]+)/)[1];
  console.log("showDetail prdid", prdid)
  await navigate(Page, url);
  // http://www.lu.com/notFound.html
  const btnAtts = await getDomAttributes(DOM, '.btns.btn_xlarge.investBtn.sk-area-trigger');
  if (!btnAtts) return false;

  await Runtime.evaluate({
    expression: "document.querySelector('.btns.btn_xlarge.investBtn.sk-area-trigger').click()"
  });

  const in_req = await responseDataOnReceived(Network, ['https://list.lu.com/list/itrading/invest-check']);
  //const in_rep = await Network.getResponseBody({ requestId: in_reqId });
  const invest_check = JSON.parse(in_req.body);

  
  console.log("invest_check", invest_check);
  
  if (invest_check.data.code !== "66") return false;

  //await pageOnload(Page);
  //https://trading.lu.com/trading/service/trade/product/149690091/trade-info?_=1497187665327
  //https://my.lu.com/my/insurance-account-switch?jsoncallback=jQuery17200036755654791844616_1497187665070&_=1497187665190
  await responseOnReceived(Network, ["https://trading.lu.com/trading/service/trade/product/" + prdid + "/trade-info?",
  "https://www.lup2p.com/trading/service/trade/product/" + prdid + "/trade-info?"])
  //https://www.lup2p.com/trading/information-change
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

  const ck_status_res = await responseDataOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/product/"+prdid+"/check-status?",
    "https://trading.lu.com/trading/service/trade/product/"+prdid+"/check-status?"]);
  const ck_status = JSON.parse(ck_status_res.body);

  if (!ck_status.result) {
    console.log("check status", ck_status_res);
    return false;
  }

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
  ck_status = await responseDataOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/product/" + prdid + "/check-status?"
    , "https://trading.lu.com/trading/service/trade/product/" + prdid + "/check-status?"]);

  console.log("ck_check===========", ck_status);

  const create_captcha = await responseDataOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/captcha/create-captcha"
    , "https://trading.lu.com/trading/service/trade/captcha/create-captcha"]);

  console.log("create_captcha------", create_captcha)

  const captcha = await responseDataOnReceived(Network, ['https://user.lu.com/user/captcha/get-captcha?']);
  const image = await Base64ToImageNArray(captcha.body, 'image/jpeg');
  //captcha.body = base64 image;
  const captchaStr = captchautil.crackCaptcha(image);
  await Runtime.evaluate({
    expression: "document.getElementById('inputValid').value='" + captchaStr + "'"
  });
  console.log("captchaStr", captchaStr)
  const tradeCode = '19801221jy';
  await Runtime.evaluate({
    expression: "document.getElementById('tradeCode').value='" + tradeCode + "'"
  });


}

async function listTransfer(Page, DOM, Network) {
  const s = new Date();
  console.log("listTransfer------------start")
  //await navigate(Page, 'https://list.lu.com/list/transfer-p2p?minMoney=&maxMoney='+BuyPriceMax+'&minDays=&maxDays=&minRate=&maxRate=&mode=&tradingMode=&isOverdueTransfer=&isCx=&currentPage=1&orderCondition=&isShared=&canRealized=&productCategoryEnum=&notHasBuyFeeRate=&riskLevel=');
  await navigateUntilReceive(Page, Network, 'https://list.lu.com/list/transfer-p2p?minMoney=&maxMoney='+BuyPriceMax+'&minDays=&maxDays=&minRate=&maxRate=&mode=&tradingMode=&isOverdueTransfer=&isCx=&currentPage=1&orderCondition=&isShared=&canRealized=&productCategoryEnum=&notHasBuyFeeRate=&riskLevel='
  , ['https://list.lu.com/list/transfer-p2p?']);
  
  console.log("navigateUntilReceive--------------")
  const { root: { nodeId: documentNodeId } } = await DOM.getDocument();
  const { nodeIds: itemNodeIds } = await DOM.querySelectorAll({
    selector: 'li.product-list.has-bottom.transfer-list.clearfix',
    nodeId: documentNodeId,
  });


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
    if (prc > BuyPriceMax) continue;
    console.log("html------------", prc, Number(rateMatch[1]))

    const urlMatch = html.match(/<a href="(.+)" target="_blank" class="ld-btn ld-btn-primary">投资<\/a>/);

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

  await doLogin(DOM, Page, Network, Runtime);

  let turl = null;
  do {
    await timeout(100);
    turl = await listTransfer(Page, DOM, Network);
    console.log("listTransfer", turl)
    if (turl) {
      const status = await showDetail(Page, DOM, Runtime, Network, turl);
    }
    
  } while (true);

  console.log("---------------close")
  protocol.close();

}).on('error', err => {
  throw Error('Cannot connect to Chrome:' + err);
});

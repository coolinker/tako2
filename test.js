const chrome = require('chrome-remote-interface');
const pixelsUtil = require("get-pixels");
const captchautil = require("./captchautil");
const simplehttp = require("./simplehttp");
const users = require("./users");
const BuyPriceMax = 16000, BuyPriceMin = 1500;
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
  console.log("responseOnReceived..")
  return new Promise(function (resolve, reject) {
    Network.responseReceived((req) => {
      //https://www.lup2p.com/trading/service/trade/contract-list?
      const rurl = req.response.url;
      let rid;
      for (let i = 0; i < urls.length; i++) {
        if (rurl.indexOf(urls[i]) === 0) {
          rid = req.requestId
          break;
        }
      }
      if (rid)
        console.log("responseOnReceived: req.requestId", req.requestId, rurl);

      if (rid) resolve(rid);

    });

  })
}

async function responseDataOnReceived(Network, urls) {
  const resid = await responseOnReceived(Network, urls);
  console.log("responseDataOnReceived------", resid)
  const data = await Network.getResponseBody({ requestId: resid });
  console.log("responseDataOnReceived------", data)
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
  if (nid === 0) return null;

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
    expression: "document.querySelector('#userNameLogin').value='"+users[user].phone+"';"
  });

  await Runtime.evaluate({
    expression: "document.querySelector('#pwd').value='"+users[user].password+"'"
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

async function showDetail(Page, DOM, Runtime, Network, pid) {
  const prdid = pid;
  const url = 'https://list.lu.com/list/productDetail?productId='+pid;
  console.log("showDetail prdid", pid)

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

  if (btnNodeId === 0) return false;

  await Runtime.evaluate({
    expression: "document.querySelector('a.btns.btn_large').click()"
  });

  const ck_status_res = await responseDataOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/product/" + prdid + "/check-status?",
  "https://trading.lu.com/trading/service/trade/product/" + prdid + "/check-status?"]);
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

  // 
  // await responseOnReceived(Network, ["https://www.lup2p.com/trading/security-valid",
  //   "https://trading.lu.com/trading/security-valid"])
  //https://www.lup2p.com/trading/service/trade/product/149703412/check-status?_=1497194882925
  // https://trading.lu.com/trading/service/trade/trace

  const ck_status_rep1 = await responseDataOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/product/" + prdid + "/check-status?"
    , "https://trading.lu.com/trading/service/trade/product/" + prdid + "/check-status?"]);

  console.log("ck_check===========", ck_status_rep1);

  const ck_status1 = JSON.parse(ck_status_rep1.body);

  if (!ck_status1.result) {
    console.log("check status", ck_status_rep1);
    return false;
  }


  const create_captcha = await responseDataOnReceived(Network, ["https://www.lup2p.com/trading/service/trade/captcha/create-captcha"
    , "https://trading.lu.com/trading/service/trade/captcha/create-captcha"]);

  console.log("create_captcha------", create_captcha)
  const cr_captcha = JSON.parse(create_captcha.body);
  if (cr_captcha.retCode === '01') return false;

  const captcha = await responseDataOnReceived(Network, ['https://user.lu.com/user/captcha/get-captcha?']);
  const image = await Base64ToImageNArray(captcha.body, 'image/jpeg');
  //captcha.body = base64 image;
  const captchaStr = captchautil.crackCaptcha(image);
  await Runtime.evaluate({
    expression: "document.getElementById('inputValid').value='" + captchaStr + "'"
  });
  console.log("captchaStr", captchaStr)
  const tradeCode = users[user].tradeCode;
  await Runtime.evaluate({
    expression: "document.getElementById('tradeCode').value='" + tradeCode + "'"
  });

  await Runtime.evaluate({
    expression: "document.getElementById('validBtn').click()"
  });


}
async function listTransferM3024(Page, DOM, Network) {
  console.log("listTransferM3024...")
  const options = {};
  options.form = {
    requestCode: "M3024",
    version: "3.4.9",
    params: '{"cookieUserName":"","readListType":"trans_p2p","filterBeginInvestPeriodInDay":"10","width":720,"listType":"trans_p2p","pageSize":"15","ver":"1","isForNewUser":"false","productSortType":"INTEREST_RATE_DESC","forNewUser":"false","pageIndex":"1","filterEndTransPrice":"' + 1 + '","source":"android","filterBeginTransPrice":"0.2","currentPage":"1"}'
  };

  options.headers = {
    "mobile_agent": "appVersion:3.4.9,platform:android,osVersion:17,device:GT-P5210,resourceVersion:2.7.0,channel:H5",
    "X-LUFAX-MOBILE-DATA-AGENT": '',
    "x-lufax-mobile-t": '',
    "x-lufax-mobile-signature": ''
  }

  // const rsp = await simplehttp.GET('https://list.lu.com/list/transfer-p2p?minMoney=' + BuyPriceMin + '&maxMoney=' + BuyPriceMax + '&minDays=&maxDays=&minRate=&maxRate=&mode=&tradingMode=&isOverdueTransfer=&isCx=&currentPage=1&orderCondition=&isShared=&canRealized=&productCategoryEnum=&notHasBuyFeeRate=&riskLevel=');
  // console.log(rsp.body.length)
  const rsp = await simplehttp.POST('https://ma.lu.com/mapp/service/public?M3024&listType=trans_p2p?_'+Math.round(Math.random() * 100000), options);
  const bodyJson = JSON.parse(rsp.body);
//   {"code":"0000","subcode":"","message":"","lid":"T-02f84158-14e7-4c0f-b2b0-4081d6913202_113620221","result":{"totalCount":1,"totalPage":1,"prePage":0,"nextPage":
// 1,"currentPage":1,"model":"products",
// "products":[{"productList":
//     [{"id":150196074,"price":8781.2,"principal":8756.68,"interestRate":"0.084","numOfInstalments":31
// ,"sourceId":310963071,"publishedAt":"Jun 17, 2017 11:36:16 AM","code":"170617027385","productType":"TRANSFER_REQUEST","productStatus":"ONLINE","collectionMode":
// "1","productName":"1","tradingMode":"00","mgmtFeeRate":0,"feeDisplayFlag":"false","extOnlineDianjinCount":0,"sourceType":"9","maxInvestAmount":8781.2,"minInvest
// Amount":8781.2,"remainingAmoun

  if (bodyJson.code === "0000" && bodyJson.result.totalCount > 0) {
    const prds = bodyJson.result.products[0].productList;
    for (let i=0; i<prds.length; i++) {
      if (prds[i].productStatus === 'ONLINE' &&  Number(prds[i].interestRate) >= 0.084 && prds[i].price > BuyPriceMin && prds[i].price < BuyPriceMax) {
        console.log("---", prds[i]);
        return prds[i].id;
      }
    }
  }

  return null;
}

async function listTransfer(Page, DOM, Network) {
  console.log("listTransfer...")
  await navigate(Page, 'https://list.lu.com/list/transfer-p2p?minMoney=' + BuyPriceMin + '&maxMoney=' + BuyPriceMax + '&minDays=&maxDays=&minRate=&maxRate=&mode=&tradingMode=&isOverdueTransfer=&isCx=&currentPage=1&orderCondition=&isShared=&canRealized=&productCategoryEnum=&notHasBuyFeeRate=&riskLevel=');

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

    const urlMatch = html.match(/<a href="\/list\/productDetail\?productId=(.+)" target="_blank" class="ld-btn ld-btn-primary">投资<\/a>/);

    return Number(urlMatch[1]);
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

  let pid = null;
  let lpid = null;
  do {
    const s = new Date();
    await timeout(300);
    pid = await listTransferM3024(Page, DOM, Network);
    await timeout(500);
    if (!pid) pid = await listTransfer(Page, DOM, Network);
    await timeout(300);
    if (!pid) pid = await listTransferM3024(Page, DOM, Network);
    await timeout(500);
    if (!pid) pid = await listTransfer(Page, DOM, Network);
    
    console.log("\nlistTransfer", pid, new Date() - s);

    if (pid && lpid !== pid) {
      const status = await showDetail(Page, DOM, Runtime, Network, pid);
      lpid = pid;
      pid = null;
    }

  } while (true);

  console.log("---------------close")
  protocol.close();

}).on('error', err => {
  throw Error('Cannot connect to Chrome:' + err);
});

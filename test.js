const chrome = require('chrome-remote-interface');

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

async function doLogin(Page, Runtime) {
  const s = new Date();
  console.log("login------------start")
  await navigate(Page, 'https://user.lu.com/user/login?returnPostURL=https%3A%2F%2Flist.lu.com%2Flist%2Ftransfer-p2p');

  await Runtime.evaluate({
    expression: "document.querySelector('#userNameLogin').value='13810394810'; document.querySelector('#pwd').value='B3ijingl19'"
  });

  await Runtime.evaluate({
    expression: "document.querySelector('#pwd').value='B3ijingl19'"
  });
  await Runtime.evaluate({
    expression: "document.querySelector('#loginBtn').click()"
  });
  console.log("------------end", new Date() - s);
  return true;
}

async function showDetail(Page, DOM, url) {
  await navigate(Page, url);
  await Runtime.evaluate({
    expression: "document.querySelector('.btns.btn_xlarge.investBtn.sk-area-trigger').click()"
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
    if (rateMatch && Number(rateMatch[1]) < 8.4) continue;
    const prcMatch = html.match(/<p><em class="num-style">([0-9.,]*)<\/em>元<\/p>/);
    if (!prcMatch) continue;
    let prc = Number(prcMatch[1].replace(',', ''));

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

  //await doLogin(Page, Runtime);
  let turl = null;
  do {
    await timeout(2000);
    turl = await listTransfer(Page, DOM);
    console.log("listTransfer", turl)

  } while (!turl);

  await showDetail(Page, DOM, turl);


  console.log("---------------close")
  protocol.close();

}).on('error', err => {
  throw Error('Cannot connect to Chrome:' + err);
});

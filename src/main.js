const puppeteer = require('puppeteer');
const request = require('request')
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const http =  require('http');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
    //slowMo: 10,
    defaultViewport:{
        width: 1920,
        height: 1080,
        isLandscape: true
    }
  });
  const page = await browser.newPage();
  await page.goto('http://ghzy.hangzhou.gov.cn/col/col1228968054/index.html', {timeout: 300000});
  page.waitForSelector('span.default_pgTotalPage');
  let totalPageElem = await page.$('span.default_pgTotalPage');
  totalPage = await page.$eval('span.default_pgTotalPage', (element) => {
    return element.innerHTML;
  })
  totalPage = Number(totalPage)
  console.log(typeof totalPage, totalPage);
  for (planPage = 1 ; planPage<= totalPage; planPage++){
    await page.$eval('input.default_pgCurrentPage',input => input.value='' );
    await page.type('input.default_pgCurrentPage', planPage+'');
    await page.keyboard.press('Enter');
    await page.waitFor(1000);
    await page.waitFor(() => !document.querySelector('.default_mask'));
    await handlePlanItems();
  }

 async function handlePlanItems() {
  const planItems = await page.$$('table.publicityCss tbody tr:not(:first-child)  td:first-child a');
      for(planItem of planItems){
        const planItemTitle = await page.evaluate((element)=> element.title, planItem);
        if(planItemTitle.search('地铁') != -1){
          const newPagePromise = new Promise(res => 
            browser.once('targetcreated', 
              target => res(target.page())
            )
          );
        await planItem.click();
        let newPage = await newPagePromise;
        await newPage.waitFor('.notices-block p a');
        const aTag = await newPage.$('.notices-block p a');
        const imgURL = await newPage.evaluate((element)=> element.href, aTag);
        console.log(imgURL);
        await downloadImage(imgURL, planItemTitle, (err, data) => { err ? console.log(err) : console.log(`下载成功！图片地址是：${path.resolve(data)}`) })
        await newPage.close();   
        }
      }
  }
async function downloadImage(src, fileName, callback){
  console.log(src);
  request.head(src, (err, res, body) => {
    if (err) { console.log(err); return }
    src && request(src).pipe(fs.createWriteStream(`./image/${fileName}.jpg`)).on('close', () => {
      callback && callback(null, fileName)
    })
  })
}
})();
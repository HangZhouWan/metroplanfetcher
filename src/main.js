const puppeteer = require('puppeteer');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const http =  require('http');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
    slowMo: 200,
    defaultViewport:{
        width: 1920,
        height: 1080,
        isLandscape: true
    }
  });
  const page = await browser.newPage();
  await page.goto('http://ghzy.hangzhou.gov.cn/col/col1228968050/index.html', {timeout: 300000});
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
        newPage.waitForSelector('.notices-block p a');
        console.log('waiting for a tag');
        const aTag = await newPage.$('.notices-block p a');
        const imgURL = await newPage.evaluate((element)=> element.href, aTag);
        console.log(imgURL);
        await updataImg(imgURL, planItemTitle);
        await newPage.close();   
        }
      }
  }

  async function saveImage(imgURL){
    console.log(imgURL);
    const req = http.request(imgURL, res => {
      res.pipe(fs.createWriteStream(path.basename()));
    });
    req.end();
  }

async function updataImg(url, name){    
    http.get(url, (res) => {        
        let imgData = ''; 
        res.setTimeout(100000);       
        res.setEncoding("binary");        
        res.on('data', (chunk) => {
            imgData += chunk;
        })        
        res.on('end', () => {            
            fs.writeFile(`./image/${name}.jpg`, imgData, 'binary', (error) => {
                if (error) {                    
                            console.log('下载失败');
                } else {                    
                            console.log('下载成功！')
                }
            })
        })
    })
}

})();
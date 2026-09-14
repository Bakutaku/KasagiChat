// ローカルHTML資料の検証。引数にPlaywrightパッケージの場所を指定できる。
const {chromium}=require(process.argv[2] || 'playwright');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 const errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 const network=[];
 page.on('request', r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 const output=path.resolve(__dirname,'qa');fs.mkdirSync(output,{recursive:true});
 const url=pathToFileURL(path.resolve(__dirname,'../feature-flows.html')).href;
 await page.goto(url);
 await page.screenshot({path:path.join(output,'overview.png'),fullPage:true});
 const ids=await page.locator('.navlink').evaluateAll(nodes=>nodes.map(n=>n.hash));
 let steps=0;
 for(const id of ids){
   await page.locator(`.navlink[href="${id}"]`).click();
   await page.waitForFunction(hash=>location.hash===hash,id);
   const buttons=page.locator('[data-step]');
   const boxes=await buttons.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width};}));
   for(let i=1;i<boxes.length;i++)if(boxes[i].top<boxes[i-1].bottom)throw Error('Diagram rows overlap '+id);
   if(boxes.some(r=>r.width<120))throw Error('Diagram nodes too narrow '+id);
   for(let i=0;i<await buttons.count();i++){
     await buttons.nth(i).click();
     if(await buttons.nth(i).getAttribute('aria-pressed')!=='true')throw Error('Step failed '+id+' '+i);
     if(!(await page.locator('#step-detail h3').innerText()).trim())throw Error('Missing detail');
     steps++;
   }
 }
 await page.locator('.navlink[href="#review"]').click();
 await page.screenshot({path:path.join(output,'review.png'),fullPage:true});
 await page.locator('[data-move="1"]').click();
 if(await page.locator('[data-step="1"]').getAttribute('aria-pressed')!=='true')throw Error('Next failed');
 await page.locator('[data-move="-1"]').click();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(overflow)throw Error('Mobile document overflow');
 await page.setViewportSize({width:1440,height:1080});
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
 const sections=await page.locator('#print-area > section').count();
 if(sections!==15)throw Error('Print sections '+sections);
 await page.pdf({path:path.join(output,'print-check.pdf'),preferCSSPageSize:true,printBackground:true});
 if(errors.length || network.length)throw Error(JSON.stringify({errors,network}));
 console.log(JSON.stringify({pages:ids.length,steps,printSections:sections,errors,network,mobileOverflow:overflow,output}));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});

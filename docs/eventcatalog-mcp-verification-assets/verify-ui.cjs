const {chromium}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'America/Chicago'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.argv[2],output=[];
 const routes=['/','/docs/domains/demo/1.0.0/','/docs/services/order-fulfillment--order-events/1.0.0/','/docs/services/order-fulfillment--inventory-reservations/1.0.0/','/docs/services/order-fulfillment--order-events/1.0.0/asyncapi/specification/','/schemas/events/order-fulfillment--order-events-accepted/1.0.0/','/schemas/events/order-fulfillment--order-events-dispatched/1.0.0/','/docs/custom/','/docs/channels/orders/1.0.0/','/docs/channels/audit/1.0.0/','/docs/channels/shipments/1.0.0/','/docs/channels/reservations/1.0.0/'];
 for(const route of routes){const response=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(response.status(),200,route);const text=await page.locator('body').innerText();assert.ok(text.length>100,route);output.push({route,status:response.status(),text});if(route.includes('/domains/'))assert.ok(text.includes('Agent discovery'));}
 await page.goto(base+'/visualiser/domains/demo/1.0.0/',{waitUntil:'networkidle'});await page.waitForSelector('.react-flow__node');
 const graph=await page.locator('.react-flow__node').allTextContents();assert.equal(graph.length,11);
 await page.screenshot({path:process.argv[3]+'.png',fullPage:true});
 await page.goto(base+'/discover/services/',{waitUntil:'networkidle'});
 const link=page.locator('a[href="/docs/services/order-fulfillment--order-events/1.0.0"]').first();await link.click();await page.waitForURL(url=>url.pathname.replace(/\/$/,'')==='/docs/services/order-fulfillment--order-events/1.0.0');
 await page.waitForLoadState('networkidle');assert.match(await page.locator('body').innerText(),/order-events/);
 assert.deepEqual(errors,[]);fs.writeFileSync(process.argv[3],JSON.stringify({output,graph,navigation:page.url(),errors},null,2));
 console.log(JSON.stringify({pages:output.length,graphNodes:graph.length,navigation:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

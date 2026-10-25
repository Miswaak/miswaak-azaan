const {chromium}=require('../release-work/tools/node_modules/playwright');
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{const file=path.join(root,req.url.startsWith('/assets/') ? 'mobile/dist'+decodeURIComponent(req.url.split('?')[0]) : decodeURIComponent(req.url.split('?')[0])); if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404).end();return}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream'); fs.createReadStream(file).pipe(res)});
const timings={fajr:'05:00',sunrise:'06:00',dhuhr:'12:00',asr:'15:00',sunset:'17:55',maghrib:'18:00',isha:'20:00'};
(async()=>{
 console.log('Starting browser tests');
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 for(const [platform,width,height] of [['mobile',334,740],['mobile',390,844],['mobile',520,900],['desktop',760,680],['desktop',980,760]]){
  const context=await browser.newContext({viewport:{width,height},timezoneId:'Asia/Tokyo'});
  console.log('Testing',platform,width); const page=await context.newPage(); page.setDefaultTimeout(15000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-25T05:29:00+09:00')});
  await page.clock.pauseAt(new Date('2026-10-25T05:30:00+09:00'));
  await page.route('https://api.aladhan.com/**',route=>route.fulfill({json:{code:200,data:{timings:{Fajr:'05:00',Sunrise:'06:00',Dhuhr:'12:00',Asr:'15:00',Sunset:'17:55',Maghrib:'18:00',Isha:'20:00'}}}}));
  await page.route('https://miswaak.github.io/**',route=>route.fulfill({json:{}}));
  if(platform==='desktop') await page.addInitScript(({timings})=>{
   const config={location:{city:'Tokyo',country:'Japan',timezone:'Asia/Tokyo',latitude:35.67,longitude:139.65},prayer:{},app:{autoDetectOnFirstRun:false}};
   window.azaan={getConfig:async()=>config,getPrayerTimes:async()=>({location:config.location,timings,nextPrayer:{key:'dhuhr',label:'Dhuhr',time:'12:00'},date:'25 Oct 2026',method:'Muslim World League',timezone:'Asia/Tokyo'}),checkForUpdates:async()=>null,getAzaanAudioUrl:async()=>'/mobile/dist/assets/rayhan-azaan-all4-CnfI8u9I.m4a'};
  },{timings});
  console.log('Navigating'); await page.goto(base+(platform==='mobile'?'/mobile/dist/index.html':'/app-asar-work/src/renderer/index.html'));
  console.log('Loaded'); const next=page.locator(platform==='mobile'?'#nextPrayerName':'#nextPrayer');
  await next.filter({hasText:'Dhuhr'}).waitFor();
  assert.equal(await page.locator('#countdownLabel').textContent(),'06:30:00');
  await page.clock.runFor(2000);
  assert.equal(await page.locator('#countdownLabel').textContent(),'06:29:58');
  const list=page.locator(platform==='mobile'?'#prayerList':'#timesGrid');
  assert.equal(await list.locator(platform==='mobile'?'.prayer-row':'.time-card').count(),7);
  assert.match(await list.textContent(),/Sunrise.*[Tt]ime only/); assert.match(await list.textContent(),/Sunset.*[Tt]ime only/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false,`${platform} ${width} horizontal overflow`);
  await page.screenshot({path:path.join(root,'release-work',`${platform}-${width}.png`),fullPage:true});
  if(platform==='mobile'&&width===390){
   await page.locator('#testAzaanButton').click(); await page.waitForFunction(()=>document.querySelector('#testAzaanButton').textContent==='Stop Azaan');
   await page.locator('#testAzaanButton').click(); assert.equal(await page.locator('#testAzaanButton').textContent(),'Test Azaan');
   await page.clock.fastForward(6.5*3600000); assert.equal(await next.textContent(),'Asr');
   assert.equal(await page.locator('.prayer-row.is-next strong').textContent(),'Asr');
  }
  assert.deepEqual(errors,[]); console.log(`PASS: ${platform} ${width}px, seven timings, running countdown, no overflow or JavaScript errors.`);
  await context.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{server.closeAllConnections();server.close()});

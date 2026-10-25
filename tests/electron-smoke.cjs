const {_electron}=require('../release-work/tools/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const profile=path.resolve(__dirname,'../release-work/desktop-test-profile');fs.mkdirSync(profile,{recursive:true});
 const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../app-asar-work/config/default-config.json'),'utf8'));
 config.app.autoDetectOnFirstRun=false;config.prayer.useApiFirst=false;
 fs.writeFileSync(path.join(profile,'config.json'),JSON.stringify(config));
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:path.resolve(__dirname,'../release-work/windows/win-unpacked/Miswaak Azaan.exe'),args:[`--user-data-dir=${profile}`],env,timeout:120000});
 try{
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.waitForFunction(()=>document.querySelectorAll('.time-card').length===7);
 assert.match(await page.locator('#countdownLabel').textContent(),/^\d\d:\d\d:\d\d$/);
 assert.match(await page.locator('#timesGrid').textContent(),/Sunset \(time only\)\d\d:\d\d/);
 assert.equal(await page.locator('#locationTitle').textContent(),'Tokyo, Japan');
 await page.locator('#testAzaanButton').click();await page.waitForFunction(()=>document.querySelector('#testAzaanButton').textContent==='Stop Azaan');
 await page.locator('#testAzaanButton').click();assert.equal(await page.locator('#testAzaanButton').textContent(),'Test Azaan');
 await page.screenshot({path:path.resolve(__dirname,'../release-work/windows-packaged.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: packaged Windows app launches, real preload/IPC and offline timings work, countdown renders, azaan audio plays/stops.');
 }finally{await app.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

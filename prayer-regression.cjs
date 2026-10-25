const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const timings = {fajr:'05:00', sunrise:'06:00', dhuhr:'12:00', asr:'15:00', sunset:'17:55', maghrib:'18:00', isha:'20:00'};
function context(file, mobile) {
  let code = fs.readFileSync(file, 'utf8');
  if (mobile) code = code.replace(/^import .*;\s*/gm, '').replace(/new URL\([^\n]+import.meta.url\).href/g, '"audio"').split('\nbindEvents();')[0];
  else code = code.split('\ninit().catch')[0];
  const nodes = new Map();
  const node = key => { if (!nodes.has(key)) nodes.set(key, {textContent:'', style:{},classList:{toggle(){}},querySelectorAll(){return []}}); return nodes.get(key); };
  let now;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now(){ return now; } }
  const ctx = vm.createContext({Date:Clock, Intl, URL, Set, Map, localStorage:{getItem(){return null}},document:{querySelector:node},window:{},Capacitor:{isNativePlatform(){return false}},console});
  vm.runInContext(code, ctx);
  return {ctx, nodes, setTime(value){now = new Date(value).getTime();}};
}
const mobile = context('mobile/src/app.js', true);
vm.runInContext('state.timings = '+JSON.stringify(timings), mobile.ctx);
for (const [time, expected] of [['05:30','dhuhr'],['17:54','maghrib'],['18:00','isha'],['21:00','fajr']]) {
  mobile.setTime(`2026-10-25T${time}:00`);
  assert.equal(vm.runInContext('getNextPrayer(state.timings).key', mobile.ctx),expected);
}
mobile.setTime('2026-10-25T11:59:59');
vm.runInContext('state.nextPrayer = getNextPrayer(state.timings); updateCountdown()',mobile.ctx);
assert.equal(mobile.nodes.get('#countdownLabel').textContent,'00:00:01');
mobile.setTime('2026-10-25T12:00:00');
vm.runInContext('updateCountdown()', mobile.ctx);
assert.equal(vm.runInContext('state.nextPrayer.key',mobile.ctx),'asr');
const desktop=context('app-asar-work/src/renderer/renderer.js',false);
vm.runInContext('state.config={location:{timezone:"Asia/Tokyo"}}; state.prayerData={timings:'+JSON.stringify(timings)+'}', desktop.ctx);
for(const [time,expected] of [['05:30','dhuhr'],['17:54','maghrib'],['18:00','isha'],['21:00','fajr']]) {
 desktop.setTime(`2026-10-25T${time}:00+09:00`);
 vm.runInContext('updateCountdown()',desktop.ctx);
 assert.equal(vm.runInContext('state.prayerData.nextPrayer.key',desktop.ctx),expected);
}
assert.equal(desktop.nodes.get('#countdownLabel').textContent,'08:00:00');
console.log('PASS: both platforms skip sunrise/sunset, advance at prayer boundaries, and count down across midnight.');
// Extended native scheduling checks run independently of the device bridge.
(async () => {
 const scheduled=[]; const cancelled=[]; const removed=[];
 mobile.ctx.Capacitor.isNativePlatform=()=>true;
 mobile.ctx.LocalNotifications={
   requestPermissions:async()=>({display:'granted'}), createChannel:async()=>{},
   cancel:async x=>cancelled.push(x), removeDeliveredNotifications:async x=>removed.push(x),
   schedule:async x=>scheduled.push(x)
 };
 for (const key of ['sunrise','sunset']) {
   vm.runInContext(`state.nextPrayer={key:'${key}',label:'${key}'}`,mobile.ctx);
   await vm.runInContext('scheduleNextPrayerNotification()',mobile.ctx);
 }
 assert.equal(scheduled.length,0);
 for (const [key,label] of [['fajr','Fajr'],['dhuhr','Dhuhr'],['asr','Asr'],['maghrib','Maghrib'],['isha','Isha']]) {
   vm.runInContext(`state.nextPrayer={key:'${key}',label:'${label}',at:new Date()}`,mobile.ctx);
   await vm.runInContext('scheduleNextPrayerNotification()',mobile.ctx);
   const notice=scheduled.at(-1).notifications[0];
   assert.equal(notice.title,`${label} Azaan`);
   assert.equal(notice.sound,key==='fajr'?'rayhan_azaan_fajr.m4a':'rayhan_azaan_all4.m4a');
 }
 assert.equal(cancelled.length,6); assert.equal(removed.length,1);
 assert.equal(new Set(scheduled.map(x=>x.notifications[0].id)).size,5);
 assert.equal(cancelled[0].notifications[0].id,1001);
 assert.notEqual(scheduled[0].notifications[0].id,scheduled[1].notifications[0].id);
 mobile.ctx.LocalNotifications.requestPermissions=async()=>({display:'denied'});
 await vm.runInContext('scheduleNextPrayerNotification()',mobile.ctx);
 assert.equal(scheduled.length,5);
 console.log('PASS: native scheduler rejects solar events, clears legacy alerts, selects correct audio for all five prayers, handles permission denial.');
})().catch(error=>{console.error(error);process.exitCode=1});

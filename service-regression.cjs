const assert=require('node:assert/strict');
const {calculateOfflinePrayerTimes}=require('./app-asar-work/src/services/offlineCalculator');
const {getPrayerTimes}=require('./app-asar-work/src/services/prayerService');
const {fetchPrayerTimesFromAladhan}=require('./app-asar-work/src/services/aladhanClient');
const config=require('./app-asar-work/config/default-config.json');
const log={info(){},warn(){}};
(async()=>{
 const result=calculateOfflinePrayerTimes(config,new Date(2026,9,25),log);
 for(const key of ['fajr','sunrise','dhuhr','asr','sunset','maghrib','isha']) assert.match(result.timings[key],/^\d{2}:\d{2}$/);
 const values={Fajr:'05:00',Sunrise:'06:00',Dhuhr:'12:00',Asr:'15:00',Sunset:'17:55',Maghrib:'18:00',Isha:'20:00'};
 global.fetch=async()=>({ok:true,json:async()=>({code:200,data:{timings:values}})});
 const api=await fetchPrayerTimesFromAladhan(config,new Date(),log);
 assert.equal(api.timings.sunset,'17:55'); assert.equal(api.timings.maghrib,'18:00');
 global.fetch=async()=>{throw new Error('offline')};
 const fallback=await getPrayerTimes(config,log);
 assert.equal(fallback.source,'offline'); assert.ok(fallback.timings.sunset);
 console.log('PASS: desktop offline solar times, distinct API sunset/Maghrib, API-failure fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});

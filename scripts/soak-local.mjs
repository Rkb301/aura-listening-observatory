#!/usr/bin/env node
// Read-only local reliability sampling. Does not change playback, repeat,
// volume, Spotify library, systemd services, or device settings.
import {inspectSample,makeSummary,recordSample} from '../lib/soak-check.mjs';
const base='http://127.0.0.1:4373';
const duration=Number(process.env.AURA_SOAK_SECONDS??60);
const interval=Number(process.env.AURA_SOAK_INTERVAL_MS??5000);
if(!Number.isInteger(duration)||duration<10||duration>86400||!Number.isInteger(interval)||interval<1000||interval>60000)
 throw Error('Use AURA_SOAK_SECONDS=10..86400 and AURA_SOAK_INTERVAL_MS=1000..60000');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const summary=makeSummary(duration,interval);
const end=Date.now()+duration*1000;
async function json(path){const res=await fetch(base+path,{signal:AbortSignal.timeout(3000)});if(!res.ok)throw Error(path+' HTTP '+res.status);return res.json();}
while(true){
 try{
  const [h,s]=await Promise.all([json('/api/health'),json('/api/soloist/state')]);
  recordSample(summary,inspectSample(h,s));
 }catch(error){recordSample(summary,{healthy:false,failures:['connection_or_playback','wrong_song','repeat_disabled','volume_changed'],version:'unknown'});summary.firstError??=String(error.message).slice(0,180);}
 const left=end-Date.now();if(left<=0)break;await sleep(Math.min(interval,left));
}
console.log(JSON.stringify(summary,null,2));
if(summary.failures)process.exitCode=1;

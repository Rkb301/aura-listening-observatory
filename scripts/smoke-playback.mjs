#!/usr/bin/env node
// AURA playback smoke test against the local canonical service.
// Live test: changes playback. Always restores ANTIFRAGILE at a safe volume.
// Never reads or prints credentials.
const BASE='http://127.0.0.1:4373';
const TRACK='spotify:track:4fsQ0K37TOXa3hEQfjEic1';
const VOLUME=32;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fetchJson=async(url,opts={})=>{
 const res=await fetch(BASE+url,{signal:AbortSignal.timeout(6500),...opts});
 const data=await res.json();
 if(!res.ok)throw new Error(`HTTP ${res.status}: ${data.error||'unknown'}`);
 return data;
};
const bootstrap=await fetchJson('/api/bootstrap');
if(!bootstrap.spotify?.loggedIn||!bootstrap.soloist?.connected||!bootstrap.soloist?.auth?.logged_in)
 throw new Error('AURA must be authorized, paired and connected before live playback testing.');
const headers={'Content-Type':'application/json','X-Aura-Request':bootstrap.csrf};
const cmd=async(command,more={})=>{
 const res=await fetchJson('/api/soloist/command',{method:'POST',headers,body:JSON.stringify({command,...more})});
 if(!res.accepted)throw new Error('Soloist did not accept command: '+command);
};
const current=async()=>await fetchJson('/api/soloist/state');
const until=async(label,pred,timeout=3600)=>{
 const end=Date.now()+timeout;
 while(Date.now()<end){const s=await current();if(pred(s))return s;await delay(200);}
 throw new Error('Timed out waiting for '+label);
};
const results=[];
let originalShuffle=null;
async function step(name,action,condition){
 await action();
 if(condition)await until(name,condition);
 results.push({check:name,status:'pass'});
 console.log('PASS',name);
}
try{
 console.log('Beginning AURA supervised playback check. Will restore ANTIFRAGILE.');
 await step('pause',()=>cmd('pause'),s=>s.playback?.status==='paused');
 await step('resume',()=>cmd('play'),s=>s.playback?.status==='playing');
 await step('seek to 30 seconds',()=>cmd('seek',{position_ms:30000}),
  s=>Math.abs((s.playback?.position?.position_ms||0)-30000)<6000);
 await step('volume 25%',()=>cmd('set_volume',{volume:25}),s=>s.playback?.volume===25);
 // Leave the listening queue intact; no destructive library writes.
 await step('volume 32%',()=>cmd('set_volume',{volume:VOLUME}),s=>s.playback?.volume===VOLUME);
 const playback=(await current()).playback||{};
 const options=playback.options||{};
 const hasShuffleableContext=/^spotify:(album|playlist|artist|show):/.test(playback.context?.uri||'');
 if(!hasShuffleableContext){
   console.log('SKIP shuffle: single-track context has no multi-track sequence. Verify separately with a real playlist.');
 }else if(typeof options.shuffle==='boolean'){
   originalShuffle=options.shuffle;
   const observe=async(label,enabled)=>{
     await cmd('set_shuffle',{enabled});
     await delay(850); // Spotify Connect applies playback settings asynchronously.
     await cmd('get_state');
     await until(label,s=>s.playback?.options?.shuffle===enabled,6500);
     results.push({check:label,status:'pass'});
     console.log('PASS',label);
   };
   await observe('shuffle toggle',!originalShuffle);
   await observe('shuffle restore',originalShuffle);
 }
 console.log('Smoke check complete:',results.length,'passed.');
}finally{
 try{
   // Restore any temporarily changed shuffle setting even if a check failed.
   if(originalShuffle!==null){await cmd('set_shuffle',{enabled:originalShuffle});await delay(450);}
   // First lower the volume: changing tracks can momentarily reset Soloist volume.
   await cmd('set_volume',{volume:VOLUME});
   await cmd('play',{uri:TRACK});
   await until('ANTIFRAGILE playback',s=>s.playback?.item?.uri===TRACK&&s.playback?.status==='playing',8500);
   await delay(450);
   await cmd('set_volume',{volume:VOLUME});
   const final=await until('restored volume',s=>s.playback?.volume===VOLUME,4200);
   console.log('RESTORED',JSON.stringify({track:final.playback?.item?.decorations?.identity?.name,playing:final.playback?.status,volume:final.playback?.volume}));
 }catch(error){console.error('WARNING: playback restore needs attention:',error.message);process.exitCode=1;}
}

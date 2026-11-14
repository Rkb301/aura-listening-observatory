#!/usr/bin/env node
// Optional interactive live test: temporarily plays a pinned Spotify playlist,
// checks actual Shuffle state, and restores ANTIFRAGILE at volume 32.
// Never run as an unattended background monitor.
const base='http://127.0.0.1:4373';
const restoreUri='spotify:track:4fsQ0K37TOXa3hEQfjEic1';
const volume=32;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){
  const res=await fetch(base+url,{signal:AbortSignal.timeout(9000)});
  if(!res.ok)throw new Error('Local '+url+' returned '+res.status);
  return res.json();
}
const bootstrap=await get('/api/bootstrap');
if(!bootstrap.spotify?.loggedIn||!bootstrap.soloist?.connected)
  throw new Error('Connect AURA Spotify and Soloist before testing.');
const headers={'Content-Type':'application/json','X-Aura-Request':bootstrap.csrf};
const state=()=>get('/api/soloist/state');
const command=async (command,extra={})=>{
  const res=await fetch(base+'/api/soloist/command',{
    method:'POST',headers,body:JSON.stringify({command,...extra}),signal:AbortSignal.timeout(9000)
  });
  const body=await res.json();
  if(!res.ok||!body.accepted)throw new Error('Soloist did not accept '+command+': '+(body.error||res.status));
};
const waitFor=async(label,pred,ms=8000)=>{
 const stop=Date.now()+ms;
 while(Date.now()<stop){const s=await state();if(pred(s))return s;await delay(280);}
 throw new Error('Timed out checking '+label);
};
const backup=await get('/api/mixes');
const pin=backup.items?.find(x=>/^spotify:playlist:[A-Za-z0-9]{10,64}$/.test(x.uri));
if(!pin)throw new Error('No locally pinned playlist is available for this test.');
const initial=(await state()).playback?.options?.shuffle===true;
let success=false;
try{
  console.log('Switching temporarily to an existing pinned Spotify playlist (no playlist modifications).');
  await command('set_volume',{volume});
  await command('play',{uri:pin.uri});
  await waitFor('playlist context',s=>s.playback?.context?.uri===pin.uri&&
    ['playing','buffering'].includes(s.playback?.status),14000);
  await command('set_shuffle',{enabled:!initial});
  await delay(1000);
  await command('get_state');
  await waitFor('shuffle toggle',s=>s.playback?.options?.shuffle===!initial,11000);
  console.log('PASS: shuffle changed in a real Spotify playlist context');
  await command('set_shuffle',{enabled:initial});
  await delay(900);
  await command('get_state');
  await waitFor('shuffle restored',s=>s.playback?.options?.shuffle===initial,11000);
  console.log('PASS: shuffle restored to original setting');
  success=true;
}finally{
  try{
    await command('set_shuffle',{enabled:initial});
    await command('set_volume',{volume});
    await command('play',{uri:restoreUri});
    await waitFor('ANTIFRAGILE playing',s=>
      s.playback?.item?.uri===restoreUri&&['playing','buffering'].includes(s.playback?.status),14000);
    await delay(650);
    await command('set_volume',{volume});
    const s=await waitFor('restored volume',s=>s.playback?.volume===volume,9000);
    console.log('RESTORED:',s.playback?.item?.decorations?.identity?.name,
      'state',s.playback?.status,'volume',s.playback?.volume);
  }catch(error){console.error('WARNING: song restore needs attention:',error.message);process.exitCode=1;}
}
if(!success)process.exitCode=1;

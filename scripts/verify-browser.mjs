import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir=await mkdtemp(path.join(os.tmpdir(),'aura-browser-'));
const root=path.resolve(import.meta.dirname,'..');
const dest=path.join(root,'test-artifacts');
await mkdir(dest,{recursive:true});
const port=19473;
const chrome=spawn('google-chrome',[
 '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--disable-background-networking','--no-first-run',
 '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,
 '--user-data-dir='+dir,'--window-size=1480,980','about:blank'
],{stdio:'ignore'});
const delay=t=>new Promise(r=>setTimeout(r,t));
let socket,seq=0;
const pending=new Map();
async function call(method,params={}){
 const id=++seq;
 const result=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));
 socket.send(JSON.stringify({id,method,params}));
 return result;
}
async function evaluate(expression){
 const reply=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(reply.result?.exceptionDetails)throw new Error(reply.result.exceptionDetails.exception?.description||reply.result.exceptionDetails.text);
 return reply.result.result.value;
}
async function waitFor(expression,limitMs=6500){
 const end=Date.now()+limitMs;
 do{
   if(await evaluate(expression))return true;
   await delay(300);
 }while(Date.now()<end);
 return false;
}
try{
 let url='';
 for(let i=0;i<40;i++){
  try{const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   url=targets.find(x=>x.type==='page')?.webSocketDebuggerUrl||'';if(url)break;
  }catch{}
  await delay(150);
 }
 if(!url)throw new Error('Chrome debug endpoint unavailable');
 socket=new WebSocket(url);
 socket.onmessage=event=>{
   const msg=JSON.parse(event.data);
   if(msg.id&&pending.has(msg.id)){
      const p=pending.get(msg.id);pending.delete(msg.id);
      msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg);
   }
 };
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 await call('Page.enable');await call('Runtime.enable');
 await call('Page.navigate',{url:'http://127.0.0.1:'+(process.env.AURA_BROWSER_PORT||'4373')+'/'});
 await delay(3400);
 const home=await evaluate("Boolean(document.querySelector('.obs-hero'))");
 if(!home)throw new Error('Observatory did not render');
 const paletteCheck=await evaluate(`(()=>{const trigger=document.querySelector('[data-open-palette]');if(!trigger)return false;trigger.click();const input=document.querySelector('#aura-command-input');if(!input||document.querySelectorAll('[data-palette-nav]').length<12)return false;input.value='Spoken';input.dispatchEvent(new Event('input',{bubbles:true}));const choices=[...document.querySelectorAll('[data-palette-nav]')];if(choices.length!==1||choices[0].dataset.paletteNav!=='podcasts')return false;choices[0].click();return !document.querySelector('#aura-command-palette')&&!!document.querySelector('[data-nav=podcasts].active');})()`);
 if(!paletteCheck)throw new Error('Quick navigation palette search/open flow failed');
 await evaluate("document.querySelector('[data-nav=home]').click()");
  const hasCollectionCounts=await evaluate("document.querySelector('.obs-overview')?.textContent.includes('LIKED SONGS')");
 const recentCount=await evaluate("document.querySelectorAll('.recent-card').length");
 const navOk=await evaluate("(()=>{document.querySelector('[data-nav=chamber]').click();return true;})()");
 await delay(300);
 const hasChamber=await evaluate("Boolean(document.querySelector('.listening-chamber .chamber-art'))");
 if(!hasChamber)throw new Error('Listening Chamber did not render');
 const repeatControls=await evaluate(`(()=>{const nodes=[document.querySelector('.listening-chamber [data-control="repeat_cycle"]'),document.querySelector('#player [data-control="repeat_cycle"]')];return nodes.map(n=>({label:n?.getAttribute('aria-label'),pressed:n?.getAttribute('aria-pressed'),mark:n?.querySelector('.repeat-one-mark')?.textContent||''}));})()`);
 if(repeatControls.some(x=>!x.label?.startsWith('Repeat mode: ')||!['true','false'].includes(x.pressed)||((x.label.includes('track'))!==(x.mark==='1'))))throw new Error('Repeat mode accessibility/one-track indicator invalid');

 const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'chamber-desktop.png'),Buffer.from(screenshot.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('[data-nav=liked]').click();return true;})()");
 await delay(300);
 const hasLibrary=await evaluate("Boolean(document.querySelector('.library-experience #collection-filter'))");
 if(!hasLibrary)throw new Error('Living Library did not render');
 const libraryHasBulkSync=await evaluate("Boolean(document.querySelector('[data-library-all=tracks]'))");
 if(!libraryHasBulkSync)throw new Error('Library bulk sync controls missing');
 const rowsBefore=await evaluate("document.querySelectorAll('.library-experience .track-row').length");
 await evaluate("(()=>{document.querySelector('[data-more=tracks]').click();return true;})()");
 const loadedNextPage=await waitFor("document.querySelectorAll('.library-experience .track-row').length>50",9000);
 const rowsAfter=await evaluate("document.querySelectorAll('.library-experience .track-row').length");
 if(!loadedNextPage||rowsAfter<=rowsBefore)throw new Error('Library next page did not load');
 const screenshot2=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'library-desktop.png'),Buffer.from(screenshot2.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('[data-nav=settings]').click();return true;})()");
 await delay(300);
 const keySavedUI=await evaluate("document.querySelector('.key-status')?.textContent.includes('Key saved')");
 await evaluate("(()=>{document.querySelector('[data-nav=chamber]').click();document.querySelector('[data-action=cinema-mode]').click();return true;})()");
 await delay(280);
 const cinemaOk=await evaluate("Boolean(document.querySelector('.listening-chamber.cinema-mode'))");
 if(!cinemaOk)throw new Error('Cinema Mode did not render');
 const cinemaScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'cinema-desktop.png'),Buffer.from(cinemaScreenshot.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('.chamber-mini-queue').click();return true;})()");
 await delay(350);
 const peekOk=await evaluate("Boolean(document.querySelector('.chamber-peek .chamber-peek-items'))");
 const peekRows=await evaluate("document.querySelectorAll('.chamber-peek-item').length");
 const peekFits=await evaluate("document.querySelector('.chamber-peek').getBoundingClientRect().bottom < document.querySelector('#player').getBoundingClientRect().top - 5");
 if(!peekOk||!peekFits)throw new Error('Immersive queue peek failed or was obscured by the fixed player');
 const peekScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'queue-peek-desktop.png'),Buffer.from(peekScreenshot.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('[data-nav=queue]').click();return true;})()");
 await delay(280);
 const queueOk=await evaluate("Boolean(document.querySelector('.sequence-experience .sequence-rows'))");
 const queueRows=await evaluate("document.querySelectorAll('.sequence-item').length");
 if(!queueOk)throw new Error('Sequence queue screen failed');
 const queueScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'sequence-desktop.png'),Buffer.from(queueScreenshot.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('[data-nav=search]').click();return true;})()");
 await delay(350);
 const searchOk=await evaluate("Boolean(document.querySelector('.discovery-experience #search-page-form'))");
 if(!searchOk)throw new Error('Discovery search screen failed');
 const searchScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'discovery-desktop.png'),Buffer.from(searchScreenshot.result.data,'base64'));
 await evaluate("(()=>{const input=document.querySelector('#discovery-input');input.value='ANTIFRAGILE';document.querySelector('#search-page-form').requestSubmit();return true;})()");
 await delay(1900);
 const searched=await evaluate("document.querySelector('.discovery-results-head')?.textContent.includes('ANTIFRAGILE') && !document.querySelector('.discovery-loading')");
 if(!searched)throw new Error('Spotify search was not submitted or did not finish');
 const searchRaceSafe=await evaluate("(async()=>{\n  const originalFetch=window.fetch;\n  const seen=[];\n  try{\n    window.fetch=(url,options)=>{\n      const target=new URL(url,location.origin);\n      const q=target.searchParams.get('q');\n      if(target.pathname!=='/api/spotify/search'||!['auraQAold','auraQAnew'].includes(q))\n        return originalFetch(url,options);\n      seen.push(q);\n      // Ignore AbortSignal intentionally: check stale-response defense too.\n      return new Promise(resolve=>setTimeout(()=>resolve(new Response(JSON.stringify({\n        tracks:{items:[{id:'4fsQ0K37TOXa3hEQfjEic1',uri:'spotify:track:4fsQ0K37TOXa3hEQfjEic1',\n          name:q,artists:[{name:'AURA isolated test'}]}],total:1}\n      }),{status:200,headers:{'content-type':'application/json'}})),q==='auraQAold'?280:20));\n    };\n    const submit=(value)=>{\n      const field=document.querySelector('#discovery-input');\n      if(!field)return false;\n      field.value=value;\n      document.querySelector('#search-page-form').requestSubmit();\n      return true;\n    };\n    if(!submit('auraQAold')||!submit('auraQAnew'))return false;\n    await new Promise(resolve=>setTimeout(resolve,450));\n    return seen.length===2 &&\n      document.querySelector('.discovery-results-head h2')?.textContent==='auraQAnew' &&\n      document.querySelectorAll('.discovery-experience .track-row').length===1 &&\n      document.querySelector('.discovery-experience .row-name')?.textContent==='auraQAnew' &&\n      !document.querySelector('.discovery-loading');\n  }finally{window.fetch=originalFetch;}\n})()");
 if(!searchRaceSafe)throw new Error('Stale Spotify search responses overwrote the latest results');
 await evaluate("(()=>{document.querySelector('[data-nav=albums]').click();return true;})()");
 await delay(150);
 const firstAlbum=await evaluate("Boolean(document.querySelector('[data-open^=album]'))");
 if(firstAlbum){
   await evaluate("(()=>{document.querySelector('[data-open^=album]').click();return true;})()");
   await delay(2600);
   const detailOk=await evaluate("Boolean(document.querySelector('.archive-detail .archive-hero'))");
   if(!detailOk){
     const diagnostics=await evaluate("({view:state.view,hasDetail:!!state.detail,pageExcerpt:document.querySelector('#main')?.textContent?.slice(0,180)})");
     console.log('Archive diagnostics:',JSON.stringify(diagnostics));
     throw new Error('Archive detail view did not render');
   }
   const archiveSearch=await evaluate("(()=>{const input=document.querySelector('#detail-filter'),name=document.querySelector('.archive-detail .row-name')?.textContent||'';if(!input||!name)return false;input.value=name.slice(0,5);input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
   const matches=await evaluate("Boolean(document.querySelector('#detail-filter')?.value) && document.querySelectorAll('.archive-detail .track-row').length>0");
   if(!archiveSearch||!matches)throw new Error('Archive track filtering failed');
   const archiveScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   await writeFile(path.join(dest,'archive-desktop.png'),Buffer.from(archiveScreenshot.result.data,'base64'));
 }
 await evaluate("(()=>{document.querySelector('[data-nav=mixes]').click();return true;})()");
 await delay(410);
 const mixesPage=await evaluate("Boolean(document.querySelector('.exp-page .mix-current'))");
 const mixPinned=await evaluate("document.querySelectorAll('.mix-tile').length");
 const backupControls=await evaluate("Boolean(document.querySelector('[data-action=export-mixes]')) && Boolean(document.querySelector('[data-action=import-mixes]'))");
 if(!mixesPage||!mixPinned||!backupControls)throw new Error('Made for You pins or backup controls did not render');
 const mixesShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'made-for-you-desktop.png'),Buffer.from(mixesShot.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('[data-action=add-mix]').click();return true;})()");
 await delay(200);
 const mixForm=await evaluate("Boolean(document.querySelector('#mix-form input[name=uri]'))");
 if(!mixForm)throw new Error('Mix pin form did not open');
 await evaluate("(()=>{document.querySelector('[data-action=close-modal]').click();return true;})()");
 await evaluate("(()=>{document.querySelector('[data-nav=sound]').click();return true;})()");
 await delay(400);
 const insightPage=await evaluate("Boolean(document.querySelector('.exp-page .sound-range'))");
 await waitFor("document.querySelectorAll('.exp-page .cover-card').length>0 || Boolean(document.querySelector('.exp-page .info-banner'))",6500);
 const insightArtists=await evaluate("document.querySelectorAll('.exp-page .cover-card').length");
 if(!insightPage)throw new Error('Your Sound page did not render');
 const insightShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'your-sound-desktop.png'),Buffer.from(insightShot.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('[data-nav=podcasts]').click();return true;})()");
 await delay(500);
 const audioPage=await evaluate("Boolean(document.querySelector('.exp-page [data-audio-kind=episodes]'))");
 await waitFor("document.querySelectorAll('.audio-entry').length>0 || Boolean(document.querySelector('.exp-page .info-banner'))",6500);
 const podcastCount=await evaluate("document.querySelectorAll('.audio-entry').length");
 const showsHandoff=await evaluate("document.querySelectorAll('.audio-shelf [data-play^=\"spotify:show:\"]').length===0 && document.querySelectorAll('.audio-shelf [data-audio-open^=\"show:\"]').length>0");
 if(!showsHandoff)throw new Error('Podcast shows promised unverified native playback instead of Spotify handoff');

 if(!audioPage)throw new Error('Spoken Worlds page did not render');
 const podcastShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'spoken-worlds-desktop.png'),Buffer.from(podcastShot.result.data,'base64'));
 await evaluate("(()=>{document.querySelector('[data-audio-kind=episodes]').click();return true;})()");
 await waitFor("document.querySelectorAll('.audio-entry').length>0 || Boolean(document.querySelector('.exp-page .info-banner'))",6500);
 const episodeCount=await evaluate("document.querySelectorAll('.audio-entry').length");
 const episodePlaybackActions=await evaluate("document.querySelectorAll('.audio-shelf [data-play^=\"spotify:episode:\"]').length");
 if(!episodePlaybackActions)throw new Error('Saved episode listen actions are missing');

 if(!episodeCount)throw new Error('Saved episodes did not render');
 const audioFilterWorks=await evaluate(`(()=>{const input=document.querySelector('#audio-filter'),sort=document.querySelector('#audio-sort');if(!input||!sort||!Array.from(sort.options).some(o=>o.value==='continue'))return false;const original=document.querySelectorAll('.audio-entry').length;input.focus();input.value='zzzaura-no-match-xyz';input.dispatchEvent(new Event('input',{bubbles:true}));const empty=document.querySelectorAll('.audio-entry').length===0&&document.querySelector('.audio-result-count')?.textContent.startsWith('0 of ');const focused=document.activeElement?.id==='audio-filter';const refreshed=document.querySelector('#audio-filter');refreshed.value='';refreshed.dispatchEvent(new Event('input',{bubbles:true}));return {empty,focused,original,restored:document.querySelectorAll('.audio-entry').length,filter:document.querySelector('#audio-filter')?.value,count:document.querySelector('.audio-result-count')?.textContent};})()`);
 if(!audioFilterWorks?.empty||!audioFilterWorks?.focused||audioFilterWorks?.restored!==audioFilterWorks?.original)throw new Error('Spoken Worlds filter, focus or loaded-only count failed: '+JSON.stringify(audioFilterWorks));
 const audioSortWorks=await evaluate(`(()=>{const sort=document.querySelector('#audio-sort');sort.value='continue';sort.dispatchEvent(new Event('change',{bubbles:true}));return document.querySelector('#audio-sort')?.value==='continue'&&document.querySelectorAll('.audio-entry').length>0;})()`);
 if(!audioSortWorks)throw new Error('Spoken Worlds continue-listening sort failed');

 await evaluate("(()=>{document.querySelector('[data-nav=tools]').click();return true;})()");
 await waitFor("Boolean(document.querySelector('[data-sleep-minutes]'))",2200);
 const toolsPage=await evaluate("Boolean(document.querySelector('[data-sleep-minutes]'))");
 if(!toolsPage){
   const info=await evaluate("({view:state.view,html:document.querySelector('#main')?.textContent?.slice(0,200),buttons:document.querySelectorAll('[data-sleep-minutes]').length})");
   console.log('Tools diagnostics',JSON.stringify(info));
   throw new Error('Listening Utilities timer UI failed to render');
 }
 const toolsShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'listening-tools-desktop.png'),Buffer.from(toolsShot.result.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await evaluate("(()=>{document.querySelector('[data-nav=chamber]').click();return true;})()");
 await delay(400);
 const mobileOverflow=await evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth+3');
 const mobileDockScrollable=await evaluate("document.querySelector('.sidebar').scrollWidth>document.querySelector('.sidebar').clientWidth+30");
 if(!mobileDockScrollable)throw new Error('Mobile navigation should scroll horizontally with readable buttons');
 const mobileImage=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(dest,'chamber-mobile.png'),Buffer.from(mobileImage.result.data,'base64'));
 console.log(JSON.stringify({observatory:home,homeCounts:hasCollectionCounts,recentTracksRendered:recentCount,listeningChamber:hasChamber,livingLibrary:hasLibrary,libraryHasBulkSync,libraryRowsAfterNextPage:rowsAfter,savedKeyStatus:keySavedUI,cinemaMode:cinemaOk,immersiveQueuePeek:peekOk,peekFitsAbovePlayer:peekFits,peekRows,queueScreen:queueOk,queueRows,searchScreen:searchOk,spotifySearchCompleted:searched,searchRaceSafe,albumDetail:firstAlbum,mixPinsRendered:mixPinned,mixForm,topArtistsRendered:insightArtists,podcastsRendered:podcastCount,podcastShowsUseHandoff:showsHandoff,savedEpisodesRendered:episodeCount,episodePlaybackActions,listeningTools:toolsPage,mobileDockScrollable,mobileHorizontalOverflow:mobileOverflow,screenshots:['chamber-desktop.png','library-desktop.png','cinema-desktop.png','sequence-desktop.png','discovery-desktop.png','archive-desktop.png','chamber-mobile.png']}));
}finally{
 try{socket?.close()}catch{}
 chrome.kill('SIGTERM');
 await delay(250);
 await rm(dir,{recursive:true,force:true,maxRetries:4,retryDelay:250}).catch(()=>{});
}

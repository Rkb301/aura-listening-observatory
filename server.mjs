import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { SpotifyAuth, HttpError, validId, validSpotifyUri, REDIRECT_URI } from './lib/spotify.mjs';
import { Soloist, isLocalWsUrl } from './lib/soloist.mjs';
import { readSoloistKey, storeSoloistKey, deleteSoloistKey, readSoloistPreferences, storeSoloistPreferences } from './lib/soloist-secrets.mjs';
import { loadMixes, saveMixes, parseMixUri, pinMix, removeMix, moveMix, validMixName } from './lib/pinned-mixes.mjs';
import {validateReorder,validatePlaylistRemoval,validatePlaylistMetadata} from './lib/playlist-operations.mjs';
import {makePersonalizationBackup,parsePersonalizationBackup} from './lib/personalization.mjs';

const HOST='127.0.0.1';
const testPort=process.env.AURA_DATA_DIR&&/^4[3-9]\d\d$/.test(process.env.AURA_TEST_PORT||'')?Number(process.env.AURA_TEST_PORT):0;
const PORT=testPort || (process.env.AURA_PREVIEW_PORT==='4374'?4374:4373);
const ORIGIN=`http://${HOST}:${PORT}`;
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.AURA_DATA_DIR || path.join(os.homedir(),'.aura-music');
const csrf=randomBytes(32).toString('hex');
await mkdir(dataDir,{recursive:true,mode:0o700});
const spotify=new SpotifyAuth(dataDir);await spotify.init();
const soloistPrefs=await readSoloistPreferences(dataDir);
const defaultSoloistBinary=process.platform==='linux'?path.join(root,'soloist'):'';
let soloistKeySaved=!!(await readSoloistKey(dataDir));
const soloistSetup=()=>({savedKey:soloistKeySaved,binary:soloistPrefs.binary||defaultSoloistBinary});
const subscribers=new Set();
let pinnedMixes=await loadMixes(dataDir);
let sleepTimer=null,sleepUntil=0;
const sleepStatus=()=>({active:sleepUntil>Date.now(),until:sleepUntil||null,remainingMs:Math.max(0,sleepUntil-Date.now())});
function cancelSleep(){if(sleepTimer)clearTimeout(sleepTimer);sleepTimer=null;sleepUntil=0;}
function broadcast(type,data){const chunk=`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;for(const res of subscribers){try{res.write(chunk);}catch{subscribers.delete(res);}}}
let shuttingDown=false,restoreTimer=null,restoring=false,restoreFailures=0;
const soloist=new Soloist(dataDir,(event,state)=>{
  broadcast('soloist',state);
  if(event?.type==='managed_exit'&&!shuttingDown){
    if(event.code===10){console.warn('[aura] Soloist expired; update the official Soloist binary before retrying.');return;}
    planSoloistRestore(8000);
  }
});
function planSoloistRestore(delay=3000){
  if(shuttingDown||process.env.AURA_DATA_DIR||process.env.AURA_SOLOIST_AUTOSTART==='off'||!soloistKeySaved||restoreTimer)return;
  restoreTimer=setTimeout(async()=>{
    restoreTimer=null;
    if(shuttingDown||restoring||soloist.child||soloist.snapshot().connected)return;
    restoring=true;
    try{
      // First attach to any existing Soloist instance; do not spawn a duplicate
      // while its discovery socket is still coming online.
      try{await soloist.discover();}catch{}
      await new Promise(r=>setTimeout(r,1300));
      if(shuttingDown||soloist.snapshot().connected||soloist.child)return;
      soloist.closeSocket();soloist.url='';
      const key=await readSoloistKey(dataDir);
      if(!key)return;
      await soloist.launch(soloistSetup().binary,key);
      restoreFailures=0;
      console.log('[aura] Soloist recovered using saved local credentials.');
    }catch(error){
      restoreFailures=Math.min(restoreFailures+1,5);
      console.warn('[aura] Soloist recovery attempt:',error.message);
      if(!shuttingDown)planSoloistRestore(Math.min(60000,5000*2**restoreFailures));
    }finally{restoring=false;}
  },delay);
  restoreTimer.unref?.();
}
if(process.env.SOLOIST_WS_URL&&isLocalWsUrl(process.env.SOLOIST_WS_URL))soloist.connect(process.env.SOLOIST_WS_URL);
try{await soloist.discover();}catch{}
const contentTypes={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
function respond(res,status,data,extra={}){const text=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(text);}
function throwBad(message){throw new HttpError(400,message);}
async function bodyJSON(req){
  if(req.headers['content-type']?.split(';')[0]!=='application/json')throw new HttpError(415,'Send application/json.');
  let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>32768)throw new HttpError(413,'Request too large.');parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new HttpError(400,'Malformed JSON.');}
}
function off(u){const n=Number(u.searchParams.get('offset')||'0');return Number.isInteger(n)&&n>=0&&n<=100000?n:0;}
function limit(u,cap=50){const n=Number(u.searchParams.get('limit')||Math.min(cap,20));return Number.isInteger(n)&&n>0&&n<=cap?n:Math.min(cap,20);}
function spotifyId(v){if(!validId(v))throwBad('Invalid Spotify ID.');return v;}
function spotifyUri(v){if(!validSpotifyUri(v))throwBad('Invalid Spotify URI.');return v;}
async function api(req,url,res){
  const pathname=url.pathname;
  if(pathname==='/api/health'&&req.method==='GET')return respond(res,200,{
    status:'ok',version:'0.8.0',spotifyAuthenticated:spotify.status().loggedIn,
    soloistConnected:soloist.snapshot().connected,soloistPaired:!!soloist.snapshot().auth?.logged_in,
    soloistManaged:!!soloist.child,playbackStatus:soloist.snapshot().playback?.status||'unknown',
    credentialsSaved:soloistKeySaved,recoveryInProgress:restoring,uptimeSeconds:Math.floor(process.uptime())
  });
  if(pathname==='/api/bootstrap'&&req.method==='GET')return respond(res,200,{csrf,spotify:spotify.status(),soloist:soloist.snapshot(),version:'0.8.0',soloistSetup:soloistSetup()});
  if(pathname==='/api/events'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(`event: soloist\ndata: ${JSON.stringify(soloist.snapshot())}\n\n`);subscribers.add(res);req.on('close',()=>subscribers.delete(res));return;
  }
  if(req.method!=='GET'&&req.headers['x-aura-request']!==csrf)throw new HttpError(403,'Request verification failed. Refresh AURA.');
  if(pathname==='/api/config'&&req.method==='POST'){const b=await bodyJSON(req);await spotify.setClientId(b.clientId);return respond(res,200,spotify.status());}
  if(pathname==='/api/login'&&req.method==='POST')return respond(res,200,{url:spotify.loginUrl()});
  if(pathname==='/api/logout'&&req.method==='POST'){await spotify.logout();return respond(res,200,spotify.status());}
  if(pathname==='/api/soloist/connect'&&req.method==='POST'){const b=await bodyJSON(req);if(!isLocalWsUrl(b.url))throw new HttpError(400,'Only ws://127.0.0.1:PORT/ is supported.');soloist.connect(b.url);return respond(res,200,soloist.snapshot());}
  if(pathname==='/api/soloist/discover'&&req.method==='POST'){await soloist.discover();return respond(res,200,soloist.snapshot());}
  if(pathname==='/api/soloist/launch'&&req.method==='POST'){
    const b=await bodyJSON(req);
    const binary=String(b.binary||soloistSetup().binary).trim();
    const key=b.apiKey || await readSoloistKey(dataDir);
    if(!key)throw new HttpError(400,'Provide a Soloist API key, or save one in AURA first.');
    const result=await soloist.launch(binary,key);
    if(b.remember!==false){await storeSoloistKey(dataDir,key);soloistKeySaved=true;}
    await storeSoloistPreferences(dataDir,binary);
    soloistPrefs.binary=binary;
    return respond(res,200,{...result,setup:soloistSetup()});
  }
  if(pathname==='/api/soloist/forget-key'&&req.method==='POST'){
    await deleteSoloistKey(dataDir);soloistKeySaved=false;
    return respond(res,200,soloistSetup());
  }
  if(pathname==='/api/soloist/command'&&req.method==='POST'){const b=await bodyJSON(req);try{return respond(res,200,soloist.command(b));}catch(e){throw new HttpError(400,e.message);}}
  if(pathname==='/api/soloist/state'&&req.method==='GET')return respond(res,200,soloist.snapshot());
  if(pathname==='/api/personalization'&&req.method==='GET')
    return respond(res,200,makePersonalizationBackup(pinnedMixes));
  if(pathname==='/api/personalization/import'&&req.method==='POST'){
    const body=await bodyJSON(req);
    let imported;
    try{imported=parsePersonalizationBackup(body);}catch(error){throwBad(error.message);}
    await saveMixes(dataDir,imported);
    pinnedMixes=imported;
    return respond(res,200,{items:pinnedMixes,count:pinnedMixes.length});
  }
  if(pathname==='/api/mixes'&&req.method==='GET')return respond(res,200,{items:pinnedMixes});
  if(pathname==='/api/mixes'&&req.method==='POST'){
    const b=await bodyJSON(req);
    const context=b.fromCurrent?soloist.snapshot().playback?.context:null;
    const uri=context?.uri || b.uri;
    const label=String(b.name||context?.decorations?.identity?.name||'').trim();
    if(!parseMixUri(uri)||!validMixName(label))throwBad('Pin a Spotify playlist URL or choose a playing mix and supply a name.');
    try{
      pinnedMixes=pinMix(pinnedMixes,{uri,name:label});
      await saveMixes(dataDir,pinnedMixes);
      return respond(res,200,{items:pinnedMixes});
    }catch(error){throwBad(error.message);}
  }
  if(pathname==='/api/mixes'&&req.method==='DELETE'){
    const b=await bodyJSON(req);
    if(!parseMixUri(b.uri))throwBad('Invalid Spotify playlist URI.');
    pinnedMixes=removeMix(pinnedMixes,b.uri);
    await saveMixes(dataDir,pinnedMixes);
    return respond(res,200,{items:pinnedMixes});
  }
  if(pathname==='/api/mixes/move'&&req.method==='POST'){
    const b=await bodyJSON(req);
    if(!parseMixUri(b.uri)||![-1,1].includes(b.direction))throwBad('Invalid mix reorder command.');
    pinnedMixes=moveMix(pinnedMixes,b.uri,b.direction);
    await saveMixes(dataDir,pinnedMixes);
    return respond(res,200,{items:pinnedMixes});
  }
  if(pathname==='/api/sleep'&&req.method==='GET')return respond(res,200,sleepStatus());
  if(pathname==='/api/sleep'&&req.method==='DELETE'){cancelSleep();broadcast('sleep',sleepStatus());return respond(res,200,sleepStatus());}
  if(pathname==='/api/sleep'&&req.method==='POST'){
    const b=await bodyJSON(req),minutes=Number(b.minutes);
    if(!Number.isInteger(minutes)||minutes<1||minutes>180)throwBad('Sleep timer must be between 1 and 180 minutes.');
    cancelSleep();sleepUntil=Date.now()+minutes*60000;
    sleepTimer=setTimeout(()=>{
      try{soloist.command({command:'pause'});console.log('[aura] Sleep timer requested pause.');}
      catch(error){console.warn('[aura] Sleep timer could not pause disconnected engine:',error.message);}
      cancelSleep();broadcast('sleep',sleepStatus());
    },minutes*60000);
    sleepTimer.unref?.();broadcast('sleep',sleepStatus());
    return respond(res,200,sleepStatus());
  }
  if(pathname==='/api/spotify/top'&&req.method==='GET'){
    const type=url.searchParams.get('type')||'tracks';
    const range=url.searchParams.get('range')||'medium_term';
    if(!['artists','tracks'].includes(type)||!['short_term','medium_term','long_term'].includes(range))throwBad('Invalid listening-insights options.');
    return respond(res,200,await spotify.spotify(`/me/top/${type}?limit=20&time_range=${range}`));
  }
  if(pathname==='/api/spotify/collection'&&req.method==='GET'){
    const kind=url.searchParams.get('kind')||'shows';
    if(!['shows','episodes','audiobooks'].includes(kind))throwBad('Unknown Spotify collection.');
    return respond(res,200,await spotify.spotify(`/me/${kind}?limit=${limit(url)}&offset=${off(url)}`));
  }
  if(pathname==='/api/me'&&req.method==='GET')return respond(res,200,await spotify.spotify('/me'));
  if(pathname==='/api/spotify/playlists'&&req.method==='GET')return respond(res,200,await spotify.spotify(`/me/playlists?limit=${limit(url)}&offset=${off(url)}`));
  if(pathname==='/api/spotify/tracks'&&req.method==='GET')return respond(res,200,await spotify.spotify(`/me/tracks?limit=${limit(url)}&offset=${off(url)}`));
  if(pathname==='/api/spotify/albums'&&req.method==='GET')return respond(res,200,await spotify.spotify(`/me/albums?limit=${limit(url)}&offset=${off(url)}`));
  if(pathname==='/api/spotify/recent'&&req.method==='GET')return respond(res,200,await spotify.spotify('/me/player/recently-played?limit=20'));
  if(pathname==='/api/spotify/devices'&&req.method==='GET')return respond(res,200,await spotify.spotify('/me/player/devices'));
  if(pathname==='/api/spotify/search'&&req.method==='GET'){
    const q=(url.searchParams.get('q')||'').trim(), type=url.searchParams.get('type')||'track';
    if(!q||q.length>120)throwBad('Enter a search query under 120 characters.');
    if(!['track','album','artist','playlist','episode','show'].includes(type))throwBad('Unsupported search type.');
    return respond(res,200,await spotify.spotify(`/search?q=${encodeURIComponent(q)}&type=${type}&limit=10&offset=${off(url)}`));
  }
  const p=pathname.match(/^\/api\/spotify\/playlist\/([A-Za-z0-9]+)(\/items)?$/);
  if(p){const id=spotifyId(p[1]);const items=!!p[2];
    if(req.method==='GET')return respond(res,200,await spotify.spotify(`/playlists/${id}${items?`/items?limit=${limit(url)}&offset=${off(url)}`:''}`));
    if(items&&req.method==='POST'){const b=await bodyJSON(req);if(!Array.isArray(b.uris)||b.uris.length<1||b.uris.length>100)b.uris=[];
      if(!b.uris.length)throwBad('Choose at least one track.');b.uris.forEach(spotifyUri);
      return respond(res,200,await spotify.spotify(`/playlists/${id}/items`,{method:'POST',json:{uris:b.uris}}));
    }
    if(items&&req.method==='DELETE'){
      const b=await bodyJSON(req);
      let removal;
      try{removal=validatePlaylistRemoval(b);}
      catch{throwBad('Removing playlist items requires explicit all-copies confirmation and a current snapshot.');}
      return respond(res,200,await spotify.spotify('/playlists/'+id+'/items',{method:'DELETE',json:removal}));
    }
    if(items&&req.method==='PUT'){
      const body=await bodyJSON(req);
      let move;
      try{move=validateReorder(body);}catch{throwBad('Provide a valid adjacent playlist position and snapshot ID.');}
      return respond(res,200,await spotify.spotify('/playlists/'+id+'/items',{method:'PUT',json:move}));
    }
    if(!items&&req.method==='PUT'){const b=await bodyJSON(req);let metadata;
      try{metadata=validatePlaylistMetadata(b);}catch{throwBad('Provide a valid playlist name and description.');}
      return respond(res,200,await spotify.spotify(`/playlists/${id}`,{method:'PUT',json:metadata}));
    }
  }
  const a=pathname.match(/^\/api\/spotify\/album\/([A-Za-z0-9]+)(\/tracks)?$/);
  if(a&&req.method==='GET')return respond(res,200,await spotify.spotify(`/albums/${spotifyId(a[1])}${a[2]?`/tracks?limit=${limit(url)}&offset=${off(url)}`:''}`));
  const ar=pathname.match(/^\/api\/spotify\/artist\/([A-Za-z0-9]+)$/);
  if(ar&&req.method==='GET')return respond(res,200,await spotify.spotify(`/artists/${spotifyId(ar[1])}`));
  if(pathname==='/api/spotify/playlist'&&req.method==='POST'){
    const b=await bodyJSON(req);let metadata;
    try{metadata=validatePlaylistMetadata(b,{create:true});}catch{throwBad('Provide a valid playlist name and description.');}
    return respond(res,200,await spotify.spotify('/me/playlists',{method:'POST',json:metadata}));
  }
  if(pathname==='/api/spotify/library'&&['PUT','DELETE'].includes(req.method)){
    const b=await bodyJSON(req);spotifyUri(b.uri);
    return respond(res,200,await spotify.spotify(`/me/library?uris=${encodeURIComponent(b.uri)}`,{method:req.method}));
  }
  if(pathname==='/api/spotify/devices'&&req.method==='PUT'){
    const b=await bodyJSON(req);if(typeof b.deviceId!=='string'||b.deviceId.length<2||b.deviceId.length>200)throwBad('Invalid device ID.');
    return respond(res,200,await spotify.spotify('/me/player',{method:'PUT',json:{device_ids:[b.deviceId],play:false}}));
  }
  throw new HttpError(404,'Unknown AURA API route.');
}
const server=http.createServer(async(req,res)=>{
  try {
    if(req.headers.host!==`${HOST}:${PORT}`)throw new HttpError(403,'This application only accepts localhost requests.');
    if(!['GET','POST','PUT','DELETE'].includes(req.method))throw new HttpError(405,'Method not allowed.');
    const url=new URL(req.url,ORIGIN);
    // Spotify OAuth returns through a cross-site top-level GET navigation. Allow
    // only document navigation to the public UI or the state-validated callback;
    // keep API calls and all state-changing requests origin-restricted.
    const publicNavigation=req.method==='GET' && req.headers['sec-fetch-mode']==='navigate'
      && ['/', '/index.html', '/auth/callback'].includes(url.pathname);
    if(!publicNavigation && req.headers.origin && req.headers.origin!==ORIGIN)throw new HttpError(403,'Cross-origin request blocked.');
    if(!publicNavigation && req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Cross-site request blocked.');
    if(url.pathname==='/auth/callback'&&req.method==='GET'){
      try{await spotify.handleCallback(url.searchParams);res.writeHead(302,{Location:'/?login=success','Cache-Control':'no-store'});res.end();}
      catch(e){res.writeHead(302,{Location:`/?login=error&message=${encodeURIComponent(e.message).slice(0,450)}`,'Cache-Control':'no-store'});res.end();}
      return;
    }
    if(url.pathname.startsWith('/api/'))return await api(req,url,res);
    if(req.method!=='GET')throw new HttpError(405,'Method not allowed.');
    const allowed={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/experience.js':'experience.js','/styles.css':'styles.css','/experience.css':'experience.css','/icon.svg':'icon.svg','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png','/manifest.webmanifest':'manifest.webmanifest','/sw.js':'sw.js'};
    const filename=allowed[url.pathname];if(!filename)throw new HttpError(404,'Not found.');
    const bytes=await readFile(path.join(root,'public',filename));
    res.writeHead(200,{'Content-Type':contentTypes[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff',
      'Cache-Control':filename==='sw.js'?'no-cache':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://i.scdn.co https://mosaic.scdn.co https://image-cdn-ak.spotifycdn.com data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'Referrer-Policy':'no-referrer'});res.end(bytes);
  }catch(err){const status=Number.isInteger(err.status)?err.status:500;
    if(status===500)console.error('[aura]',err.message);respond(res,status,{error: status===500?'Internal error. See local terminal output.':err.message, retryAfter:err.retryAfter||null});}
});
// The Acer's independent PulseAudio speakers cannot directly receive Soloist's
// PipeWire stream. Start an isolated, user-level bridge alongside AURA on Linux.
// Never run it in temporary test environments or when explicitly disabled.
let audioBridge=null;
function startAudioBridge(){
  if(process.platform!=='linux'||process.env.AURA_DATA_DIR||process.env.AURA_AUDIO_BRIDGE==='off')return;
  audioBridge=spawn('bash',[path.join(root,'scripts','aura-audio-bridge.sh')],{stdio:['ignore','pipe','pipe']});
  audioBridge.stdout.on('data',data=>process.stdout.write(`[aura audio] ${data}`));
  audioBridge.stderr.on('data',data=>process.stderr.write(`[aura audio] ${data}`));
  audioBridge.on('error',error=>console.warn(`[aura audio] Unavailable: ${error.message}`));
  audioBridge.on('exit',code=>{if(code!==0)console.warn(`[aura audio] Bridge exited (${code}); speaker routing may require attention.`);audioBridge=null;});
}
server.listen(PORT,HOST,()=>{
  console.log(`\n  AURA — your local music space\n  Open ${ORIGIN}\n  Spotify callback: ${REDIRECT_URI}\n  Local settings: ${dataDir}\n`);
  startAudioBridge();
  planSoloistRestore(2000);
});
function shutdown(){
  if(shuttingDown)return;
  shuttingDown=true;
  clearTimeout(restoreTimer);
  cancelSleep();
  // Open event streams otherwise keep Node alive long after its TCP listener
  // closes. Explicitly end them before waiting for server.close.
  for(const res of subscribers){try{res.end();}catch{}}
  subscribers.clear();
  audioBridge?.kill('SIGTERM');
  soloist.stop();
  const watchdog=setTimeout(()=>{
    console.warn('[aura] Forcing closed lingering HTTP connections during shutdown.');
    server.closeAllConnections?.();
    process.exit(0);
  },4000);
  watchdog.unref?.();
  server.close(()=>{clearTimeout(watchdog);process.exit(0);});
  server.closeIdleConnections?.();
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,shutdown);

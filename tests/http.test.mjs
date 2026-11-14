import test from 'node:test';import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const ORIGIN='http://127.0.0.1:4391';
test('local HTTP setup and security smoke',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'aura-server-'));
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,AURA_DATA_DIR:dir,AURA_TEST_PORT:'4391'},stdio:'pipe'});
  try{
    let started=false;
    for(let i=0;i<40;i++){try{const r=await fetch(`${ORIGIN}/api/bootstrap`);if(r.ok){started=true;break}}catch{}await new Promise(r=>setTimeout(r,100));}
    assert.ok(started,'Server must start on loopback');
    const boot=await (await fetch(`${ORIGIN}/api/bootstrap`)).json();
    assert.equal(boot.spotify.configured,false);assert.equal(boot.spotify.loggedIn,false);assert.ok(boot.csrf.length>=32);
    assert.equal((await fetch(ORIGIN)).status,200);
    assert.equal((await fetch(`${ORIGIN}/api/spotify/tracks`)).status,401);
    const denied=await fetch(`${ORIGIN}/api/config`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:'0123456789abcdef0123456789abcdef'})});assert.equal(denied.status,403);
    const config=await fetch(`${ORIGIN}/api/config`,{method:'POST',headers:{'Content-Type':'application/json','X-Aura-Request':boot.csrf},body:JSON.stringify({clientId:'0123456789abcdef0123456789abcdef'})});assert.equal(config.status,200);
    const login=await fetch(`${ORIGIN}/api/login`,{method:'POST',headers:{'Content-Type':'application/json','X-Aura-Request':boot.csrf},body:'{}'});assert.equal(login.status,200);
    const url=new URL((await login.json()).url);assert.equal(url.hostname,'accounts.spotify.com');assert.equal(url.searchParams.get('redirect_uri'),'http://127.0.0.1:4373/auth/callback');
    const evil=await fetch(`${ORIGIN}/api/bootstrap`,{headers:{Origin:'https://malicious.example'}});assert.equal(evil.status,403);
    // A Spotify OAuth callback is a cross-site browser navigation; it must reach
    // handleCallback(), where the PKCE state check protects the session.
    const browserRequest=(route,method='GET',headers={},body)=>new Promise((resolve,reject)=>{
      const req=http.request(`${ORIGIN}${route}`,{method,headers},r=>{r.resume();r.on('end',()=>resolve({status:r.statusCode,location:r.headers.location}));});
      req.on('error',reject);req.end(body);
    });
    const navigation={'Sec-Fetch-Mode':'navigate','Sec-Fetch-Site':'cross-site','Origin':'https://accounts.spotify.com'};
    assert.equal((await browserRequest('/', 'GET', navigation)).status,200);
    const callback=await browserRequest('/auth/callback?code=test&state=invalid','GET',navigation);
    assert.equal(callback.status,302);assert.match(callback.location,/^\/\?login=error/);
    assert.equal((await browserRequest('/api/bootstrap','GET',navigation)).status,403);
    assert.equal((await browserRequest('/api/config','POST',{'Sec-Fetch-Site':'cross-site','X-Aura-Request':boot.csrf,'Content-Type':'application/json'},'{}')).status,403);
    const health=await fetch(`${ORIGIN}/api/health`);assert.equal(health.status,200);
    const diagnostics=await health.json();assert.equal(diagnostics.status,'ok');assert.equal(diagnostics.version,'0.8.0');assert.equal(typeof diagnostics.uptimeSeconds,'number');
    assert.ok(!('csrf' in diagnostics)&&!('apiKey' in diagnostics)&&!('access_token' in diagnostics));
    const wrongHostStatus=await new Promise((resolve,reject)=>{const req=http.request(`${ORIGIN}/api/bootstrap`,{headers:{Host:'bad.example:4373'}},r=>{r.resume();r.on('end',()=>resolve(r.statusCode));});req.on('error',reject);req.end();});assert.equal(wrongHostStatus,403);
    const ws=await fetch(`${ORIGIN}/api/soloist/connect`,{method:'POST',headers:{'Content-Type':'application/json','X-Aura-Request':boot.csrf},body:JSON.stringify({url:'ws://example.org:9090'})});assert.equal(ws.status,400);
    const headers={'Content-Type':'application/json','X-Aura-Request':boot.csrf};
    assert.deepEqual((await (await fetch(`${ORIGIN}/api/mixes`)).json()).items,[]);
    const malformed=await fetch(`${ORIGIN}/api/mixes`,{method:'POST',headers,body:JSON.stringify({uri:'https://evil.test/playlist/123',name:'Unsafe'})});assert.equal(malformed.status,400);
    const uri='spotify:playlist:37i9dQZF1EIZryeCehZItf';
    const pin=await fetch(`${ORIGIN}/api/mixes`,{method:'POST',headers,body:JSON.stringify({uri,name:'My Daily Mix'})});assert.equal(pin.status,200);
    assert.equal((await pin.json()).items[0].name,'My Daily Mix');
    const remove=await fetch(`${ORIGIN}/api/mixes`,{method:'DELETE',headers,body:JSON.stringify({uri})});assert.equal(remove.status,200);
    assert.equal((await remove.json()).items.length,0);
    const badReorder=await fetch(`${ORIGIN}/api/spotify/playlist/37i9dQZF1EIZryeCehZItf/items`,{method:'PUT',headers,body:JSON.stringify({range_start:0,insert_before:999,range_length:1,total:4,snapshot_id:'x'})});
    assert.equal(badReorder.status,400,'invalid playlist reorder must be rejected without Spotify access');
    const removalPath=ORIGIN+'/api/spotify/playlist/37i9dQZF1EIZryeCehZItf/items';
    const sampleUri='spotify:track:4fsQ0K37TOXa3hEQfjEic1';
    const invalidRemoval=await fetch(removalPath,{method:'DELETE',headers,body:JSON.stringify({uri:sampleUri})});
    assert.equal(invalidRemoval.status,400,'a row-level removal with no explicit acknowledgement must not be forwarded');
    const confirmedButUnauthed=await fetch(removalPath,{method:'DELETE',headers,body:JSON.stringify({
      uri:sampleUri,snapshot_id:'snap-test',confirm_all_occurrences:true
    })});
    assert.equal(confirmedButUnauthed.status,401,'valid removal must require Spotify authentication');

    for(const [method,route,payload] of [
      ['POST','/api/spotify/playlist',{name:{unexpected:'object'}}],
      ['POST','/api/spotify/playlist',{name:'Safe',public:true}],
      ['PUT','/api/spotify/playlist/37i9dQZF1EIZryeCehZItf',{name:'Safe',description:{unexpected:'object'}}]
    ]){
      const rejected=await fetch(ORIGIN+route,{method,headers,body:JSON.stringify(payload)});
      assert.equal(rejected.status,400,'unsafe playlist metadata must fail before Spotify auth');
    }
    const validMetadata=await fetch(ORIGIN+'/api/spotify/playlist',{method:'POST',headers,body:JSON.stringify({name:'Safe',description:'Test'})});
    assert.equal(validMetadata.status,401,'valid playlist creation still requires Spotify auth');

    const emptyBackup=await (await fetch(`${ORIGIN}/api/personalization`)).json();
    assert.equal(emptyBackup.format,'aura-personalization');assert.deepEqual(emptyBackup.pinnedMixes,[]);
    const unsafeBackup=await fetch(`${ORIGIN}/api/personalization/import`,{method:'POST',headers,body:JSON.stringify({...emptyBackup,access_token:'must-never-import',pinnedMixes:[{uri:'spotify:track:12345678901234567890',name:'Bad'}]})});
    assert.equal(unsafeBackup.status,400);
    const safeBackup={format:'aura-personalization',version:1,pinnedMixes:[{uri,name:'AURA Mix'}]};
    const imported=await fetch(`${ORIGIN}/api/personalization/import`,{method:'POST',headers,body:JSON.stringify(safeBackup)});
    assert.equal(imported.status,200);assert.equal((await imported.json()).count,1);
    const afterBackup=await (await fetch(`${ORIGIN}/api/personalization`)).json();
    assert.deepEqual(afterBackup.pinnedMixes,[{uri,name:'AURA Mix'}]);
    const badTime=await fetch(`${ORIGIN}/api/sleep`,{method:'POST',headers,body:JSON.stringify({minutes:181})});assert.equal(badTime.status,400);
    const timed=await fetch(`${ORIGIN}/api/sleep`,{method:'POST',headers,body:JSON.stringify({minutes:1})});assert.equal(timed.status,200);assert.equal((await timed.json()).active,true);
    assert.equal((await (await fetch(`${ORIGIN}/api/sleep`)).json()).active,true);
    const cancelled=await fetch(`${ORIGIN}/api/sleep`,{method:'DELETE',headers});assert.equal(cancelled.status,200);assert.equal((await cancelled.json()).active,false);
    const unknown=await fetch(`${ORIGIN}/api/nope`);assert.equal(unknown.status,404);
  } finally {child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));await rm(dir,{recursive:true,force:true});}
});

// A tiny protocol-level Soloist simulator: tests the actual Node WebSocket bridge
// without distributing or requiring Spotify's proprietary playback binary.
test('connects to a local WebSocket engine and sends documented Soloist commands',async()=>{
  const {createServer}=await import('node:http');
  const {createHash}=await import('node:crypto');
  const mock=createServer();
  const commands=[];
  const opened=[];
  const send=(socket,obj)=>{const data=Buffer.from(JSON.stringify(obj));let h;
    if(data.length<126)h=Buffer.from([0x81,data.length]);
    else{h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(data.length,2);}
    socket.write(Buffer.concat([h,data]));
  };
  mock.on('upgrade',(req,socket)=>{
    const accept=createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    opened.push(socket);
    send(socket,{type:'auth_state',logged_in:true,is_active:true,device_name:'AURA Music'});
    send(socket,{type:'playback_state',status:'playing',item:{uri:'spotify:track:6rqhFgbbKwnb9MLmUQDhG6',decorations:{identity:{name:'Test audio'}}},volume:50,position:{position_ms:5000,timestamp_ms:Date.now(),speed:1},options:{repeat:'off',shuffle:false}});
    socket.on('data',data=>{let at=0;while(at+6<=data.length){const first=data[at],len=data[at+1]&0x7f,masked=!!(data[at+1]&0x80);if((first&0x0f)===8)break;
      let n=len,h=2;if(len===126){if(at+4>data.length)break;n=data.readUInt16BE(at+2);h=4;}if(len===127)break;
      if(masked)h+=4;if(at+h+n>data.length)break;
      const payload=Buffer.from(data.subarray(at+h,at+h+n));if(masked){const mask=data.subarray(at+h-4,at+h);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];}
      try{const msg=JSON.parse(payload.toString());commands.push(msg);if(msg.command==='get_queue')send(socket,{type:'queue_changed',upcoming:[],previous:[]});}catch{}
      at+=h+n;
    }});
  });
  await new Promise(r=>mock.listen(0,'127.0.0.1',r));
  const port=mock.address().port;
  const dir=await mkdtemp(path.join(os.tmpdir(),'aura-ws-'));
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,AURA_DATA_DIR:dir,AURA_TEST_PORT:'4391',SOLOIST_WS_URL:`ws://127.0.0.1:${port}/`},stdio:'pipe'});
  try{
    let data=null;
    for(let i=0;i<50;i++){try{const res=await fetch(`${ORIGIN}/api/bootstrap`);if(res.ok){data=await res.json();if(data.soloist?.playback?.item?.uri)break;}}catch{}await new Promise(r=>setTimeout(r,100));}
    assert.equal(data?.soloist?.connected,true);
    assert.equal(data?.soloist?.playback?.item?.decorations?.identity?.name,'Test audio');
    const response=await fetch(`${ORIGIN}/api/soloist/command`,{method:'POST',headers:{'Content-Type':'application/json','X-Aura-Request':data.csrf},body:JSON.stringify({command:'pause'})});
    assert.equal(response.status,200);
    await new Promise(r=>setTimeout(r,100));
    assert.ok(commands.some(x=>x.command==='pause'),`Mock received commands: ${JSON.stringify(commands)}`);
    assert.ok(commands.some(x=>x.command==='get_state'));
  } finally {
    child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));
    for(const socket of opened)socket.destroy();await new Promise(resolve=>mock.close(resolve));
    await rm(dir,{recursive:true,force:true});
  }
});

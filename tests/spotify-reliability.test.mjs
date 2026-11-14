import test from 'node:test';
import assert from 'node:assert/strict';
import {SpotifyAuth,HttpError} from '../lib/spotify.mjs';

const app=()=>{
 const a=new SpotifyAuth('/tmp/aura-mock-only');
 a.token=async()=> 'test-only-placeholder';
 return a;
};
async function stubFetch(responses,run){
 const real=globalThis.fetch;
 let hits=0;
 globalThis.fetch=async(_url,_opts)=>{
  const response=responses[hits++];
  if(response instanceof Error)throw response;
  return response;
 };
 try {await run(()=>hits);}
 finally{globalThis.fetch=real;}
}
function response(status,json={error:{message:'temporary'}},headers={}){
 return new Response(JSON.stringify(json),{status,headers:{'content-type':'application/json',...headers}});
}

test('GET retries a short 429 rate limit and returns real successful data',async()=>{
 const a=app();
 await stubFetch([response(429,{error:{message:'rate-limited'}},{'retry-after':'0'}),response(200,{items:[{name:'AURA'}]})],async hits=>{
  const result=await a.spotify('/me/tracks');
  assert.equal(hits(),2);
  assert.equal(result.items[0].name,'AURA');
 });
});
test('long Retry-After is surfaced rather than stalling UI',async()=>{
 const a=app();
 await stubFetch([response(429,{error:{message:'Wait before retrying'}},{'retry-after':'120'})],async hits=>{
  await assert.rejects(a.spotify('/me/albums'),err=>{
   assert.ok(err instanceof HttpError);
   assert.equal(err.status,429);
   assert.equal(err.retryAfter,'120');
   return true;
  });
  assert.equal(hits(),1);
 });
});
test('safe GET retries transient service failure, at most twice',async()=>{
 const a=app();
 await stubFetch([response(503),response(502),response(200,{items:['ok']})],async hits=>{
  assert.deepEqual((await a.spotify('/search?q=test&type=track')).items,['ok']);
  assert.equal(hits(),3);
 });
});
test('Spotify writes must never be retried automatically',async()=>{
 for(const method of ['POST','PUT','DELETE']){
  const a=app();
  await stubFetch([response(503)],async hits=>{
   await assert.rejects(a.spotify('/me/library',{method,json:{a:1}}),e=>e.status===503);
   assert.equal(hits(),1,method);
  });
 }
});
test('network errors become actionable HTTP errors, without leaking stack details',async()=>{
 const a=app();
 await stubFetch([new TypeError('secret local network diagnostics')],async hits=>{
  await assert.rejects(a.spotify('/me'),e=>{
   assert.equal(e.status,502);
   assert.ok(!e.message.includes('secret'));
   return true;
  });
  assert.equal(hits(),1);
 });
});

test('401 never replays playlist writes, even if the server may have applied them',async()=>{
 for(const method of ['POST','PUT','DELETE']){
  const a=app();
  await stubFetch([response(401,{error:{message:'expired authorization'}})],async hits=>{
   await assert.rejects(a.spotify('/playlists/test/items',{method,json:{items:[]}}),e=>e.status===401);
   assert.equal(hits(),1,method);
  });
 }
});
test('401 GET can refresh authorization and retry once',async()=>{
 const a=app();let forced=0;
 a.token=async(force=false)=>{if(force)forced++;return 'test-only-placeholder';};
 await stubFetch([response(401),response(200,{items:['ok']})],async hits=>{
  assert.deepEqual((await a.spotify('/me/tracks')).items,['ok']);
  assert.equal(hits(),2);assert.equal(forced,1);
 });
});

test('playlist writes explain permission, snapshot conflict and ambiguous outcomes safely',async()=>{
 const cases=[[401,'already have happened'],[403,'permissions'],[409,'latest snapshot'],[429,'Check the current playlist'],[503,'Check the current playlist']];
 for(const [status,hint] of cases){
  const a=app();
  await stubFetch([response(status,{error:{message:'sensitive upstream diagnostics'}})],async hits=>{
   await assert.rejects(a.spotify('/playlists/test/items',{method:'PUT',json:{snapshot_id:'old'}}),error=>{
    assert.equal(error.status,status);assert.ok(error.message.includes(hint));
    assert.ok(!error.message.includes('sensitive'));return true;
   });
   assert.equal(hits(),1);
  });
 }
});

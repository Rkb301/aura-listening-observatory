import test from 'node:test';import assert from 'node:assert/strict';
import { isLocalWsUrl,validateSoloistCommand,reduceSoloistState } from '../lib/soloist.mjs';
test('permits only loopback WebSocket connections',()=>{
  assert.equal(isLocalWsUrl('ws://127.0.0.1:9090/'),true);
  for(const url of ['ws://0.0.0.0:9090','ws://localhost:9090','wss://evil.org:9090','ws://127.0.0.1:9090/?path=evil','ws://127.0.0.1:9090@evil.com:9090/'])assert.equal(isLocalWsUrl(url),false,url);
});
test('validates all Soloist commands against official protocol',()=>{
  assert.deepEqual(validateSoloistCommand({command:'play',uri:'spotify:track:6rqhFgbbKwnb9MLmUQDhG6'}),{type:'command',command:'play',uri:'spotify:track:6rqhFgbbKwnb9MLmUQDhG6'});
  assert.deepEqual(validateSoloistCommand({command:'set_volume',volume:55}),{type:'command',command:'set_volume',volume:55});
  assert.deepEqual(validateSoloistCommand({command:'get_queue'}),{type:'command',command:'get_queue',limit:80});
  assert.throws(()=>validateSoloistCommand({command:'set_volume',volume:110}));
  assert.throws(()=>validateSoloistCommand({command:'play',uri:'file:///etc/passwd'}));
  assert.throws(()=>validateSoloistCommand({command:'add_to_queue',uri:'spotify:album:6rqhFgbbKwnb9MLmUQDhG6'}));
  assert.throws(()=>validateSoloistCommand({command:'exec',args:'rm -rf /'}));
});
test('reduces real Soloist events into live UI state',()=>{
  let s={connected:true,playback:null,auth:null,queue:{upcoming:[],previous:[]}};
  s=reduceSoloistState(s,{type:'auth_state',logged_in:true});
  s=reduceSoloistState(s,{type:'playback_state',status:'playing',volume:50,item:{uri:'spotify:track:123'}});
  s=reduceSoloistState(s,{type:'track_changed',item:{uri:'spotify:track:456'}});
  s=reduceSoloistState(s,{type:'playback_changed',status:'paused'});
  s=reduceSoloistState(s,{type:'volume_changed',volume:65});
  s=reduceSoloistState(s,{type:'position_sync',position:{position_ms:5000,timestamp_ms:10000,speed:0}});
  s=reduceSoloistState(s,{type:'queue_changed',upcoming:[{uid:'a',item:{uri:'spotify:track:789'}}],previous:[]});
  assert.equal(s.auth.logged_in,true);assert.equal(s.playback.item.uri,'spotify:track:456');assert.equal(s.playback.status,'paused');assert.equal(s.playback.volume,65);assert.equal(s.playback.position.position_ms,5000);assert.equal(s.queue.upcoming.length,1);
});

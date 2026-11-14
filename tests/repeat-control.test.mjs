import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the actual control() implementation with mocked UI and HTTP, not
// the user's live Soloist or Spotify account.
const source=readFileSync(new URL('../src/app-core.js',import.meta.url),'utf8');
const start=source.indexOf('async function control(');
const end=source.indexOf('\nasync function like(',start);
assert.ok(start>0&&end>start);
const implementation=source.slice(start,end);
const delay=()=>new Promise(resolve=>setImmediate(resolve));

test('repeat button cycles off → context → track → off using one Soloist command each',async()=>{
 const state={soloist:{connected:true,playback:{options:{repeat:'off'}}}};
 const calls=[];
 const context={state,toast:()=>{throw Error('Unexpected toast')},
   act:async fn=>fn(),request:async (_url,method,body)=>{assert.equal(method,'POST');calls.push(body);return {accepted:true};}};
 const control=runInNewContext(implementation+'\ncontrol;',context);
 for(const [current,expected] of [
  ['off',{command:'set_repeat_context',enabled:true}],
  ['context',{command:'set_repeat_track',enabled:true}],
  ['track',{command:'set_repeat_track',enabled:false}]
 ]){
  state.soloist.playback.options.repeat=current;
  const before=calls.length;
  await control('repeat_cycle');
  assert.equal(calls.length,before+1,'one command per click');
  assert.deepEqual({...calls.at(-1)},expected);
 }
 await delay();
});

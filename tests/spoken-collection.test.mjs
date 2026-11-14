import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeAudioEntries,audioShelf} from '../src/expansion.js';
const ep=(name,position,duration=600000)=>({episode:{name,id:'1234567890123456789012',uri:'spotify:episode:1234567890123456789012',duration_ms:duration,show:{name:'Stories'}},resume_point:position===null?undefined:{resume_position_ms:position,fully_played:false}});
test('spoken collection filtering includes show names, case folding and preserves source order',()=>{
 const items=[ep('A winter',0),ep('Night sky',120000),ep('A river',null)];
 assert.deepEqual(organizeAudioEntries(items,'episodes','NIGHT').map(e=>e.episode.name),['Night sky']);
 assert.equal(organizeAudioEntries(items,'episodes','stories').length,3);
 assert.deepEqual(organizeAudioEntries(items,'episodes').map(e=>e.episode.name),items.map(e=>e.episode.name));
});
test('continue listening puts started unfinished episodes first and respects known remaining time',()=>{
 const items=[ep('Unstarted',0),ep('Almost done',550000),ep('Unknown',null),ep('Started',100000)];
 assert.deepEqual(organizeAudioEntries(items,'episodes','','continue').map(e=>e.episode.name),['Almost done','Started','Unstarted','Unknown']);
 assert.deepEqual(organizeAudioEntries(items,'episodes','','title').map(e=>e.episode.name),['Almost done','Started','Unknown','Unstarted']);
});
test('spoken UI renders controls and truthful loaded-only result count',()=>{
 const result=audioShelf({state:{audioShelf:{kind:'episodes',episodes:[ep('Night sky',120000),ep('River',0)],shows:[],audiobooks:[],filter:'night',sort:'continue',more:false}},esc:s=>String(s),icon:()=>'',art:()=>''});
 assert.match(result,/id="audio-filter"/);
 assert.match(result,/id="audio-sort"/);
 assert.match(result,/1 of 2 loaded/);
 assert.match(result,/Night sky/);
 assert.doesNotMatch(result,/<h3>River<\/h3>/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeLibraryPage,unwrapLibraryItem} from '../src/library-paging.js';

const track=(id)=>({id,uri:'spotify:track:'+id,name:'Track '+id});
const album=(id)=>({id,uri:'spotify:album:'+id,name:'Album '+id});
const playlist=(id)=>({id,uri:'spotify:playlist:'+id,name:'Playlist '+id});

test('tracks unwrap Spotify wrappers and skip null/deleted entries',()=>{
 const data=mergeLibraryPage('tracks',null,{
  items:[{track:track('a')},{track:null},{track:track('b')}],total:6,next:'next'
 },{replace:true,offset:0});
 assert.deepEqual(data.items.map(x=>x.id),['a','b']);
 assert.equal(data.nextOffset,3); // raw item count, not 2 rendered
 assert.equal(data.loaded,2);
 assert.equal(data.hasMore,true);
});
test('overlapping pages deduplicate but always advance raw offset',()=>{
 let current=mergeLibraryPage('albums',null,{items:[{album:album('a')},{album:album('b')}],total:4,next:'next'},{replace:true});
 current=mergeLibraryPage('albums',current,{items:[{album:album('b')},{album:album('c')}],total:4,next:null},{offset:2});
 assert.deepEqual(current.items.map(x=>x.id),['a','b','c']);
 assert.equal(current.nextOffset,4);
 assert.equal(current.hasMore,false);
});
test('empty page terminates scanning even if Spotify promises a next page',()=>{
 const p=mergeLibraryPage('playlists',null,{items:[],next:'misleading',total:100},{replace:true,offset:30});
 assert.equal(p.nextOffset,30);assert.equal(p.hasMore,false);
});
test('playlist items and original sort order preserved',()=>{
 const input=[playlist('x'),playlist('y')];
 const p=mergeLibraryPage('playlists',null,{items:input,total:2,next:null},{replace:true});
 assert.deepEqual(p.items,input);
 assert.equal(p.hasMore,false);
});
test('invalid or missing pagination parameters are rejected',()=>{
 assert.throws(()=>mergeLibraryPage('nope',null,{items:[]}),/Unknown/);
 assert.throws(()=>mergeLibraryPage('tracks',null,{items:null}),/Invalid Spotify page/);
 assert.throws(()=>mergeLibraryPage('tracks',null,{items:[]},{offset:-1}),/Invalid offset/);
 assert.equal(unwrapLibraryItem('tracks',null),null);
});
test('saved item timestamps retained for accurate recently-saved ordering',()=>{
  const p=mergeLibraryPage('tracks',null,{items:[
    {track:track('older'),added_at:'2025-02-01T09:00:00Z'},
    {track:track('newer'),added_at:'2026-11-11T18:00:00Z'}
  ],total:2,next:null},{replace:true});
  assert.equal(p.items[0].__auraAddedAt,'2025-02-01T09:00:00Z');
  assert.equal(p.items[1].__auraAddedAt,'2026-11-11T18:00:00Z');
  const sorted=[...p.items].sort((a,b)=>Date.parse(b.__auraAddedAt)-Date.parse(a.__auraAddedAt));
  assert.deepEqual(sorted.map(x=>x.id),['newer','older']);
});
test('new full refresh drops old data rather than contaminating totals',()=>{
 const old=mergeLibraryPage('tracks',null,{items:[{track:track('old')}],total:1,next:null},{replace:true});
 const fresh=mergeLibraryPage('tracks',old,{items:[{track:track('fresh')}],total:1,next:null},{replace:true});
 assert.deepEqual(fresh.items.map(x=>x.id),['fresh']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacentPlaylistMove,validateReorder,validatePlaylistRemoval,validatePlaylistMetadata} from '../lib/playlist-operations.mjs';

test('move down uses original-index insert_before after the next item',()=>{
  assert.deepEqual(adjacentPlaylistMove(0,1,4),{range_start:0,insert_before:2,range_length:1});
  assert.deepEqual(adjacentPlaylistMove(2,1,4),{range_start:2,insert_before:4,range_length:1});
});
test('move up uses preceding index and respects boundaries',()=>{
  assert.deepEqual(adjacentPlaylistMove(2,-1,4),{range_start:2,insert_before:1,range_length:1});
  assert.equal(adjacentPlaylistMove(0,-1,4),null);
  assert.equal(adjacentPlaylistMove(3,1,4),null);
});
test('reorder validation accepts only adjacent moves with valid snapshots',()=>{
  assert.deepEqual(validateReorder({
    range_start:0,insert_before:2,range_length:1,snapshot_id:'snap-001',total:4
  }),{range_start:0,insert_before:2,range_length:1,snapshot_id:'snap-001'});
  for(const bad of [
    {range_start:-1,insert_before:2},{range_start:0,insert_before:0},
    {range_start:0,insert_before:3},{range_start:3,insert_before:5},
    {range_start:1,insert_before:0,range_length:2},
    {range_start:1,insert_before:0,snapshot_id:''},
    {range_start:1,insert_before:0,snapshot_id:'a\nb'}
  ]){
    assert.throws(()=>validateReorder({range_start:1,insert_before:0,range_length:1,snapshot_id:'valid',total:4,...bad}),TypeError);
  }
});
test('reorder builder rejects invalid types and positions',()=>{
  for(const args of [[1,0,4],['1',1,4],[1,2,4],[4,-1,4],[1,-1,-1]]) {
    assert.throws(()=>adjacentPlaylistMove(...args),TypeError);
  }
});

test('playlist removal requires explicit all-copies acknowledgement and a snapshot',()=>{
  const uri='spotify:track:4fsQ0K37TOXa3hEQfjEic1';
  const body={uri,snapshot_id:'snapshot-abc',confirm_all_occurrences:true};
  assert.deepEqual(validatePlaylistRemoval(body),{items:[{uri}],snapshot_id:'snapshot-abc'});
  const episode='spotify:episode:512ojhOuo1ktJprKbVcKyQ';
  assert.deepEqual(validatePlaylistRemoval({...body,uri:episode}).items,[{uri:episode}]);
  for(const invalid of [
    null,[],{}, {...body,confirm_all_occurrences:false},
    {...body,confirm_all_occurrences:'true'},
    {...body,snapshot_id:''},
    {...body,snapshot_id:'s\nnap'},
    {...body,uri:'spotify:album:4aawyAB9vmqN3uQ7FjRGTy'},
    {...body,uri:'https://evil.invalid/track'},
    {...body,positions:[3]},
    {...body,snapshot_id:123}
  ])assert.throws(()=>validatePlaylistRemoval(invalid),TypeError);
});

test('playlist metadata rejects object coercion, hidden fields and silent truncation',()=>{
  assert.deepEqual(validatePlaylistMetadata({name:'  My Mix  '},{create:true}),{public:false,name:'My Mix',description:''});
  assert.deepEqual(validatePlaylistMetadata({name:'My Mix',description:'A playlist'}),{name:'My Mix',description:'A playlist'});
  for(const invalid of [null,[],{}, {name:{}},{name:123},{name:' '},
    {name:'x'.repeat(101)},{name:'ok',description:{}},
    {name:'ok',description:'x'.repeat(301)},
    {name:'ok',public:true},{name:'ok',description:'\u0000'}])
    assert.throws(()=>validatePlaylistMetadata(invalid),TypeError);
});

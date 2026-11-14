import test from 'node:test';
import assert from 'node:assert/strict';
import {audioShelf} from '../src/expansion.js';
import {SCOPES} from '../lib/spotify.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,
  x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const html=(kind,items)=>audioShelf({
  state:{audioShelf:{
    kind,shows:kind==='shows'?items:[],
    episodes:kind==='episodes'?items:[],
    audiobooks:kind==='audiobooks'?items:[],
    loading:false,loaded:{},more:false
  }},
  esc,icon:()=>'',art:()=>''
});
const episode=(suffix='a')=>({
  id:'12345678901234567890'+suffix,
  uri:'spotify:episode:12345678901234567890'+suffix,
  name:'A thoughtful episode',
  duration_ms:120000,
  show:{name:'A Real Podcast'}
});

test('shows exact Spotify resume data, never fabricated episode progress',()=>{
  const result=html('episodes',[{episode:episode(),resume_point:{
    resume_position_ms:60000,fully_played:false
  }}]);
  assert.match(result,/50/);
  assert.match(result,/1 min remaining on Spotify/);
  assert.match(result,/role="progressbar"/);
  assert.match(result,/aria-valuenow="50"/);
  assert.match(result,/data-play="spotify:episode:/);
  const noProgress=html('episodes',[{episode:episode('b')}]);
  assert.doesNotMatch(noProgress,/role="progressbar"/);
  const unknownPosition=html('episodes',[{episode:episode('d'),resume_point:{resume_position_ms:null,fully_played:false}}]);
  assert.doesNotMatch(unknownPosition,/role="progressbar"/);
  assert.match(noProgress,/progress appears only when Spotify/i);
});
test('completed Spotify episodes are rendered as completed without inventing local playback history',()=>{
  const result=html('episodes',[{episode:episode('c'),resume_point:{fully_played:true}}]);
  assert.match(result,/Completed on Spotify/);
  assert.match(result,/aria-valuenow="100"/);
});
test('shows and audiobooks hand off to Spotify rather than promising unverified Soloist playback',()=>{
  const show=html('shows',[{show:{id:'12345678901234567890',uri:'spotify:show:12345678901234567890',name:'Shows'}}]);
  assert.doesNotMatch(show,/data-play="spotify:show:/);
  assert.match(show,/data-audio-open="show:12345678901234567890"/);
  const book=html('audiobooks',[{id:'12345678901234567890',uri:'spotify:audiobook:12345678901234567890',name:'Books'}]);
  assert.doesNotMatch(book,/data-play="spotify:audiobook:/);
  assert.match(book,/data-audio-open="audiobook:12345678901234567890"/);
});
test('spoken-worlds fields remain escaped and future OAuth logins may request progress scope',()=>{
  const item=episode();
  item.name='<img src=x onerror=alert(1)>';
  const result=html('episodes',[{episode:item}]);
  assert.doesNotMatch(result,/<img src=x onerror=/);
  assert.match(result,/&lt;img src=x/);
  assert.ok(SCOPES.includes('user-read-playback-position'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,stat,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseMixUri,validMixName,pinMix,loadMixes,saveMixes,moveMix,removeMix} from '../lib/pinned-mixes.mjs';

const testId='37i9dQZF1EIZryeCehZItf';
test('pins only well-formed Spotify playlists and not arbitrary URLs',()=>{
  const uri='spotify:playlist:'+testId;
  assert.equal(parseMixUri(uri),uri);
  assert.equal(parseMixUri('https://open.spotify.com/playlist/'+testId+'?si=test'),uri);
  assert.equal(parseMixUri('https://open.spotify.com/intl-en/playlist/'+testId+'?si=x'),uri);
  for(const bad of ['http://open.spotify.com/playlist/'+testId,'https://evil.com/playlist/'+testId,
      'https://open.spotify.com/track/'+testId,'spotify:track:'+testId,
      'https://open.spotify.com.evil.test/playlist/'+testId,'file:///etc/passwd','javascript:alert(1)']){
    assert.equal(parseMixUri(bad),null,bad);
  }
  assert.equal(validMixName('Techno Mix'),true);
  assert.equal(validMixName(' '),false);
  assert.equal(validMixName('Unsafe\nname'),false);
});
test('pinned mixes persist locally without secrets, allow reorder and unpin',async()=>{
  const folder=await mkdtemp(path.join(os.tmpdir(),'aura-mixes-'));
  try{
    assert.deepEqual(await loadMixes(folder),[]);
    const one='spotify:playlist:'+testId;
    const two='spotify:playlist:37i9dQZF1EIXB8N7R7sZ0S';
    let items=pinMix([], {uri:one,name:'Daily Mix'});
    items=pinMix(items,{uri:two,name:'Techno Mix'});
    assert.equal(items.length,2);
    assert.deepEqual(items.map(x=>x.name),['Techno Mix','Daily Mix']);
    items=moveMix(items,one,-1);
    assert.equal(items[0].name,'Daily Mix');
    await saveMixes(folder,items);
    assert.equal((await loadMixes(folder))[1].name,'Techno Mix');
    if(process.platform!=='win32')assert.equal((await stat(path.join(folder,'pinned-mixes.json'))).mode&0o777,0o600);
    items=removeMix(items,two);
    assert.equal(items.length,1);
    assert.throws(()=>pinMix(items,{uri:'http://evil.test',name:'Bad'}));
    assert.throws(()=>pinMix(items,{uri:one,name:' '}));
  }finally{await rm(folder,{recursive:true,force:true});}
});

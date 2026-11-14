import test from 'node:test';
import assert from 'node:assert/strict';
import {makePersonalizationBackup,parsePersonalizationBackup} from '../lib/personalization.mjs';

const uri='spotify:playlist:37i9dQZF1EIZryeCehZItf';
test('personalization exports only names and URIs, never credentials',()=>{
 const backup=makePersonalizationBackup([{uri,name:'My Daily Mix',apiKey:'PRIVATE',artwork:'https://elsewhere/'}]);
 assert.equal(backup.format,'aura-personalization');
 assert.equal(backup.version,1);
 assert.deepEqual(backup.pinnedMixes,[{uri,name:'My Daily Mix'}]);
 assert.equal(JSON.stringify(backup).includes('PRIVATE'),false);
});
test('valid backup round trips with safe normalized Spotify playlists',()=>{
 const backup=makePersonalizationBackup([{uri,name:'Techno Mix'}]);
 assert.deepEqual(parsePersonalizationBackup(backup).map(x=>({uri:x.uri,name:x.name})),backup.pinnedMixes);
});
test('rejects unsupported, duplicated or suspicious backups without partial imports',()=>{
 const valid=makePersonalizationBackup([{uri,name:'Daily Mix'}]);
 for(const candidate of [
  {...valid,version:999},
  {...valid,access_token:'not-allowed'},
  {...valid,format:'other'},
  {...valid,pinnedMixes:[{uri,name:'Ok',access_token:'secret'}]},
  {...valid,pinnedMixes:[{uri,name:'Ok'},{uri,name:'Duplicate'}]},
  {...valid,pinnedMixes:[{uri:'spotify:track:4fsQ0K37TOXa3hEQfjEic1',name:'Not playlist'}]},
  {...valid,pinnedMixes:'bad'},
  {...valid,pinnedMixes:Array(101).fill({uri,name:'Lots'})},
  {...valid,pinnedMixes:[{uri,name:'bad\nname'}]}
 ]){
  assert.throws(()=>parsePersonalizationBackup(candidate),TypeError);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {isLocalAuraUrl,isTrustedSpotifyUrl,isSpotifyAuthorizationUrl,isAuraHealth}=require('../desktop/security.cjs');

test('desktop window may navigate only to exact AURA loopback origin',()=>{
  assert.equal(isLocalAuraUrl('http://127.0.0.1:4373/'),true);
  assert.equal(isLocalAuraUrl('http://127.0.0.1:4373/api/health'),true);
  for(const evil of [
    'https://127.0.0.1:4373/',
    'http://127.0.0.1:4374/',
    'http://localhost:4373/',
    'http://127.0.0.1.evil.invalid:4373/',
    'http://user:secret@127.0.0.1:4373/',
    'javascript:alert(1)',
    'file:///etc/passwd'
  ])assert.equal(isLocalAuraUrl(evil),false,evil);
});
test('external Spotify links are strictly HTTPS and exact known domains',()=>{
  assert.equal(isTrustedSpotifyUrl('https://open.spotify.com/track/4fsQ0K37TOXa3hEQfjEic1'),true);
  assert.equal(isTrustedSpotifyUrl('https://accounts.spotify.com/authorize?client_id=test'),true);
  for(const evil of [
    'http://accounts.spotify.com/authorize',
    'https://accounts.spotify.com.evil.invalid/authorize',
    'https://open.spotify.com@evil.invalid/track/a',
    'https://evil.invalid/playlist/anything',
    'data:text/html,hi',
    'https://open.spotify.com:8443/track/a'
  ])assert.equal(isTrustedSpotifyUrl(evil),false,evil);
});
test('only official Spotify OAuth authorize URL triggers desktop callback tracking',()=>{
 assert.equal(isSpotifyAuthorizationUrl('https://accounts.spotify.com/authorize?response_type=code'),true);
 assert.equal(isSpotifyAuthorizationUrl('https://accounts.spotify.com/api/token'),false);
 assert.equal(isSpotifyAuthorizationUrl('https://open.spotify.com/authorize'),false);
});

test('desktop only accepts the expected AURA health contract',()=>{
 const healthy={status:'ok',version:'0.8.0',spotifyAuthenticated:true,soloistConnected:true,credentialsSaved:true};
 assert.equal(isAuraHealth(healthy),true);
 assert.equal(isAuraHealth({...healthy,version:'0.7.0'}),true);
 for(const bad of [null,[],{}, {status:'ok'}, {...healthy,version:'evil'}, {...healthy,spotifyAuthenticated:'true'}, {...healthy,credentialsSaved:undefined}, {...healthy,status:'success'}]){
  assert.equal(isAuraHealth(bad),false);
 }
});

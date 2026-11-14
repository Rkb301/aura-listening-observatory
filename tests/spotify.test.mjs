import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SpotifyAuth, HttpError, validClientId, validSpotifyUri, REDIRECT_URI, SCOPES } from '../lib/spotify.mjs';

test('validates Spotify IDs and URIs without exposing credentials', () => {
  assert.equal(validClientId('0123456789abcdef0123456789abcdef'),true);
  assert.equal(validClientId('bad'),false);
  assert.equal(validSpotifyUri('spotify:track:6rqhFgbbKwnb9MLmUQDhG6'),true);
  assert.equal(validSpotifyUri('https://example.com'),false);
  assert.equal(validSpotifyUri('spotify:track:foo?x=1'),false);
});
test('generates valid PKCE authorization requests and prevents invalid callback state',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'aura-test-'));try{
    const app=new SpotifyAuth(dir);await app.init();
    await assert.rejects(app.setClientId('bad'),HttpError);
    await app.setClientId('0123456789abcdef0123456789abcdef');
    const url=new URL(app.loginUrl());
    assert.equal(url.origin,'https://accounts.spotify.com');assert.equal(url.searchParams.get('response_type'),'code');
    assert.equal(url.searchParams.get('redirect_uri'),REDIRECT_URI);
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    assert.equal(url.searchParams.get('code_challenge').length,43);
    assert.ok(SCOPES.length>=5);
    assert.ok(!url.searchParams.has('client_secret'));
    await assert.rejects(app.handleCallback(new URLSearchParams('state=incorrect&code=abc')),HttpError);
    assert.equal(app.status().loggedIn,false);
  }finally{await rm(dir,{recursive:true,force:true});}
});

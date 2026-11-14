'use strict';

// These allowlists protect the privileged desktop shell. Never hand arbitrary
// URLs from Spotify catalog metadata to shell.openExternal.
const LOCAL_ORIGIN='http://127.0.0.1:4373';
const TRUSTED_SITES=new Set(['accounts.spotify.com','open.spotify.com']);
function safeUrl(value){
  if(typeof value!=='string'||value.length>4096)return null;
  try{
    const u=new URL(value);
    if(u.username||u.password)return null;
    return u;
  }catch{return null;}
}
function isLocalAuraUrl(value){
  const u=safeUrl(value);
  return !!u && u.origin===LOCAL_ORIGIN && u.protocol==='http:';
}
function isTrustedSpotifyUrl(value){
  const u=safeUrl(value);
  return !!u && u.protocol==='https:' && TRUSTED_SITES.has(u.hostname)
    && (u.port===''||u.port==='443');
}
function isSpotifyAuthorizationUrl(value){
  const u=safeUrl(value);
  return !!u && u.protocol==='https:' && u.hostname==='accounts.spotify.com'
    && u.pathname==='/authorize' && !u.username && !u.password;
}
// Avoid attaching a privileged desktop window to an unrelated service that
// happens to return HTTP 200 on the AURA loopback port. Versions may differ
// during supervised upgrades; only the stable health contract is required.
function isAuraHealth(value){
  return !!value && typeof value==='object' && !Array.isArray(value)
    && value.status==='ok' && /^\d+\.\d+\.\d+$/.test(value.version||'')
    && typeof value.spotifyAuthenticated==='boolean'
    && typeof value.soloistConnected==='boolean'
    && typeof value.credentialsSaved==='boolean';
}
module.exports={LOCAL_ORIGIN,isLocalAuraUrl,isTrustedSpotifyUrl,isSpotifyAuthorizationUrl,isAuraHealth};

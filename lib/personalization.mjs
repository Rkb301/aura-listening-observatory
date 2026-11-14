// User-owned AURA personalization backup: bookmarks only. Never credentials.
import {parseMixUri,validMixName} from './pinned-mixes.mjs';

export function makePersonalizationBackup(mixes){
  const safe=Array.isArray(mixes)?mixes:[];
  return {
    format:'aura-personalization',
    version:1,
    exportedAt:new Date().toISOString(),
    pinnedMixes:safe.map(x=>({uri:x.uri,name:x.name}))
  };
}
export function parsePersonalizationBackup(data){
  if(!data || typeof data!=='object'||Array.isArray(data)
      ||data.format!=='aura-personalization'||data.version!==1
      ||Object.keys(data).some(key=>!['format','version','exportedAt','pinnedMixes'].includes(key))
      ||!Array.isArray(data.pinnedMixes)||data.pinnedMixes.length>100)
    throw new TypeError('Not a supported AURA personalization backup.');
  const seen=new Set();
  const mixes=[];
  for(const mix of data.pinnedMixes){
    if(!mix||typeof mix!=='object'||Array.isArray(mix)
        ||Object.keys(mix).some(key=>!['uri','name'].includes(key)))
      throw new TypeError('Unrecognized field in a pinned mix.');
    const uri=parseMixUri(mix.uri);
    if(!uri||!validMixName(mix.name)||seen.has(uri))
      throw new TypeError('Invalid or duplicate Spotify playlist in backup.');
    seen.add(uri);
    mixes.push({uri,name:mix.name.trim(),artwork:'',addedAt:Date.now()});
  }
  return mixes;
}

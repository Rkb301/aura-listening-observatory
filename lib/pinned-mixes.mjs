import path from 'node:path';
import {mkdir,readFile,writeFile,rename,chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

const FILE='pinned-mixes.json';
const ID=/^[A-Za-z0-9]{10,64}$/;
const NAME_MAX=90;
export function parseMixUri(value) {
  if(typeof value!=='string')return null;
  const input=value.trim();
  let match=/^spotify:playlist:([A-Za-z0-9]{10,64})$/.exec(input);
  if(match)return 'spotify:playlist:'+match[1];
  try{
    const url=new URL(input);
    if(url.protocol!=='https:'||url.hostname!=='open.spotify.com'||url.username||url.password)return null;
    match=/^\/(?:intl-[a-z]{2}\/)?playlist\/([A-Za-z0-9]{10,64})\/?$/.exec(url.pathname);
    return match?'spotify:playlist:'+match[1]:null;
  }catch{return null;}
}
export function validMixName(value){
  return typeof value==='string' && value.trim().length>0 && value.trim().length<=NAME_MAX && !/[\x00-\x1f\x7f]/.test(value);
}
const fileName=dir=>path.join(dir,FILE);
export async function loadMixes(dir){
  try{
    const data=JSON.parse(await readFile(fileName(dir),'utf8'));
    return Array.isArray(data)?data.filter(x=>parseMixUri(x?.uri)===x?.uri&&validMixName(x?.name))
      .slice(0,100).map(x=>({uri:x.uri,name:x.name.trim(),artwork:typeof x.artwork==='string'&&/^https:\/\/(?:i\.scdn\.co|mosaic\.scdn\.co)\//.test(x.artwork)?x.artwork:'',addedAt:Number.isFinite(x.addedAt)?x.addedAt:0})):[];
  }catch(error){
    if(error.code==='ENOENT')return [];
    throw error;
  }
}
export async function saveMixes(dir,items){
  if(!Array.isArray(items)||items.length>100)throw new Error('Maximum 100 pinned mixes.');
  const seen=new Set();
  for(const mix of items){
    if(parseMixUri(mix.uri)!==mix.uri||!validMixName(mix.name)||seen.has(mix.uri))throw new Error('Invalid or duplicate pinned mix.');
    seen.add(mix.uri);
  }
  await mkdir(dir,{recursive:true,mode:0o700});
  const dest=fileName(dir),tmp=dest+'.'+randomBytes(6).toString('hex')+'.tmp';
  await writeFile(tmp,JSON.stringify(items,null,2),{mode:0o600,flag:'wx'});
  try{await rename(tmp,dest);await chmod(dest,0o600);}catch(error){throw error;}
}
export function pinMix(existing,{uri,name,artwork=''}) {
  const parsed=parseMixUri(uri);
  if(!parsed||!validMixName(name))throw new Error('Provide a valid Spotify playlist URL/URI and a name under 90 characters.');
  const next=existing.filter(x=>x.uri!==parsed);
  if(next.length>=100)throw new Error('Maximum 100 pinned mixes.');
  return [{uri:parsed,name:name.trim(),artwork,addedAt:Date.now()},...next];
}
export function removeMix(existing,uri) {
  const parsed=parseMixUri(uri);
  if(!parsed)throw new Error('Invalid Spotify playlist URL/URI.');
  return existing.filter(x=>x.uri!==parsed);
}
export function moveMix(existing,uri,direction){
  if(![-1,1].includes(direction))throw new Error('Invalid move direction.');
  const idx=existing.findIndex(x=>x.uri===parseMixUri(uri)),target=idx+direction;
  if(idx<0||target<0||target>=existing.length)return existing;
  const copy=[...existing];[copy[idx],copy[target]]=[copy[target],copy[idx]];return copy;
}

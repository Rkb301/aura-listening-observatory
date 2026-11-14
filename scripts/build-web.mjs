// Build a single local UI bundle for both old and new AURA loopback servers.
// Keeps source modules readable while supporting the existing server asset allowlist.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const checkOnly=process.argv.includes('--check');
if(process.argv.slice(2).some(arg=>arg!=='--check'))throw new Error('Usage: node scripts/build-web.mjs [--check]');
const load=rel=>readFile(path.join(root,rel),'utf8');
const [experience,moreViews,expansion,paging,core,baseCss,detailCss,moreCss,expansionCss]=await Promise.all([
  load('src/experience.js'),load('src/views-next.js'),load('src/expansion.js'),load('src/library-paging.js'),load('src/app-core.js'),
  load('src/styles-base.css'),load('src/experience.css'),load('src/views-next.css'),load('src/expansion.css')
]);
const importLine="import { chamber, observatory, collection } from './experience.js';";
if(!core.includes(importLine))throw new Error('AURA app import signature changed; review before rebuilding.');
const moreImport="import { discovery, queueSpace, archiveDetail } from './views-next.js';";
if(!core.includes(moreImport))throw new Error('Additional view import signature changed.');
const expansionImport="import { madeForYou, yourSound, audioShelf, listeningTools } from './expansion.js';";
if(!core.includes(expansionImport))throw new Error('Expansion import signature changed.');
const pagingImport="import {mergeLibraryPage} from './library-paging.js';";
if(!core.includes(pagingImport))throw new Error('Pagination import signature changed.');
const code=experience.replace(/^export (?=function )/gm,'')+'\n'
  +moreViews.replace(/^export (?=function )/gm,'')+'\n'
  +expansion.replace(/^export (?=function )/gm,'')+'\n'
  +paging.replace(/^export (?=(?:function|const) )/gm,'')+'\n'
  +core.replace(importLine,'').replace(moreImport,'').replace(expansionImport,'').replace(pagingImport,'').trimStart();
const css=baseCss+'\n\n'+detailCss+'\n\n'+moreCss+'\n\n'+expansionCss;
if(checkOnly){
  const [existingCode,existingCss]=await Promise.all([load('public/app.js'),load('public/styles.css')]);
  if(existingCode!==code||existingCss!==css){
    console.error('Generated web assets are stale or manually edited. Run npm run build:web and commit both source and generated files.');
    process.exitCode=1;
  }else console.log('Generated web assets match canonical source.');
}else{
  await writeFile(path.join(root,'public/app.js'),code);
  await writeFile(path.join(root,'public/styles.css'),css);
  console.log('Built single-file AURA interface and stylesheet.');
}

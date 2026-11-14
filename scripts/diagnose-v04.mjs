import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir=await mkdtemp(path.join(os.tmpdir(),'aura-browser-'));
const root=path.resolve(import.meta.dirname,'..');
const dest=path.join(root,'test-artifacts');
await mkdir(dest,{recursive:true});
const port=19473;
const chrome=spawn('google-chrome',[
 '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--disable-background-networking','--no-first-run',
 '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,
 '--user-data-dir='+dir,'--window-size=1480,980','about:blank'
],{stdio:'ignore'});
const delay=t=>new Promise(r=>setTimeout(r,t));
let socket,seq=0;
const pending=new Map();
async function call(method,params={}){
 const id=++seq;
 const result=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));
 socket.send(JSON.stringify({id,method,params}));
 return result;
}
async function evaluate(expression){
 const reply=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(reply.exceptionDetails)throw new Error(reply.exceptionDetails.text);
 return reply.result.result.value;
}
try{
 let url='';
 for(let i=0;i<40;i++){
  try{const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   url=targets.find(x=>x.type==='page')?.webSocketDebuggerUrl||'';if(url)break;
  }catch{}
  await delay(150);
 }
 if(!url)throw new Error('Chrome debug endpoint unavailable');
 socket=new WebSocket(url);
 socket.onmessage=event=>{
   const msg=JSON.parse(event.data);
   if(msg.id&&pending.has(msg.id)){
      const p=pending.get(msg.id);pending.delete(msg.id);
      msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg);
   }
 };
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 await call('Page.enable');await call('Runtime.enable');
 await call('Page.navigate',{url:'http://127.0.0.1:4374/'});
 await delay(3400);
 for(const view of ['home','mixes','sound','podcasts','tools']){
    if(view!=='home') await evaluate('document.querySelector("[data-nav='+view+']").click()');
    await delay(view==='sound'?2000:750);
    const details=await evaluate("({view:document.querySelector('.bread strong')?.textContent,mainText:document.querySelector('#main')?.textContent?.slice(0,125),classNames:document.querySelector('#main')?.firstElementChild?.className,toolsCount:document.querySelectorAll('[data-sleep-minutes]').length,counts:{mixes:document.querySelectorAll('.mix-tile').length,candidates:document.querySelectorAll('.saved-mix-row').length}})");
    console.log(JSON.stringify(details));
  }

}finally{
 try{socket?.close()}catch{}
 chrome.kill('SIGTERM');
 await delay(250);
 await rm(dir,{recursive:true,force:true,maxRetries:4,retryDelay:250}).catch(()=>{});
}

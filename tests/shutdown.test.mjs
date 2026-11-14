import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const PORT=4392;
const ORIGIN='http://127.0.0.1:'+PORT;

test('AURA stops gracefully with a connected Server-Sent Events client',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'aura-graceful-'));
 const child=spawn(process.execPath,['server.mjs'],{
   cwd:new URL('..',import.meta.url).pathname,
   env:{...process.env,AURA_DATA_DIR:dir,AURA_TEST_PORT:String(PORT)},
   stdio:'ignore'
 });
 let stream=null;
 try{
   let started=false;
   for(let i=0;i<40;i++){
     try{const r=await fetch(ORIGIN+'/api/health'); if(r.ok){started=true;break;}}catch{}
     await new Promise(r=>setTimeout(r,100));
   }
   assert.ok(started,'isolated server started');
   stream=http.get(ORIGIN+'/api/events');
   const connected=await new Promise((resolve,reject)=>{
     stream.once('response',res=>{res.once('data',()=>resolve(true));});
     stream.once('error',reject);
     setTimeout(()=>resolve(false),2200).unref();
   });
   assert.equal(connected,true,'SSE stream is open');
   const exitResult=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
   child.kill('SIGTERM');
   const outcome=await Promise.race([exitResult,new Promise(resolve=>setTimeout(()=>resolve('timed-out'),3000))]);
   assert.notEqual(outcome,'timed-out','process exited promptly even with active SSE');
   assert.equal(outcome.code,0);
 }finally{
   stream?.destroy();
   if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');
   await rm(dir,{recursive:true,force:true});
 }
});

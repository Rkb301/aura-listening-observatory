import { spawn } from 'node:child_process';
import { access, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const commands = new Set(['play','pause','skip_next','skip_prev','seek','set_volume','set_shuffle','set_repeat_context','set_repeat_track','add_to_queue','activate','deactivate','get_state','get_queue','get_auth_state']);
export function validateSoloistCommand(data) {
  if (!data || typeof data !== 'object' || !commands.has(data.command)) throw new Error('Unsupported Soloist command.');
  const cmd = {type:'command',command:data.command};
  if (data.command==='play' && data.uri!==undefined) {
    if (!/^spotify:(track|album|playlist|episode|show):[A-Za-z0-9]{10,64}$/.test(data.uri)) throw new Error('Invalid playable URI.');
    cmd.uri=data.uri;
  }
  if (data.command==='add_to_queue') {
    if (!/^spotify:track:[A-Za-z0-9]{10,64}$/.test(data.uri||'')) throw new Error('Queue supports track URIs only.');
    cmd.uri=data.uri;
  }
  if (data.command==='seek') {
    if (!Number.isInteger(data.position_ms) || data.position_ms < 0 || data.position_ms > 86400000) throw new Error('Invalid seek position.');
    cmd.position_ms=data.position_ms;
  }
  if (data.command==='set_volume') {
    if (!Number.isInteger(data.volume) || data.volume<0 || data.volume>100) throw new Error('Volume must be 0–100.');
    cmd.volume=data.volume;
  }
  if (['set_shuffle','set_repeat_context','set_repeat_track'].includes(data.command)) {
    if (typeof data.enabled !== 'boolean') throw new Error('Enabled must be boolean.');
    cmd.enabled=data.enabled;
  }
  if (data.command==='get_queue') cmd.limit = 80;
  return cmd;
}
export function isLocalWsUrl(value) {
  try { const u = new URL(value); return u.protocol==='ws:' && u.hostname==='127.0.0.1' && u.username==='' && u.password==='' && /^\d+$/.test(u.port) && Number(u.port)>0 && u.pathname==='/' && !u.search && !u.hash; } catch {return false;}
}
export function reduceSoloistState(current, event) {
  if (!event || typeof event.type!=='string') return current;
  const next={...current};
  switch(event.type){
    case 'auth_state': next.auth={...event}; if(event.logged_in)next.lastError=null; break;
    case 'playback_state': next.playback={...event}; break;
    case 'track_changed': next.playback={...next.playback,item:event.item}; break;
    case 'playback_changed': next.playback={...next.playback,status:event.status}; break;
    case 'volume_changed': next.playback={...next.playback,volume:event.volume}; break;
    case 'device_changed': next.playback={...next.playback,is_active:event.is_active}; next.auth={...next.auth,is_active:event.is_active,device_name:event.device_name}; break;
    case 'context_changed': next.playback={...next.playback,context:event.context}; break;
    case 'options_changed': next.playback={...next.playback,options:event.options}; break;
    case 'position_sync': next.playback={...next.playback,position:event.position}; break;
    case 'queue_changed': next.queue={upcoming:event.upcoming||[],previous:event.previous||[]}; break;
    case 'error': next.lastError=event.message||'Unknown Soloist error'; break;
  }
  return next;
}
export class Soloist {
  constructor(dataDir, onUpdate=()=>{}) {
    this.dataDir=dataDir;this.onUpdate=onUpdate;this.ws=null;this.child=null;this.timer=null;this.url='';
    this.state={connected:false,auth:null,playback:null,queue:{upcoming:[],previous:[]},lastError:null};
  }
  emit(e){this.state=reduceSoloistState(this.state,e);this.onUpdate(e,this.state);}
  snapshot(){return {...this.state,wsUrl:this.url,managed:!!this.child};}
  connect(url) {
    if(!isLocalWsUrl(url)) throw new Error('Only a local ws://127.0.0.1:PORT Soloist endpoint is allowed.');
    this.url=url;
    this.closeSocket(); this.openSocket();
  }
  closeSocket(){clearTimeout(this.timer);this.timer=null;if(this.ws){ const ws=this.ws; this.ws=null; ws.onclose=null;ws.onerror=null;ws.onmessage=null; ws.close(); }this.state.connected=false;}
  openSocket(){
    if (!this.url) return;
    let ws;
    try {ws = new WebSocket(this.url);} catch(e){ this.state.lastError=String(e.message);this.schedule(); return; }
    this.ws=ws;
    ws.onopen=()=>{this.state.connected=true;this.state.lastError=null;this.onUpdate({type:'connection',connected:true},this.state);this.command({command:'get_auth_state'});this.command({command:'get_state'});this.command({command:'get_queue'});};
    ws.onmessage=msg=>{try{this.emit(JSON.parse(msg.data));}catch{}};
    ws.onerror=()=>{this.state.lastError='Unable to connect to local Soloist endpoint';};
    ws.onclose=()=>{ if(this.ws!==ws)return;this.ws=null;this.state.connected=false;this.state.auth=null;this.onUpdate({type:'connection',connected:false},this.state);this.schedule(); };
  }
  schedule(){
    clearTimeout(this.timer);
    this.timer=setTimeout(async()=>{
      // Soloist chooses a fresh WebSocket port when it restarts; never keep
      // reconnecting forever to a stale port from the previous process.
      try {
        const raw=(await readFile(path.join(this.dataDir,'soloist-state','ws.port'),'utf8')).trim();
        if(/^\d{1,5}$/.test(raw)&&Number(raw)>0&&Number(raw)<=65535)
          this.url=`ws://127.0.0.1:${Number(raw)}/`;
      } catch {}
      this.openSocket();
    },3500);
    this.timer.unref?.();
  }
  command(data){const cmd=validateSoloistCommand(data);if(!this.ws||this.ws.readyState!==WebSocket.OPEN)throw new Error('Soloist is not connected. Start Soloist and pair it first.');this.ws.send(JSON.stringify(cmd));return {accepted:true,command:cmd.command};}
  async discover(){
    const p=path.join(this.dataDir,'soloist-state','ws.port');
    const port=(await readFile(p,'utf8')).trim();
    if (!/^\d{1,5}$/.test(port)||Number(port)>65535||Number(port)<1) throw new Error('Invalid Soloist endpoint discovery file.');
    this.connect(`ws://127.0.0.1:${port}/`);
  }
  async launch(binary, apiKey) {
    if (this.child) throw new Error('AURA already started a Soloist process.');
    const base=path.basename(binary||'').toLowerCase();
    if(!['soloist','soloist.exe'].includes(base)||typeof apiKey!=='string'||apiKey.length<10||apiKey.length>2048)throw new Error('Provide the official soloist executable path and a valid API key.');
    await access(binary);
    const data=path.join(this.dataDir,'soloist-state'),cache=path.join(this.dataDir,'soloist-cache');
    await mkdir(data,{recursive:true,mode:0o700}); await mkdir(cache,{recursive:true,mode:0o700});
    const child=spawn(binary,['--device-name','AURA Music','--api-key',apiKey,'--ws','127.0.0.1:0','--data-dir',data,'--cache-dir',cache],{shell:false,stdio:['ignore','pipe','pipe']});
    this.child=child;
    let output='';
    for(const stream of [child.stdout,child.stderr])stream.on('data',buf=>{output=(output+buf.toString().replaceAll(apiKey,'[hidden]')).slice(-1800);});
    child.once('error',err=>{this.state.lastError=err.message;this.child=null;this.onUpdate({type:'managed_exit',code:null},this.state);});
    child.once('exit',(code)=>{const expected=this.stopping;this.child=null;this.closeSocket();this.state.lastError=code===10?'Spotify Soloist build expired. Download a newer build.':`Soloist exited (${code}). ${output.slice(-200)}`;if(!expected)this.onUpdate({type:'managed_exit',code},this.state);});
    for(let i=0;i<30;i++){
      if (child.exitCode!==null) break;
      try {await this.discover();return {started:true,wsUrl:this.url};}catch{}
      await new Promise(r=>setTimeout(r,220));
    }
    if (child.exitCode!==null) throw new Error(`Soloist stopped before connecting. ${output.slice(-300)}`);
    throw new Error('Soloist started, but its WebSocket endpoint is not ready. Check Soloist logs and try again.');
  }
  stop(){this.stopping=true;this.closeSocket();if(this.child){this.child.kill();this.child=null;}}
}

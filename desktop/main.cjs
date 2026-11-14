'use strict';

const {app,BrowserWindow,shell,session,dialog,Tray,Menu,nativeImage} = require('electron');
const {spawn} = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
const {LOCAL_ORIGIN,isLocalAuraUrl,isTrustedSpotifyUrl,isSpotifyAuthorizationUrl,isAuraHealth} = require('./security.cjs');

const ROOT = path.resolve(__dirname,'..');
const URL = LOCAL_ORIGIN+'/';
let mainWindow=null;
let tray=null;
let managedServer=null;
let oauthLaunched=false;
let quitting=false;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fetchHealth(){
  return new Promise((resolve,reject)=>{
    const req=http.get(LOCAL_ORIGIN+'/api/health',{timeout:1800},response=>{
      let body='';
      response.setEncoding('utf8');
      response.on('data',part=>{if(body.length<8192)body+=part;});
      response.once('end',()=>{
        if(response.statusCode!==200)return reject(new Error('AURA backend returned '+response.statusCode));
        try{
          const data=JSON.parse(body);
          if(!isAuraHealth(data))throw new Error('Unexpected AURA backend health response');
          resolve(data);
        }catch(error){reject(error);}
      });
    });
    req.once('error',reject);
    req.once('timeout',()=>req.destroy(new Error('Local AURA backend timed out')));
  });
}

async function ensureServer(){
  try{await fetchHealth();return;}catch{}
  // The official Spotify Soloist executable and all secrets are installed
  // separately by the user. No proprietary playback binary is distributed.
  const nodeEnv={...process.env,ELECTRON_RUN_AS_NODE:'1'};
  // On Linux the local user service handles the separate synchronized bridge.
  // On Windows the Node backend can use the user-supplied Soloist binary.
  managedServer=spawn(process.execPath,[path.join(ROOT,'server.mjs')],{
    cwd:ROOT,env:nodeEnv,windowsHide:true,stdio:'ignore'
  });
  managedServer.once('error',()=>{managedServer=null;});
  for(let attempt=0;attempt<80;attempt++){
    if(managedServer?.exitCode!==null&&managedServer?.exitCode!==undefined)break;
    try{await fetchHealth();return;}catch{}
    await sleep(250);
  }
  throw new Error('AURA could not start its local music backend. Check the AURA setup and port 4373.');
}

function externalSpotifyUrl(url){
  if(!isTrustedSpotifyUrl(url))return;
  // Only an official Spotify domain may leave the local desktop window.
  if(isSpotifyAuthorizationUrl(url))oauthLaunched=true;
  void shell.openExternal(url).catch(error=>console.warn('[aura desktop] Could not open Spotify URL:',error.message));
}

async function commandFromTray(command){
  try{
    const boot=await (await fetch(LOCAL_ORIGIN+'/api/bootstrap',{signal:AbortSignal.timeout(4000)})).json();
    const result=await fetch(LOCAL_ORIGIN+'/api/soloist/command',{
      method:'POST',signal:AbortSignal.timeout(4000),
      headers:{'Content-Type':'application/json','X-Aura-Request':boot.csrf},
      body:JSON.stringify({command})
    });
    if(!result.ok)console.warn('[aura desktop] Tray playback command unavailable:',result.status);
  }catch(error){console.warn('[aura desktop] Tray playback unavailable:',error.message);}
}
async function toggleFromTray(){
  try{
    const response=await fetch(LOCAL_ORIGIN+'/api/soloist/state',{signal:AbortSignal.timeout(3500)});
    const state=await response.json();
    const status=state.playback?.status;
    await commandFromTray(status==='playing'||status==='buffering'?'pause':'play');
  }catch(error){console.warn('[aura desktop] Could not determine playback:',error.message);}
}
function showAura(){
  if(!mainWindow||mainWindow.isDestroyed())createWindow();
  else{
    if(mainWindow.isMinimized())mainWindow.restore();
    mainWindow.show();mainWindow.focus();
  }
}
function createTray(){
  try{
    const img=nativeImage.createFromPath(path.join(ROOT,'public','icon-192.png'))
      .resize({width:22,height:22});
    if(img.isEmpty())return;
    tray=new Tray(img);
    tray.setToolTip('AURA — The Listening Observatory');
    tray.setContextMenu(Menu.buildFromTemplate([
      {label:'Open AURA',click:showAura},
      {type:'separator'},
      {label:'Play / Pause',click:()=>void toggleFromTray()},
      {label:'Next track',click:()=>void commandFromTray('skip_next')},
      {type:'separator'},
      {label:'Quit AURA window',click:()=>app.quit()}
    ]));
    tray.on('double-click',showAura);
    console.log('[aura desktop] System tray initialized.');
  }catch(error){
    tray=null;
    console.warn('[aura desktop] System tray unavailable:',error.message);
  }
}
function createWindow(){
  mainWindow=new BrowserWindow({
    title:'AURA — The Listening Observatory',
    width:1450,height:940,minWidth:860,minHeight:600,
    autoHideMenuBar:true,
    show:false,
    backgroundColor:'#14121d',
    icon:path.join(ROOT,'public','icon-512.png'),
    webPreferences:{
      nodeIntegration:false,
      contextIsolation:true,
      sandbox:true,
      webSecurity:true,
      allowRunningInsecureContent:false,
      webviewTag:false,
      spellcheck:false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({url})=>{
    externalSpotifyUrl(url);
    return {action:'deny'};
  });
  mainWindow.webContents.on('will-navigate',(event,url)=>{
    if(isLocalAuraUrl(url))return;
    event.preventDefault();
    externalSpotifyUrl(url);
  });
  mainWindow.webContents.on('will-attach-webview',event=>event.preventDefault());
  mainWindow.on('focus',async()=>{
    if(!oauthLaunched||!mainWindow||mainWindow.isDestroyed())return;
    try{
      const health=await fetchHealth();
      if(health.spotifyAuthenticated){oauthLaunched=false;mainWindow.webContents.reload();}
    }catch{}
  });
  mainWindow.on('close',event=>{
    if(!quitting&&tray){
      event.preventDefault();mainWindow.hide();
    }
  });
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.on('closed',()=>{mainWindow=null;});
  void mainWindow.loadURL(URL).catch(async error=>{
    await dialog.showMessageBox({type:'error',title:'AURA could not load',message:error.message});
  });
}

if(!app.requestSingleInstanceLock()){
  app.quit();
}else{
  app.on('second-instance',showAura);
  app.whenReady().then(async()=>{
    session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    try{await ensureServer();createTray();createWindow();}
    catch(error){
      await dialog.showMessageBox({type:'error',title:'AURA could not start',message:error.message});
      app.quit();
    }
  }).catch(error=>{console.error('[aura desktop]',error.message);app.quit();});
  app.on('before-quit',()=>{
    if(quitting)return;quitting=true;
    if(managedServer?.pid)managedServer.kill('SIGTERM');
  });
  app.on('window-all-closed',()=>{if(!tray)app.quit();});
}

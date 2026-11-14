import { chamber, observatory, collection } from './experience.js';
import { discovery, queueSpace, archiveDetail } from './views-next.js';
import { madeForYou, yourSound, audioShelf, listeningTools } from './expansion.js';
import {mergeLibraryPage} from './library-paging.js';
const $=s=>document.querySelector(s);
const ico={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',disc:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/>',list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M4 12a8 8 0 0 1 .3-2l-2-1.5 2-3.4 2.3.9A8 8 0 0 1 10 4l.4-2h3.5l.4 2a8 8 0 0 1 3.4 2l2.3-.9 2 3.4-2 1.5a8 8 0 0 1 0 4l2 1.5-2 3.4-2.3-.9a8 8 0 0 1-3.4 2l-.4 2h-3.5l-.4-2a8 8 0 0 1-3.4-2l-2.3.9-2-3.4 2-1.5A8 8 0 0 1 4 12Z"/>',play:'<path d="m8 5 11 7-11 7z"/>',pause:'<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',next:'<path d="m4 5 11 7-11 7zM20 5v14"/>',prev:'<path d="M20 5 9 12l11 7zM4 5v14"/>',shuffle:'<path d="m18 4 3 3-3 3M21 7h-5c-5 0-5 10-10 10H3M18 20l3-3-3-3M21 17h-5c-2 0-3-2-4-4M3 7h3c2 0 3 2 4 4"/>',repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',volume:'<path d="M11 5 6 9H3v6h3l5 4zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L19 6"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',back:'<path d="M19 12H5m6 6-6-6 6-6"/>',sparkle:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>',music:'<path d="M9 18V5l12-2v13M9 5l12-2M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0ZM21 16a3 2 0 1 1-6 0 3 2 0 0 1 6 0Z"/>',headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 14h4v7H5a2 2 0 0 1-2-2zM17 14h4v5a2 2 0 0 1-2 2h-2z"/>',external:'<path d="M14 3h7v7M21 3l-9 9M21 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',device:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',shield:'<path d="m12 2 9 4v5c0 5-3 8-9 11-6-3-9-6-9-11V6zM9 12l2 2 4-4"/>'};
const icon=(n,extra='')=>`<svg class="i ${extra}" viewBox="0 0 24 24" aria-hidden="true">${ico[n]||ico.music}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const imgSafe=u=>{try{const v=new URL(u);return v.protocol==='https:'&&['i.scdn.co','mosaic.scdn.co','image-cdn-ak.spotifycdn.com'].includes(v.hostname)?v.href:'';}catch{return '';}};
const art=(obj)=>imgSafe(obj?.images?.[0]?.url || obj?.album?.images?.[0]?.url || obj?.decorations?.visual_identity?.cover?.find(x=>x.size==='large')?.url || obj?.decorations?.visual_identity?.cover?.[0]?.url || '');
const formatMs=ms=>{let s=Math.floor((Number(ms)||0)/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const first=v=>Array.isArray(v)?v:[];
const DEMO_COLLECTIONS=[{id:'preview1',name:'midnight transmissions',description:'A place for after-hours sound',images:[]},{id:'preview2',name:'rose-tinted static',description:'Dreamy, slow-moving sound',images:[]},{id:'preview3',name:'soft machinery',description:'Textured rhythms, quiet motion',images:[]},{id:'preview4',name:'glass cathedral',description:'Weightless electronic atmospheres',images:[]},{id:'preview5',name:'the last light',description:'A little warmth before the dark',images:[]}];
const DEMO_TRACKS=[{id:'demo1',name:'The Quiet Between',artists:[{name:'AURA preview'}],album:{name:'Midnight Transmissions'},duration_ms:193000},{id:'demo2',name:'Rosewater Signals',artists:[{name:'AURA preview'}],album:{name:'Rose-tinted Static'},duration_ms:227000},{id:'demo3',name:'A Room in the Sky',artists:[{name:'AURA preview'}],album:{name:'Glass Cathedral'},duration_ms:256000},{id:'demo4',name:'Blue Hour',artists:[{name:'AURA preview'}],album:{name:'The Last Light'},duration_ms:204000},{id:'demo5',name:'Soft Engine',artists:[{name:'AURA preview'}],album:{name:'Soft Machinery'},duration_ms:234000}];
const state={mixPins:[],mixCandidates:[],insights:{tracks:[],artists:[],loaded:false,loading:false},insightRange:'medium_term',
  audioShelf:{shows:[],episodes:[],audiobooks:[],kind:'shows',filter:'',sort:'saved',loading:false,loaded:{},totals:{},more:false},sleep:{active:false},
  cinemaMode:false,chamberQueueOpen:false,recent:[],soloistSetup:null,collectionFilter:'',collectionSort:'spotify',csrf:'',auth:null,soloist:null,profile:null,playlists:[],tracks:[],albums:[],dataPages:{},libraryVisible:{tracks:150,albums:100,playlists:100},view:'home',detail:null,detailFilter:'',detailVisible:120,search:{q:'',type:'track',offset:0,items:[],total:0},loading:false,notifications:[],saved:new Set(),networkErrors:[],booting:true};
function toast(message,error=false){const wrap=$('#toasts');const div=document.createElement('div');div.className='toast'+(error?' error':'');div.textContent=message;wrap.append(div);setTimeout(()=>div.remove(),4700);}
async function request(url,method='GET',body,signal){
  const res=await fetch(url,{method,headers:{...(method==='GET'?{}:{'Content-Type':'application/json','X-Aura-Request':state.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)}),...(signal?{signal}:{})});
  const j=await res.json().catch(()=>({}));if(!res.ok)throw new Error(j.error||`Request failed: ${res.status}`);return j ?? {ok:true};
}
async function act(fn){try{return await fn();}catch(e){toast(e.message,true);return null;}}
const isAuth=()=>!!state.auth?.loggedIn;
function cover(item,index=0,cls='') {const image=art(item);return `<div class="cover gradient${index%5} ${image?'':'pattern'} ${cls}">${image?`<img src="${esc(image)}" loading="lazy" alt="" />`:''}</div>`;}
function rowArt(item,index=0) {const image=art(item);return `<div class="row-art gradient${index%5}">${image?`<img src="${esc(image)}" loading="lazy" alt="" />`:icon('music')}</div>`;}
function titleFor(item){return item?.name||item?.decorations?.identity?.name||'Untitled';}
function artistFor(item){return first(item?.artists).map(a=>a.name).join(', ')||first(item?.decorations?.creators).map(c=>c.entity?.decorations?.identity?.name).join(', ')||'Unknown artist';}
function trackUri(item){return item?.uri|| (item?.id ? `spotify:track:${item.id}` : '');}
function itemUri(item,type){return item?.uri||(item?.id?`spotify:${type}:${item.id}`:'');}
function card(item,index=0,type='playlist'){
  const label=item?.description?.replace(/<[^>]+>/g,'')||item?.owner?.display_name||(type==='album'?artistFor(item):(type==='artist'?'Artist':type==='episode'?'Episode':type==='show'?'Podcast':'Playlist'));
  const target=type==='episode'?`data-play="${esc(itemUri(item,'episode'))}"`:type==='show'?`data-external="${esc(item.id||'')}"`:`data-open="${esc(type)}:${esc(item.id||'')}"`;
  return `<button class="cover-card" ${target} aria-label="${type==='episode'?'Play':type==='show'?'Open in Spotify':'Open'} ${esc(titleFor(item))}">${cover(item,index)}<div class="cover-title">${esc(titleFor(item))}</div><div class="cover-sub">${esc(label).slice(0,65)}</div></button>`;
}
function trackRow(item,index,{from='',removable=false,preview=false,reorder=false,total=0}={}){
  if(!item)return '';
  const uri=trackUri(item),valid=/^spotify:track:[A-Za-z0-9]{10,64}$/.test(uri),isSaved=state.saved.has(uri);
  const isPreview=preview||!valid;
  return `<div class="track-row"><button class="icon-btn track-num" data-play="${esc(uri)}" ${isPreview?'disabled':''} title="Play this track">${index+1}</button>${rowArt(item,index)}<div class="row-main"><div class="row-name">${esc(titleFor(item))}</div><div class="row-sub">${esc(artistFor(item))}</div></div><div class="row-album">${esc(item?.album?.name||'')}</div><div class="row-duration">${formatMs(item.duration_ms)}</div><div class="row-actions"><button class="icon-btn ${isSaved?'liked':''}" data-like="${esc(uri)}" ${isPreview?'disabled':''} title="${isSaved?'Remove from saved':'Save to library'}">${icon('heart','sm')}</button><button class="icon-btn" data-queue-track="${esc(uri)}" ${isPreview?'disabled':''} title="Add to queue">${icon('plus','sm')}</button>${removable?`<button class="icon-btn" data-remove-track="${esc(uri)}" data-from="${esc(from)}" title="Remove all matching copies from this playlist" aria-label="Remove all matching copies from this playlist">${icon('close','sm')}</button>`:`<button class="icon-btn" data-add-track="${esc(uri)}" ${isPreview?'disabled':''} title="Add to a playlist">${icon('list','sm')}</button>`}${reorder&&Number.isInteger(item.__auraPosition)?`<button class="icon-btn" data-playlist-move="${item.__auraPosition}" data-direction="-1" data-from="${esc(from)}" title="Move this track up" aria-label="Move ${esc(titleFor(item))} up" ${item.__auraPosition===0?'disabled':''}>${icon('back','sm')}</button><button class="icon-btn" data-playlist-move="${item.__auraPosition}" data-direction="1" data-from="${esc(from)}" title="Move this track down" aria-label="Move ${esc(titleFor(item))} down" ${item.__auraPosition>=total-1?'disabled':''}>${icon('arrow','sm')}</button>`:''}</div></div>`;
}
const empty=(t,subtitle='')=>`<div class="empty">${icon('disc','lg')}<strong>${esc(t)}</strong>${subtitle?`<span>${esc(subtitle)}</span>`:''}</div>`;
function loadMore(type,items,total){return items.length < total ? `<div class="pagination"><button class="btn" data-more="${esc(type)}">Load more ${icon('arrow','sm')}</button></div>` : ''}
function nav(view){
  if(view!=='chamber')state.chamberQueueOpen=false;
  state.view=view;state.detail=null;render();
  $('#main')?.scrollTo({top:0});
  if(view==='queue'&&state.soloist?.connected)control('get_queue');
  if(view==='mixes')void loadMixesUI();
  if(view==='sound')void loadInsights();
  if(view==='podcasts')void loadAudioCollection();
  if(view==='tools')void loadSleepTimer();
}
function renderSidebar(){
  const items=[['home','home','Observatory'],['chamber','disc','Listening room'],['search','search','Search'],['mixes','sparkle','Made for you'],
    ['sound','music','Your sound'],['liked','heart','Liked songs'],['albums','disc','Albums'],
    ['playlists','grid','Playlists'],['podcasts','headphones','Podcasts & books'],
    ['queue','list','Queue'],['tools','clock','Listening tools'],['settings','settings','Settings']];
  const navItems=items.map(([v,i,label])=>`<button class="nav-item ${state.view===v?'active':''}" data-nav="${v}">${icon(i)}<span>${label}</span></button>`);
  const acct=isAuth()?'Spotify linked':'Spotify not linked';const eng=state.soloist?.connected?(state.soloist.auth?.logged_in?'Engine paired':'Engine waiting for pairing'):'Soloist disconnected';
  $('#sidebar').innerHTML=`<div class="brand"><div class="brand-mark">a</div><div><div class="brand-name">aura<span style="color:#d7afe8">.</span></div><div class="brand-sub">personal music space</div></div></div><div class="nav-label">Your space</div><nav class="nav-stack">${navItems.slice(0,4).join('')}</nav><div class="nav-divider"></div><div class="nav-label">Collection</div><nav class="nav-stack">${navItems.slice(4).join('')}</nav><div class="spacer"></div><div class="sidebar-footer"><div class="system-info"><span class="dot ${isAuth()?'online':''}"></span><span>${acct}</span></div><div class="system-info" style="margin-top:9px"><span class="dot ${state.soloist?.connected?'online':''}"></span><span>${eng}</span></div><div class="footer-claim">AURA // local edition 0.8</div></div>`;
}
function renderTop(){const v=state.view;const label=({home:'Observatory',chamber:'Listening Chamber',search:'Search',mixes:'Made for You',
    sound:'Your Sound',podcasts:'Spoken Worlds',tools:'Listening Tools',liked:'Your library',albums:'Your library',playlists:'Your library',queue:'Playback',settings:'Connections',detail:'Collection'})[v]||'Discover';
  const avatar=imgSafe(state.profile?.images?.[0]?.url);
  $('#topbar').innerHTML=`<div class="bread">AURA <span style="color:#626071">/</span> <strong>${label}</strong></div><div class="top-actions"><form class="search-box" id="search-form" role="search">${icon('search','sm')}<input id="top-search" autocomplete="off" placeholder="Search artists, songs, albums..." value="${state.view==='search'?esc(state.search.q):''}" aria-label="Search Spotify"/><span class="kbd">Ctrl K</span></form><button class="aura-command-trigger" type="button" data-open-palette title="Quick navigation (Ctrl P)" aria-label="Open quick navigation">✦ <span>Jump</span><span class="kbd">Ctrl P</span></button><button class="avatar" data-nav="settings" aria-label="Account settings">${avatar?`<img src="${esc(avatar)}" alt=""/>`:esc((state.profile?.display_name||'A')[0]).toUpperCase()}</button></div>`;
}
function hero(){return `<section class="hero"><div class="hero-content"><div class="eyebrow">✦ &nbsp; A different kind of listening</div><h1 class="hero-title">Your sound.<br/><em>Your universe.</em></h1><p class="hero-desc">All the music you love, in a space that feels entirely your own. No noise. No clutter. Just you and the sound.</p><div class="hero-buttons"><button class="btn primary" data-nav="${isAuth()?'search':'settings'}">${icon(isAuth()?'search':'arrow','sm')}${isAuth()?'Explore music':'Connect your Spotify'}</button><button class="btn ghost" data-nav="${isAuth()?'playlists':'settings'}">${icon('grid','sm')}${isAuth()?'Your collection':'Setup guide'}</button></div></div><div class="hero-art"><div class="art-glow"></div><div class="orbit"></div><div class="orbit two"></div><div class="vinyl"></div><span class="floating-note">AURA / 001</span></div></section>`;}
function renderHome(){
  return observatory({state,icon,esc,art,card,trackRow,titleFor,artistFor,
    demoCollections:DEMO_COLLECTIONS,demoTracks:DEMO_TRACKS});
}
function renderChamber(){
  return chamber({state,icon,esc,art,titleFor,artistFor,formatMs,position,trackUri});
}
function renderCollection(kind){
  return collection({state,icon,esc,trackRow,card,loadMore,empty,titleFor,artistFor},kind);
}
function renderSearch(){
  return discovery({state,esc,icon,art,card,trackRow,empty,loadMore,titleFor,artistFor});
}
function renderDetail(){
  return archiveDetail({state,esc,icon,art,titleFor,artistFor,trackRow,loadMore,empty,itemUri});
}
function renderQueue(){
  return queueSpace({state,esc,icon,art,titleFor,artistFor,formatMs,trackUri});
}
function renderSettings(){const auth=state.auth||{},s=state.soloist||{},logged=s.auth?.logged_in;
  return `<div class="page-head"><div><div class="eyebrow">Private by design</div><h1 class="page-h1">Connections & setup.</h1><p class="page-lede">Spotify stays Spotify. Your interface and control live locally on this computer.</p></div><span class="pill ${isAuth()?'connected':'demo'}">${icon(isAuth()?'check':'shield','sm')}${isAuth()?'Account connected':'Setup needed'}</span></div><div class="setup-cards"><div class="setup-card"><div class="step">01 / Spotify account</div><h3>Connect your real music library</h3><p>Create an app in the Spotify Developer Dashboard. Register the exact redirect URI below, paste your Client ID, then authorize with your usual Spotify account. No client secret or Spotify password is needed.</p><div class="field"><label>Redirect URI — add this to Spotify Dashboard</label><div class="mono">${esc(auth.redirectUri||'http://127.0.0.1:4373/auth/callback')}</div></div><form id="client-form"><div class="field"><label for="client-id">Spotify Client ID</label><input id="client-id" value="${esc(auth.clientId||'')}" placeholder="32-character client ID" autocomplete="off" spellcheck="false" required/></div><div class="buttons"><button class="btn" type="submit">${icon('check','sm')} Save Client ID</button><button class="btn primary" type="button" data-action="login-spotify" ${!auth.configured?'disabled':''}>${icon('arrow','sm')}${isAuth()?'Reconnect Spotify':'Sign in with Spotify'}</button></div></form><div class="buttons"><a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" class="btn ghost small">Spotify Developer Dashboard ${icon('external','sm')}</a>${isAuth()?`<button class="btn danger small" data-action="logout-spotify">Disconnect account</button>`:''}</div><p class="helper"><strong>Status:</strong> ${isAuth()?`Connected as ${esc(state.profile?.display_name||'your Spotify account')}.`:'Not authorized yet.'} Tokens are saved only in a restricted local file on this computer.</p></div><div class="setup-card"><div class="step">02 / Spotify Soloist</div><h3>Activate native playback</h3><p>Download the official Soloist executable for your OS and generate your personal Soloist API key. AURA starts the official binary and connects to its loopback WebSocket. On this personal computer, AURA can remember your key in a private owner-only file. You will not need to paste it every launch.</p><form id="soloist-form"><div class="field"><label for="soloist-binary">Full path to Soloist executable</label><input id="soloist-binary" value="${esc(state.soloistSetup?.binary||'')}" placeholder="/home/you/soloist or C:\\Tools\\soloist.exe" autocomplete="off" spellcheck="false" required/></div><div class="field"><label for="soloist-key">Soloist API key (used for this launch only)</label><input id="soloist-key" type="password" autocomplete="off" placeholder="Optional if your key is already saved"/></div><div class="buttons"><button class="btn primary" type="submit">${icon('play','sm')} Start Soloist</button><button class="btn ghost" type="button" data-action="discover-soloist">Discover running engine</button></div></form><div class="key-status"><span class="dot ${state.soloistSetup?.savedKey?'online':''}"></span><span>${state.soloistSetup?.savedKey?'Key saved on this device. Leave the field blank to reuse it.':'No saved key yet. Enter it once and AURA will remember it.'}</span><button class="btn ghost small" data-action="forget-soloist-key" ${state.soloistSetup?.savedKey?'':'disabled'}>Forget saved key</button></div><div class="field"><label for="soloist-endpoint">Or connect a manually running local Soloist</label><input id="soloist-endpoint" placeholder="ws://127.0.0.1:9090/" value="${esc(s.wsUrl||'')}" /></div><div class="buttons"><button class="btn" data-action="connect-soloist">Connect existing engine</button><a class="btn ghost small" href="https://developer.spotify.com/documentation/soloist" target="_blank" rel="noopener noreferrer">Official Soloist setup ${icon('external','sm')}</a></div><p class="helper"><strong>Engine:</strong> ${s.connected?(logged?'Connected and paired.':'Connected; open Spotify on your phone/desktop, choose “AURA Music” under Connect devices to pair.'):'Not connected.'}${s.lastError?`<br/>${esc(s.lastError)}`:''}</p></div><div class="setup-card"><div class="step">03 / Device control</div><h3>Play where you want</h3><p>Use AURA Music as your local playback device, or transfer playback between other Spotify Connect devices where Spotify's API permits it.</p><div class="buttons"><button class="btn primary" data-control="activate">${icon('headphones','sm')} Use AURA Music</button><button class="btn" data-action="devices">${icon('device','sm')} Spotify Connect devices</button></div><p class="helper">Soloist requires initial pairing using an official Spotify app. After pairing, the standard Spotify window does not need to remain open.</p></div><div class="setup-card"><div class="step">04 / Your experience</div><h3>Install AURA as an app</h3><p>In Chrome, Chromium or Edge, open the browser menu and select <strong>Install AURA</strong> / <strong>Install app</strong>. It opens in its own standalone window on Windows and Linux.</p><div class="buttons"><button class="btn" data-action="install">${icon('plus','sm')} Install app</button><button class="btn" data-action="copy-redirect">Copy redirect URL</button></div><p class="helper">AURA is a local PWA, not a packaged native executable yet. Node.js must be running on the computer. No tracking, third-party fonts or analytics are added by this project.</p></div></div><div class="info-banner">${icon('shield','lg')}<span><strong>Spotify policy note:</strong> Developer mode cannot reproduce every Spotify screen or proprietary feature. Unavailable third-party playlist item data, algorithmic Home, AI DJ, exclusive recommendations and offline Spotify downloads are not included. This is a personal integration prototype, not an authorized Spotify replacement.</span></div>`;
}
function render(){renderSidebar();renderTop();let html='';switch(state.view){case'home':html=renderHome();break;case'chamber':html=renderChamber();break;case'search':html=renderSearch();break;case'liked':case'albums':case'playlists':html=renderCollection(state.view);break;case'queue':html=renderQueue();break;
  case'mixes':html=madeForYou({state,esc,icon,art});break;
  case'sound':html=yourSound({state,esc,icon,card,trackRow});break;
  case'podcasts':html=audioShelf({state,esc,icon,art});break;
  case'tools':html=listeningTools({state,esc,icon});break;
  case'detail':html=renderDetail();break;case'settings':html=renderSettings();break;default:html=renderHome()};$('#main').innerHTML=html;renderPlayer();}
function position(){const p=state.soloist?.playback?.position;if(!p)return 0;const val=(p.position_ms||0)+(Math.max(0,Date.now()-(p.timestamp_ms||Date.now()))*(p.speed||0));return Math.max(0,Math.floor(val));}
function renderPlayer(){const p=state.soloist?.playback||{},item=p.item,real=!!item?.uri,coverImage=art(item),name=titleFor(item),artist=artistFor(item),playing=p.status==='playing'||p.status==='buffering',duration=item?.decorations?.playback?.duration_ms||item?.duration_ms||0;
  const repeat=p.options?.repeat||'off',shuf=!!p.options?.shuffle;
  $('#player').innerHTML=`<div class="playing-now"><div class="playing-cover">${coverImage?`<img src="${esc(coverImage)}" alt="" />`:icon('music','lg')}</div><div style="min-width:0"><div class="playing-title">${real?esc(name):'Nothing playing yet'}</div><div class="playing-artist">${real?esc(artist):'Your sound lives here'}</div></div></div><div class="center-player"><div class="player-actions"><button class="icon-btn ${shuf?'liked':''}" title="Shuffle" data-control="set_shuffle">${icon('shuffle')}</button><button class="icon-btn" title="Previous" data-control="skip_prev">${icon('prev')}</button><button class="play-main" title="${playing?'Pause':'Play'}" data-control="${playing?'pause':'play'}">${icon(playing?'pause':'play')}</button><button class="icon-btn" title="Next" data-control="skip_next">${icon('next')}</button><button class="icon-btn ${repeat!=='off'?'liked':''}" title="Repeat: ${repeat}" aria-label="Repeat mode: ${repeat}. Cycle repeat" aria-pressed="${repeat!=='off'}" data-control="repeat_cycle">${icon('repeat')}${repeat==='track'?'<span class="repeat-one-mark" aria-hidden="true">1</span>':''}</button></div><div class="player-range"><span id="position-label">${formatMs(position())}</span><input class="range" type="range" id="seek-range" min="0" max="${duration||1}" value="${Math.min(duration||1,position())}" aria-label="Seek playback"/><span>${formatMs(duration)}</span></div></div><div class="right-player"><button class="icon-btn" data-nav="chamber" title="Listening Chamber">${icon('disc')}</button><button class="icon-btn" data-nav="queue" title="Queue">${icon('list')}</button><button class="icon-btn" data-action="devices" title="Devices">${icon('device')}</button>${icon('volume')}<input class="range" type="range" id="volume-range" min="0" max="100" value="${p.volume??50}" aria-label="Volume"/><span class="tiny-label">${p.volume??'—'}%</span></div>`;
  syncMediaSession();
}
let mediaHandlersBound=false;
let lastMediaUri='';
function syncMediaSession(){
  if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
  const media=navigator.mediaSession;
  const playback=state.soloist?.playback||{},item=playback.item;
  if(!item?.uri){
    lastMediaUri='';
    media.metadata=null;
    media.playbackState='none';
    return;
  }
  if(lastMediaUri!==item.uri){
    const cover=art(item);
    media.metadata=new MediaMetadata({
      title:titleFor(item),
      artist:artistFor(item),
      album:item.album?.name||'',
      artwork:cover?[{src:cover,sizes:'512x512'}]:[]
    });
    lastMediaUri=item.uri;
  }
  media.playbackState=playback.status==='playing'||playback.status==='buffering'?'playing':'paused';
  const ms=item?.decorations?.playback?.duration_ms||item.duration_ms||0;
  if(ms>0 && typeof media.setPositionState==='function'){
    try{media.setPositionState({
      duration:ms/1000,
      playbackRate:1,
      position:Math.min(ms,Math.max(0,position()))/1000
    });}catch{}
  }
  if(mediaHandlersBound)return;
  mediaHandlersBound=true;
  const actions={
    play:()=>control('play'),
    pause:()=>control('pause'),
    stop:()=>control('pause'),
    previoustrack:()=>control('skip_prev'),
    nexttrack:()=>control('skip_next'),
    seekto:e=>control('seek',{position_ms:Math.max(0,Math.floor((e.seekTime||0)*1000))}),
    seekbackward:e=>control('seek',{position_ms:Math.max(0,position()-(e.seekOffset||10)*1000)}),
    seekforward:e=>control('seek',{position_ms:position()+(e.seekOffset||10)*1000})
  };
  for(const [name,handler] of Object.entries(actions)){
    try{media.setActionHandler(name,handler);}catch{}
  }
}
function tickPlayer(){
  const now=position();
  for(const selector of ['#seek-range','#chamber-seek']){
    const slider=$(selector);
    if(!slider||document.activeElement===slider)continue;
    slider.value=Math.min(Number(slider.max||0),now);
  }
  for(const selector of ['#position-label','#chamber-position']){
    const label=$(selector);if(label)label.textContent=formatMs(now);
  }
}
async function loadProfile(){state.profile=await request('/api/me');}
const pageTypes={playlists:'/api/spotify/playlists',tracks:'/api/spotify/tracks',albums:'/api/spotify/albums'};
const libraryInFlight={};
const libraryBulkCancel={};
const libraryBulkRunning={};
const libraryPagePaths={playlists:'/api/spotify/playlists',tracks:'/api/spotify/tracks',albums:'/api/spotify/albums'};
async function loadList(type,more=false,{quiet=false}={}){
  if(!libraryPagePaths[type])throw new Error('Unknown collection');
  if(libraryInFlight[type])return false;
  const previous=state.dataPages[type]||null;
  if(more && previous?.hasMore===false)return false;
  const offset=more?(previous?.nextOffset||0):0;
  libraryInFlight[type]=true;
  state.dataPages[type]={...previous,loading:true,error:''};
  if(!quiet && state.view!=='chamber')render();
  try {
    const payload=await request(libraryPagePaths[type]+'?limit=50&offset='+offset);
    const parsed=mergeLibraryPage(type,{items:state[type]},payload,{replace:!more,offset});
    state[type]=parsed.items;
    state.dataPages[type]={...parsed,loading:false,error:'',fullSync:!!libraryBulkRunning[type]};
    if(type==='tracks')state.tracks.forEach(track=>{
      const uri=trackUri(track);if(/^spotify:track:/.test(uri))state.saved.add(uri);
    });
    return true;
  }catch(error){
    state.dataPages[type]={...previous,loading:false,error:error.message,fullSync:!!libraryBulkRunning[type]};
    throw error;
  }finally{
    libraryInFlight[type]=false;
    if(!quiet && state.view!=='chamber')render();
  }
}
async function loadWholeLibrary(type){
  if(!libraryPagePaths[type]||libraryBulkRunning[type]||!isAuth())return;
  libraryBulkCancel[type]=false;
  libraryBulkRunning[type]=true;
  let fetched=0;
  try{
    while(state.dataPages[type]?.hasMore && !libraryBulkCancel[type] && fetched<100){
      const success=await loadList(type,true,{quiet:true});
      if(!success)break;
      fetched++;
      if(fetched%3===0&&state.view!=='chamber')render();
      // Yield to browsing and avoid overwhelming Spotify's personal API rate limit.
      await new Promise(resolve=>setTimeout(resolve,140));
    }
    if(fetched>=100&&state.dataPages[type]?.hasMore)toast('Loaded 5,000 more entries. Resume to continue.');
  }catch(error){
    toast('Library sync paused: '+error.message,true);
  }finally{
    libraryBulkRunning[type]=false;
    state.dataPages[type]={...state.dataPages[type],loading:false,fullSync:false};
    if(state.view!=='chamber')render();
  }
}
async function loadRecent(){
  try{
    const data=await request('/api/spotify/recent');
    const seen=new Set();
    state.recent=first(data.items).map(v=>v.track).filter(track=>{
      const uri=track?.uri;
      if(!uri || seen.has(uri))return false;
      seen.add(uri);return true;
    });
    if(state.view==='home')render();
  }catch(error){console.info('[aura] Recently played unavailable:',error.message);}
}
async function loadMixesUI(){
  try{
    const [saved,firstPage]=await Promise.all([
      request('/api/mixes'),
      isAuth()?request('/api/spotify/playlists?limit=50&offset=0'):Promise.resolve({items:[],total:0})
    ]);
    state.mixPins=first(saved.items);
    const all=[...first(firstPage.items)];
    if(firstPage.total>all.length){
      const next=await request('/api/spotify/playlists?limit=50&offset='+all.length);
      all.push(...first(next.items));
    }
    state.mixCandidates=all.filter(p=>p.id&&/\b(mix|radio|weekly|radar|daylist)\b|mix/i.test(p.name||''))
      .filter(p=>!state.mixPins.some(x=>x.uri===p.uri));
    if(state.view==='mixes')render();
  }catch(error){toast('Some personalized playlists could not load: '+error.message,true);}
}
async function loadInsights(force=false){
  if(!isAuth()||state.insights.loading||(!force&&state.insights.loaded))return;
  state.insights.loading=true;state.insights.error='';render();
  const range=state.insightRange;
  try{
    const [tracks,artists]=await Promise.all([
      request('/api/spotify/top?type=tracks&range='+range),
      request('/api/spotify/top?type=artists&range='+range)
    ]);
    if(range!==state.insightRange){state.insights.loading=false;void loadInsights(true);return;}
    state.insights={tracks:first(tracks.items),artists:first(artists.items),loading:false,loaded:true,error:''};
  }catch(error){state.insights={...state.insights,loading:false,loaded:false,error:error.message};}
  if(state.view==='sound')render();
}
async function loadAudioCollection(more=false){
  if(!isAuth()||state.audioShelf.loading)return;
  const k=state.audioShelf.kind;
  if(!more&&state.audioShelf.loaded[k])return;
  const offset=more?state.audioShelf[k].length:0;
  state.audioShelf.loading=true;state.audioShelf.error='';render();
  try{
    const d=await request('/api/spotify/collection?kind='+k+'&limit=30&offset='+offset);
    if(k!==state.audioShelf.kind){state.audioShelf.loading=false;void loadAudioCollection();return;}
    const values=first(d.items);
    state.audioShelf[k]=more?[...state.audioShelf[k],...values]:values;
    state.audioShelf.loaded[k]=true;
    state.audioShelf.totals[k]=d.total??state.audioShelf[k].length;
    state.audioShelf.more=!!d.next||state.audioShelf[k].length<state.audioShelf.totals[k];
  }catch(error){state.audioShelf.error=error.message;state.audioShelf.more=false;}
  if(k!==state.audioShelf.kind){state.audioShelf.loading=false;void loadAudioCollection();return;}
  state.audioShelf.loading=false;
  if(state.view==='podcasts')render();
}
async function loadSleepTimer(){
  try{state.sleep=await request('/api/sleep');if(state.view==='tools')render();}
  catch(error){console.info('[aura] Sleep timer unavailable:',error.message);}
}
async function initLibrary(){if(!isAuth())return;const results=await Promise.allSettled([loadProfile(),loadList('playlists'),loadList('tracks'),loadList('albums'),loadRecent()]);for(const r of results)if(r.status==='rejected')state.networkErrors.push(r.reason.message);render();if(state.networkErrors.length)toast(`Some Spotify data could not load: ${state.networkErrors[0]}`,true);}
let searchSerial=0;
let searchAbort=null;
const searchResultKeys={track:'tracks',album:'albums',artist:'artists',
  playlist:'playlists',episode:'episodes',show:'shows'};
async function runSearch(more=false){
  const search=state.search,q=search.q.trim(),type=search.type;
  if(!q||!searchResultKeys[type]||(more&&state.loading))return;
  const offset=more?(search.offset||search.items.length):0;
  const seq=++searchSerial;
  searchAbort?.abort();
  const controller=new AbortController();
  searchAbort=controller;
  state.loading=true;render();
  try{
    const url='/api/spotify/search?q='+encodeURIComponent(q)+'&type='+type+'&offset='+offset;
    const data=await request(url,'GET',undefined,controller.signal);
    // A response from an older query or category must never overwrite a
    // newer result set. Spotify requests may resolve out of order.
    if(seq!==searchSerial||search.q.trim()!==q||search.type!==type)return;
    const result=data[searchResultKeys[type]]||{},items=first(result.items);
    search.items=more?[...search.items,...items]:items;
    search.total=Number.isInteger(result.total)?result.total:search.items.length;
    search.offset=offset+items.length;
  }catch(error){
    if(seq===searchSerial&&error.name!=='AbortError')toast(error.message,true);
  }finally{
    if(seq===searchSerial){
      searchAbort=null;state.loading=false;render();
    }
  }
}
async function openItem(type,id,more=false){
  if(!isAuth()||id.startsWith('preview')){toast('Connect Spotify to open a real music collection.');return;}
  if(!more){state.view='detail';state.detail=null;state.detailFilter='';state.detailVisible=120;render();}
  const apiPath=type==='playlist'?`/api/spotify/playlist/${encodeURIComponent(id)}`
    :type==='album'?`/api/spotify/album/${encodeURIComponent(id)}`
    :`/api/spotify/artist/${encodeURIComponent(id)}`;
  const previous=more?state.detail:null;
  const offset=previous?.sourceOffset??previous?.items?.length??0;
  try{
    // Fetch metadata and item list in parallel. The item endpoint can be slower
    // than Spotify's metadata response; an API denial should not hide the header.
    const itemPromise=previous?Promise.resolve(previous.item):request(apiPath);
    const itemsPromise=type==='artist'?Promise.resolve({items:[],total:0}):
      request(`${apiPath}${type==='playlist'?'/items':'/tracks'}?offset=${offset}&limit=30`)
      .catch(error=>({error}));
    const [item,result]=await Promise.all([itemPromise,itemsPromise]);
    let items=previous?[...previous.items]:[],total=previous?.total||0,error='';
    if(result?.error){
      const message=result.error.message;
      error=type==='playlist'?'Spotify restricts access to playlist items you do not own or collaborate on. '+message:message;
    }else{
      const records=first(result.items).map((v,i)=>{
        const track=v?.item||v?.track||v;
        if(!track||typeof track!=='object')return null;
        return type==='album'?{...track,__auraPosition:offset+i,album:{name:item.name,images:item.images}}:
          type==='playlist'?{...track,__auraPosition:offset+i}:track;
      }).filter(v=>v?.name||v?.uri);
      items.push(...records);
      total=result.total??items.length;
    }
    state.detail={type,item,items,total,offset,sourceOffset:offset+first(result.items).length,error};render();
  }catch(error){toast(error.message,true);state.view='home';render();}
}
async function control(command,extras={}){
  if(!state.soloist?.connected){toast('Spotify Soloist is offline. Connect it in Settings first.',true);return;}
  const p=state.soloist?.playback||{};
  if(command==='set_shuffle')extras={enabled:!p.options?.shuffle};
  if(command==='repeat_cycle'){
    const modes=['off','context','track'],next=modes[(modes.indexOf(p.options?.repeat||'off')+1)%3];
    // Soloist repeat modes are mutually exclusive: one command per click.
    const repeatCommand=next==='context'?'set_repeat_context':'set_repeat_track';
    return act(()=>request('/api/soloist/command','POST',{command:repeatCommand,enabled:next!=='off'}));
  }
  return act(()=>request('/api/soloist/command','POST',{command,...extras}));
}
async function like(uri){if(!uri||!isAuth())return;const saved=state.saved.has(uri);const r=await act(()=>request('/api/spotify/library',saved?'DELETE':'PUT',{uri}));
  if(r===null)return;if(saved)state.saved.delete(uri);else state.saved.add(uri);render();toast(saved?'Removed from Spotify library':'Saved to Spotify library');
}
function modal(title,content){const m=$('#modal');m.hidden=false;m.innerHTML=`<div class="modal-box" role="dialog" aria-modal="true"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-action="close-modal">${icon('close')}</button></div>${content}</div>`;}
function closeModal(){$('#modal').hidden=true;$('#modal').innerHTML='';}
function addTrackModal(uri){const editable=state.playlists.filter(p=>p.id&&(p.owner?.id===state.profile?.id||p.collaborative));if(!editable.length){toast('Create a playlist you own to add songs.');return;}modal('Add to playlist',`<p class="helper">Choose a playlist you own or collaborate on.</p><div class="modal-list">${editable.map(p=>`<button class="modal-option" data-add-to="${esc(p.id)}" data-uri="${esc(uri)}">${icon('grid','sm')} ${esc(p.name)}</button>`).join('')}</div>`);}
async function devicesModal(){if(!isAuth()){toast('Connect Spotify first.');return;}const r=await act(()=>request('/api/spotify/devices'));if(!r)return;modal('Spotify Connect devices',`<p class="helper">Select an available Spotify Connect device. Soloist can be activated separately.</p><div class="modal-list">${first(r.devices).map(d=>`<button class="modal-option" data-device="${esc(d.id)}">${icon('device')} ${esc(d.name)} ${d.is_active?'<span class="pill connected">Active</span>':''}</button>`).join('')||'<p>No devices available. Pair Soloist first.</p>'}</div>`);}
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
async function onClick(e){const el=e.target.closest('[data-nav],[data-control],[data-action],[data-play],[data-queue-track],[data-like],[data-open],[data-more],[data-search-type],[data-add-track],[data-add-to],[data-device],[data-save-object],[data-artist-search],[data-remove-track],[data-external],[data-mix-play],[data-mix-open],[data-mix-remove],[data-mix-move],[data-mix-save],[data-insight-range],[data-audio-kind],[data-audio-more],[data-sleep-minutes],[data-audio-open],[data-library-all],[data-library-stop],[data-library-visible],[data-playlist-move],[data-detail-visible]');if(!el)return;
  if(el.dataset.playlistMove!==undefined){
    const d=state.detail;
    const position=Number(el.dataset.playlistMove),direction=Number(el.dataset.direction);
    if(!d||d.type!=='playlist'||d.item?.id!==el.dataset.from
      ||!Number.isInteger(position)||![-1,1].includes(direction)
      ||!d.item?.snapshot_id||position<0||position>=d.total){
      toast('Playlist ordering is unavailable for this selection.',true);return;
    }
    const next=position+direction;
    if(next<0||next>=d.total)return;
    const track=d.items.find(x=>x.__auraPosition===position);
    if(!track)return;
    if(!confirm('Move "'+titleFor(track)+'" '+(direction<0?'up':'down')+' one position in your Spotify playlist?'))return;
    const snapshot=d.item.snapshot_id,loadedPages=Math.min(20,Math.ceil((d.sourceOffset||30)/30));
    const response=await act(()=>request('/api/spotify/playlist/'+encodeURIComponent(d.item.id)+'/items','PUT',{
      range_start:position,insert_before:direction<0?position-1:position+2,
      range_length:1,snapshot_id:snapshot,total:d.total
    }));
    if(!response)return;
    toast('Playlist order updated on Spotify.');
    await openItem('playlist',d.item.id);
    for(let page=1;page<loadedPages;page++)await openItem('playlist',d.item.id,true);
    return;
  }
  if(el.dataset.mixPlay){const r=await control('play',{uri:el.dataset.mixPlay});if(r)toast('Spotify mix playback requested');return;}
  if(el.dataset.mixOpen){
    if(/^[A-Za-z0-9]{10,64}$/.test(el.dataset.mixOpen))window.open('https://open.spotify.com/playlist/'+el.dataset.mixOpen,'_blank','noopener,noreferrer');
    return;
  }
  if(el.dataset.audioOpen){
    const [type,id]=el.dataset.audioOpen.split(':');
    if(['track','show','episode','audiobook'].includes(type)&&/^[A-Za-z0-9]{10,64}$/.test(id))
      window.open('https://open.spotify.com/'+type+'/'+id,'_blank','noopener,noreferrer');
    return;
  }
  if(el.dataset.mixSave){
    const match=state.mixCandidates.find(p=>p.id===el.dataset.mixSave);
    if(match){
      const r=await act(()=>request('/api/mixes','POST',{uri:match.uri||('spotify:playlist:'+match.id),name:match.name}));
      if(r){state.mixPins=first(r.items);render();toast('Saved Spotify mix pinned to AURA');}
    }return;
  }
  if(el.dataset.mixRemove){
    if(!confirm('Unpin this mix from AURA? The Spotify playlist itself will not be changed.'))return;
    const r=await act(()=>request('/api/mixes','DELETE',{uri:el.dataset.mixRemove}));
    if(r){state.mixPins=first(r.items);render();toast('Mix unpinned locally');}
    return;
  }
  if(el.dataset.mixMove){
    const r=await act(()=>request('/api/mixes/move','POST',{uri:el.dataset.mixMove,direction:Number(el.dataset.direction)}));
    if(r){state.mixPins=first(r.items);render();}
    return;
  }
  if(el.dataset.insightRange){
    state.insightRange=el.dataset.insightRange;state.insights.loaded=false;void loadInsights(true);return;
  }
  if(el.dataset.audioKind){
    state.audioShelf.kind=el.dataset.audioKind;state.audioShelf.filter='';state.audioShelf.sort='saved';state.audioShelf.error='';
    render();void loadAudioCollection();return;
  }
  if(el.hasAttribute('data-audio-more')){void loadAudioCollection(true);return;}
  if(el.dataset.sleepMinutes){
    const r=await act(()=>request('/api/sleep','POST',{minutes:Number(el.dataset.sleepMinutes)}));
    if(r){state.sleep=r;render();toast('Sleep timer armed for '+el.dataset.sleepMinutes+' minutes');}
    return;
  }
  if(el.dataset.nav){nav(el.dataset.nav);return;}
  if(el.dataset.control){await control(el.dataset.control);return;}
  if(el.dataset.play){if(!el.dataset.play)return;await control('play',{uri:el.dataset.play});return;}
  if(el.dataset.queueTrack){const q=await control('add_to_queue',{uri:el.dataset.queueTrack});if(q)toast('Queue command sent to Soloist');return;}
  if(el.dataset.like){await like(el.dataset.like);return;}
  if(el.dataset.external){window.open(`https://open.spotify.com/show/${encodeURIComponent(el.dataset.external)}`,'_blank','noopener,noreferrer');return;}
  if(el.dataset.open){const [type,id]=el.dataset.open.split(':');await openItem(type,id);return;}
  if(el.dataset.libraryStop){libraryBulkCancel[el.dataset.libraryStop]=true;toast('Stopping library sync after current page.');return;}
  if(el.dataset.libraryAll){void loadWholeLibrary(el.dataset.libraryAll);return;}
  if(el.dataset.detailVisible!==undefined){
    state.detailVisible=Math.min(10000,(state.detailVisible||120)+120);render();return;
  }
  if(el.dataset.libraryVisible){
    const type=el.dataset.libraryVisible;
    if(['tracks','albums','playlists'].includes(type)){
      state.libraryVisible[type]=(state.libraryVisible[type]||100)+150;render();
    }
    return;
  }
  if(el.dataset.more){const type=el.dataset.more;if(type==='search')await runSearch(true);else if(type==='detail')await openItem(state.detail.type,state.detail.item.id,true);else await act(()=>loadList(type,true));return;}
  if(el.dataset.searchType){state.search.type=el.dataset.searchType;state.search.items=[];if(isAuth()&&state.search.q)await runSearch();else render();return;}
  if(el.dataset.addTrack){addTrackModal(el.dataset.addTrack);return;}
  if(el.dataset.addTo){const r=await act(()=>request(`/api/spotify/playlist/${el.dataset.addTo}/items`,'POST',{uris:[el.dataset.uri]}));if(r){toast('Added to playlist');closeModal();}return;}
  if(el.dataset.device){const r=await act(()=>request('/api/spotify/devices','PUT',{deviceId:el.dataset.device}));if(r!==null){toast('Playback transfer requested');closeModal();}return;}
  if(el.dataset.saveObject){const r=await act(()=>request('/api/spotify/library','PUT',{uri:el.dataset.saveObject}));if(r!==null)toast('Saved to your Spotify library');return;}
  if(el.dataset.artistSearch){state.search.q=el.dataset.artistSearch;state.search.type='track';state.view='search';await runSearch();return;}
  if(el.dataset.removeTrack){
    const detail=state.detail,uri=el.dataset.removeTrack,playlistId=el.dataset.from;
    const canEdit=detail?.type==='playlist'&&detail.item?.id===playlistId
      &&(detail.item.owner?.id===state.profile?.id||detail.item.collaborative)
      &&typeof detail.item.snapshot_id==='string'
      &&detail.items.some(item=>trackUri(item)===uri);
    if(!canEdit){toast('Playlist information changed. Reopen the playlist to edit it.',true);return;}
    const copies=detail.items.filter(item=>trackUri(item)===uri).length;
    const track=detail.items.find(item=>trackUri(item)===uri);
    const prompt='Spotify removes items by URI, not by this row. Removing "'
      +titleFor(track)+'" may remove EVERY occurrence in this playlist, including copies '
      +'on pages you have not loaded. Currently loaded copies: '+copies
      +'. This cannot be undone within AURA. Continue?';
    if(!confirm(prompt))return;
    const r=await act(()=>request('/api/spotify/playlist/'+encodeURIComponent(playlistId)+'/items',
      'DELETE',{uri,snapshot_id:detail.item.snapshot_id,confirm_all_occurrences:true}));
    if(r!==null){toast('Removal completed. Other copies of that item may also have been removed.');await openItem('playlist',playlistId);}
    return;
  }
  const action=el.dataset.action;
  if(action==='create-top-playlist'){
    const uris=first(state.insights.tracks).map(t=>trackUri(t)).filter(u=>/^spotify:track:[A-Za-z0-9]{10,64}$/.test(u));
    if(!uris.length){toast('No playable top tracks available for this period.',true);return;}
    const periods={short_term:'Last 4 Weeks',medium_term:'Last 6 Months',long_term:'All Time'};
    const title='AURA • Your Sound — '+(periods[state.insightRange]||'Favorites');
    if(!confirm('Create a private Spotify playlist named '+title+' with '+uris.length+' of your top tracks?'))return;
    const created=await act(()=>request('/api/spotify/playlist','POST',{name:title,description:'AURA Listening Observatory • personal top tracks from Spotify.'}));
    if(!created?.id)return;
    const added=await act(()=>request('/api/spotify/playlist/'+encodeURIComponent(created.id)+'/items','POST',{uris}));
    if(added===null)toast('Playlist created, but adding tracks failed. Check the playlist in Spotify.',true);
    else toast('Saved '+uris.length+' tracks to '+title+' on Spotify!');
    await act(()=>loadList('playlists'));
    await openItem('playlist',created.id);
    return;
  }
  if(action==='pin-current-mix'){
    const r=await act(()=>request('/api/mixes','POST',{fromCurrent:true}));
    if(r){state.mixPins=first(r.items);render();toast('Current Spotify mix pinned in AURA');}
    return;
  }
  if(action==='export-mixes'){
    const backup=await act(()=>request('/api/personalization'));
    if(!backup)return;
    const data=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const link=document.createElement('a'),url=URL.createObjectURL(data);
    link.href=url;link.download='aura-personalization.json';document.body.append(link);
    link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
    toast('Exported your pinned mixes (no Spotify credentials included).');return;
  }
  if(action==='import-mixes'){
    $('#import-mixes-file')?.click();return;
  }
  if(action==='add-mix'){
    modal('Pin a Spotify mix',`<p class="helper">Paste a playlist link from Spotify. AURA will keep a private shortcut and launch its real Spotify URI.</p>
      <form id="mix-form"><div class="field"><label for="mix-name">Display name</label>
      <input id="mix-name" name="name" maxlength="90" placeholder="Daily Mix 1, Techno Mix, Discover Weekly…" required/>
      </div><div class="field"><label for="mix-link">Spotify playlist link or URI</label>
      <input id="mix-link" name="uri" placeholder="https://open.spotify.com/playlist/..." required spellcheck="false"/></div>
      <div class="modal-footer"><button class="btn" type="button" data-action="close-modal">Cancel</button>
      <button class="btn primary" type="submit">Pin mix</button></div></form>`);
    return;
  }
  if(action==='cancel-sleep'){
    const r=await act(()=>request('/api/sleep','DELETE',{}));
    if(r){state.sleep=r;render();toast('Sleep timer cancelled');}return;
  }
  if(action==='open-spotify-home'){
    window.open('https://open.spotify.com/','_blank','noopener,noreferrer');return;
  }
  if(action==='close-modal'){closeModal();return;}
  if(action==='login-spotify'){const r=await act(()=>request('/api/login','POST',{}));if(r?.url)window.location.assign(r.url);return;}
  if(action==='logout-spotify'){if(!confirm('Disconnect Spotify and delete the saved OAuth token from this computer?'))return;await act(()=>request('/api/logout','POST',{}));state.auth.loggedIn=false;state.profile=null;state.playlists=[];state.tracks=[];state.albums=[];nav('settings');toast('Spotify disconnected');return;}
  if(action==='connect-soloist'){const url=$('#soloist-endpoint')?.value.trim();const r=await act(()=>request('/api/soloist/connect','POST',{url}));if(r)toast('Connecting to Soloist...');return;}
  if(action==='toggle-chamber-queue'){
    state.chamberQueueOpen=!state.chamberQueueOpen;
    if(state.chamberQueueOpen && state.soloist?.connected)await control('get_queue');
    render();
    requestAnimationFrame(()=>$(state.chamberQueueOpen?'#chamber-queue-close':'#queue-peek-open')?.focus());
    return;
  }
  if(action==='cinema-mode'){
    state.cinemaMode=!state.cinemaMode;
    render();
    return;
  }
  if(action==='chamber-fullscreen'){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await $('#main').requestFullscreen();
    }catch(error){toast('Could not enter fullscreen: '+error.message,true);}
    return;
  }
  if(action==='forget-soloist-key'){
    if(!confirm('Forget the locally saved Soloist key? Playback will continue, but new launches will require re-entry.'))return;
    const reply=await act(()=>request('/api/soloist/forget-key','POST',{}));
    if(reply){state.soloistSetup=reply;render();toast('Saved Soloist key forgotten.');}
    return;
  }
  if(action==='discover-soloist'){const r=await act(()=>request('/api/soloist/discover','POST',{}));if(r)toast('Discovered local Soloist');return;}
  if(action==='devices'){await devicesModal();return;}
  if(action==='copy-redirect'){await navigator.clipboard.writeText(state.auth.redirectUri);toast('Redirect URI copied');return;}
  if(action==='install'){if(installPrompt){await installPrompt.prompt();installPrompt=null;}else toast('Use your browser menu → Install app (Chrome, Edge or Chromium).');return;}
  if(action==='new-playlist'){modal('Create a playlist',`<form id="playlist-create"><div class="field"><label>Playlist name</label><input name="name" autofocus maxlength="100" placeholder="A new little universe" required /></div><div class="field"><label>Description (optional)</label><input name="description" maxlength="300" placeholder="A soundtrack for..."/></div><div class="modal-footer"><button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn primary" type="submit">Create playlist</button></div></form>`);return;}
  if(action==='rename-playlist'){modal('Rename playlist',`<form id="playlist-rename" data-id="${esc(el.dataset.id)}"><div class="field"><label>New name</label><input name="name" maxlength="100" value="${esc(state.detail.item.name)}" required /></div><div class="field"><label>Description</label><input name="description" maxlength="300" value="${esc(state.detail.item.description?.replace(/<[^>]+>/g,'')||'')}" /></div><div class="modal-footer"><button class="btn primary" type="submit">Save changes</button></div></form>`);return;}
}
async function onSubmit(e){const form=e.target;if(!['client-form','soloist-form','search-form','search-page-form','mix-form','playlist-create','playlist-rename'].includes(form.id))return;e.preventDefault();
  if(form.id==='client-form'){const r=await act(()=>request('/api/config','POST',{clientId:$('#client-id').value.trim()}));if(r){state.auth=r;render();toast('Client ID saved. You can now sign in.');}return;}
  if(form.id==='soloist-form'){
    const binary=$('#soloist-binary').value.trim(),apiKey=$('#soloist-key').value;
    $('#soloist-key').value='';
    const r=await act(()=>request('/api/soloist/launch','POST',{binary,apiKey,remember:true}));
    if(r){state.soloistSetup=r.setup||state.soloistSetup;render();toast('Soloist launched; its key is saved locally.');}
    return;
  }
  if(form.id==='search-page-form'){
    state.search.q=$('#discovery-input').value.trim();
    state.search.items=[];
    state.view='search';
    if(state.search.q&&isAuth())await runSearch();else render();
    return;
  }
  if(form.id==='search-form'){state.search.q=$('#top-search').value.trim();state.search.items=[];state.search.type=state.view==='search'?state.search.type:'track';state.view='search';if(state.search.q&&isAuth())await runSearch();else render();return;}
  const fields=new FormData(form);const name=String(fields.get('name')||'').trim(),description=String(fields.get('description')||'').trim();
  if(form.id==='mix-form'){
    const uri=String(fields.get('uri')||'').trim();
    const r=await act(()=>request('/api/mixes','POST',{name,uri}));
    if(r){state.mixPins=first(r.items);closeModal();render();toast('Spotify mix pinned!');}
    return;
  }
  if(form.id==='playlist-create'){const r=await act(()=>request('/api/spotify/playlist','POST',{name,description}));if(r){toast('Playlist created');closeModal();await act(()=>loadList('playlists'));nav('playlists');}return;}
  if(form.id==='playlist-rename'){const id=form.dataset.id;const r=await act(()=>request(`/api/spotify/playlist/${id}`,'PUT',{name,description}));if(r!==null){closeModal();toast('Playlist updated');await openItem('playlist',id);}return;}
}
async function onChange(e){
  if(e.target.id==='import-mixes-file'){
    const file=e.target.files?.[0];e.target.value='';
    if(!file)return;
    if(file.size>24000){toast('The AURA backup is too large.',true);return;}
    let backup;
    try{backup=JSON.parse(await file.text());}
    catch{toast('Please select a valid AURA personalization JSON backup.',true);return;}
    const count=Array.isArray(backup?.pinnedMixes)?backup.pinnedMixes.length:0;
    if(!confirm('Import '+count+' pinned mix shortcuts? This replaces your existing AURA pins but does not modify Spotify playlists.'))return;
    const result=await act(()=>request('/api/personalization/import','POST',backup));
    if(result){state.mixPins=first(result.items);render();toast('Imported '+result.count+' Spotify playlist shortcuts.');}
    return;
  }
  if(e.target.id==='seek-range'||e.target.id==='chamber-seek')control('seek',{position_ms:Number(e.target.value)});
  if(e.target.id==='volume-range')control('set_volume',{volume:Number(e.target.value)});
  if(e.target.id==='collection-sort'){state.collectionSort=e.target.value;render();}
  if(e.target.id==='audio-sort'){state.audioShelf.sort=e.target.value;render();}
}
function onInput(e){
  if(!['collection-filter','detail-filter','audio-filter'].includes(e.target.id))return;
  const name=e.target.id;
  const caret=e.target.selectionStart;
  if(name==='collection-filter')state.collectionFilter=e.target.value;
  else if(name==='audio-filter')state.audioShelf.filter=e.target.value;
  else{state.detailFilter=e.target.value;state.detailVisible=120;}
  render();
  const field=$('#'+name);
  if(field){field.focus();field.setSelectionRange(caret,caret);}
}
const AURA_COMMANDS=[
  ['home','Observatory','Your listening home'],['chamber','Listening Chamber','Immersive player'],
  ['search','Discovery','Find music and artists'],['mixes','Made for You','Pinned Spotify mixes'],
  ['sound','Your Sound','Listening insights'],['liked','Liked Songs','Saved tracks'],
  ['albums','Albums','Your album collection'],['playlists','Playlists','Your playlists'],
  ['podcasts','Spoken Worlds','Podcasts and books'],['queue','Queue','Up next'],
  ['tools','Listening Tools','Sleep timer'],['settings','Connections','Account and devices']
];
let paletteIndex=0;
function paletteEntries(query=''){
  const q=query.trim().toLocaleLowerCase();
  return AURA_COMMANDS.filter(([id,label,detail])=>[id,label,detail].some(v=>v.toLocaleLowerCase().includes(q)));
}
function closePalette(restore=true){
  const root=$('#aura-command-palette');if(!root)return;
  const previous=root._previousFocus;root.remove();
  if(restore&&previous?.isConnected)previous.focus();
}
function paintPalette(){
  const root=$('#aura-command-palette');if(!root)return;
  const results=root.querySelector('#aura-command-results');
  const entries=paletteEntries(root.querySelector('#aura-command-input').value);
  paletteIndex=Math.min(paletteIndex,Math.max(0,entries.length-1));
  results.innerHTML=entries.map(([id,label,detail],i)=>`<button type="button" role="option" aria-selected="${i===paletteIndex}" class="aura-command-item ${i===paletteIndex?'selected':''}" data-palette-nav="${id}"><span><strong>${esc(label)}</strong><small>${esc(detail)}</small></span><span class="aura-command-arrow">↗</span></button>`).join('')||'<p class="aura-command-empty">No matching destinations</p>';
  const selected=results.querySelector('.selected');
  if(selected){selected.id='aura-command-active';root.querySelector('#aura-command-input').setAttribute('aria-activedescendant',selected.id);}
  else root.querySelector('#aura-command-input').removeAttribute('aria-activedescendant');
}
function openPalette(){
  if($('#aura-command-palette'))return;
  const root=document.createElement('div');root.id='aura-command-palette';root.className='aura-command-backdrop';
  root._previousFocus=document.activeElement;
  root.innerHTML='<div class="aura-command-dialog" role="dialog" aria-modal="true" aria-label="Navigate AURA"><div class="aura-command-search"><span aria-hidden="true">✦</span><input id="aura-command-input" role="combobox" aria-label="Search AURA destinations" aria-controls="aura-command-results" aria-expanded="true" autocomplete="off" placeholder="Where shall we go?"><kbd>ESC</kbd></div><div id="aura-command-results" role="listbox" aria-label="Destinations"></div><div class="aura-command-hint">↑ ↓ select · Enter open · Esc close</div></div>';
  document.body.append(root);paletteIndex=0;paintPalette();
  root.querySelector('input').focus();
  root.addEventListener('input',()=>{paletteIndex=0;paintPalette();});
  root.addEventListener('click',e=>{
    if(e.target===root){closePalette();return;}
    const item=e.target.closest('[data-palette-nav]');
    if(item){const dest=item.dataset.paletteNav;closePalette(false);nav(dest);$('#main')?.focus();}
  });
}
function paletteKey(e){
  const root=$('#aura-command-palette');if(!root)return false;
  if(e.key==='Escape'){e.preventDefault();closePalette();return true;}
  if(e.key==='Tab'){e.preventDefault();root.querySelector('input').focus();return true;}
  if(['ArrowDown','ArrowUp'].includes(e.key)){
    e.preventDefault();const count=paletteEntries(root.querySelector('input').value).length;
    if(count){paletteIndex=(paletteIndex+(e.key==='ArrowDown'?1:-1)+count)%count;paintPalette();}
    return true;
  }
  if(e.key==='Enter'){
    e.preventDefault();const entry=paletteEntries(root.querySelector('input').value)[paletteIndex];
    if(entry){closePalette(false);nav(entry[0]);$('#main')?.focus();}
    return true;
  }
  return true;
}
function keys(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'){e.preventDefault();openPalette();return;}if(paletteKey(e))return;const typing=e.target.matches('input,textarea,select,[contenteditable]');if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#top-search')?.focus();return;}if(e.key==='Escape')closeModal();if(typing)return;if(e.code==='Space'){e.preventDefault();control(state.soloist?.playback?.status==='playing'?'pause':'play');}if(e.altKey&&e.key==='ArrowRight')control('skip_next');if(e.altKey&&e.key==='ArrowLeft')control('skip_prev');}
async function bootstrap(){try{const boot=await request('/api/bootstrap');state.csrf=boot.csrf;state.auth=boot.spotify;state.soloist=boot.soloist;state.soloistSetup=boot.soloistSetup||null;render();void loadMixesUI();
  if(isAuth())await initLibrary();
  const evt=new EventSource('/api/events');evt.addEventListener('soloist',e=>{try{const updated=JSON.parse(e.data);const connectionChanged=state.soloist?.connected!==updated.connected || state.soloist?.auth?.logged_in!==updated.auth?.logged_in;const queueChanged=JSON.stringify(state.soloist?.queue)!==JSON.stringify(updated.queue);const trackChanged=state.soloist?.playback?.item?.uri!==updated.playback?.item?.uri;const statusChanged=state.soloist?.playback?.status!==updated.playback?.status;state.soloist=updated;renderSidebar();renderPlayer();const redraw=(state.view==='queue'&&queueChanged)||(state.view==='settings'&&connectionChanged)||(state.view==='chamber'&&(trackChanged||statusChanged||(queueChanged&&state.chamberQueueOpen)))||(state.view==='home'&&trackChanged);
    if(redraw){
      if(trackChanged && state.view==='chamber' && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches){
        document.startViewTransition(()=>render());
      }else render();
    }}catch{}});
  evt.onerror=()=>{ /* EventSource retries automatically */ };
  const url=new URL(location.href);if(url.searchParams.get('login')==='error')toast(url.searchParams.get('message')||'Spotify login failed',true);if(url.searchParams.get('login')==='success')toast('Spotify connected — welcome to AURA!');
  if(url.search)history.replaceState({},'',url.pathname);
}catch(e){$('#main').innerHTML=`<div class="inline-empty">AURA could not contact its local server: ${esc(e.message)}. Start it with <span class="mono">node server.mjs</span>.</div>`;}}
addEventListener('click',onClick);addEventListener('submit',onSubmit);addEventListener('change',onChange);addEventListener('input',onInput);addEventListener('keydown',keys);addEventListener('beforeunload',()=>{});
$('#topbar').addEventListener('click',e=>{if(e.target.closest('[data-open-palette]'))openPalette();});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))closeModal();});setInterval(tickPlayer,500);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
bootstrap();

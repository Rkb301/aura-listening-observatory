// AURA v0.4 — Personalized music, podcast shelf and session controls.
// No fabricated recommendations or proprietary Spotify content scraping.
export function madeForYou(ctx){
 const {state,esc,icon,art}=ctx;
 const context=state.soloist?.playback?.context;
 const uri=context?.uri||'';
 const current=/^spotify:playlist:[A-Za-z0-9]{10,64}$/.test(uri);
 const pins=state.mixPins||[];
 const mixed=!!pins.some(p=>p.uri===uri);
 return '<section class="exp-page">'
 +'<header class="exp-intro"><div class="eyebrow">AURA / YOUR PERSONAL FREQUENCIES</div>'
 +'<h1>Made <em>for you.</em></h1><p>Spotify makes the mixes. AURA gives them a permanent home, with one-click playback and no need to rebuild Spotify\'s recommendations.</p></header>'
 +'<div class="mix-current"><div><div class="eyebrow">ON AIR / CURRENT PLAYLIST</div>'
 +'<h2>'+esc(current?(context?.decorations?.identity?.name||'Spotify playlist'):'Play a mix to capture it')+'</h2>'
 +'<p>'+(current?'This is the actual Spotify context that Soloist is playing. Pin it once to revisit it whenever you want.':'Start a Daily Mix, Techno Mix or another playlist in Spotify; while AURA Music is playing it, come back and pin the mix here.')+'</p></div>'
 +'<button class="btn primary" data-action="pin-current-mix" '+(current&&!mixed?'':'disabled')+'>'+icon(mixed?'check':'plus','sm')+' '+(mixed?'Already pinned':'Pin current mix')+'</button></div>'
 +'<div class="exp-section-title"><div><div class="eyebrow">YOUR COLLECTION</div><h2>Saved frequencies</h2></div>'
 +'<div class="mix-backup-actions"><button class="btn ghost" data-action="export-mixes">'+icon('external','sm')+' Export pins</button>'
 +'<button class="btn ghost" data-action="import-mixes">'+icon('plus','sm')+' Import pins</button>'
 +'<button class="btn ghost" data-action="add-mix">'+icon('plus','sm')+' Paste Spotify mix link</button>'
 +'<input type="file" id="import-mixes-file" accept=".json,application/json" hidden /></div></div>'
 +(pins.length?'<div class="mix-grid">'+pins.map((pin,i)=>{
   const safe=/^spotify:playlist:[A-Za-z0-9]{10,64}$/.test(pin.uri);
   const id=safe?pin.uri.split(':')[2]:'';
   const isActive=pin.uri===uri;
   return '<article class="mix-tile"><div class="mix-art mix-gradient-'+(i%5)+'">'
     +'<div class="mix-art-ring"></div><span class="mix-symbol">'+icon('disc','lg')+'</span>'
     +(isActive?'<span class="mix-live">ON AIR</span>':'')+'</div>'
     +'<div class="mix-info"><div class="eyebrow">FREQUENCY '+String(i+1).padStart(2,'0')+'</div>'
     +'<h3 title="'+esc(pin.name)+'">'+esc(pin.name)+'</h3>'
     +'<p>Spotify playlist • Changes on Spotify will be reflected in playback.</p></div>'
     +'<div class="mix-actions">'
       +'<button class="btn primary" data-mix-play="'+esc(pin.uri)+'">'+icon('play','sm')+' Listen</button>'
       +(id?'<button class="btn ghost small" data-mix-open="'+esc(id)+'" title="Open Spotify playlist">Spotify '+icon('external','sm')+'</button>':'')
       +'<button class="icon-btn" data-mix-move="'+esc(pin.uri)+'" data-direction="-1" title="Move earlier" '+(i===0?'disabled':'')+'>'+icon('back','sm')+'</button>'
       +'<button class="icon-btn" data-mix-move="'+esc(pin.uri)+'" data-direction="1" title="Move later" '+(i===pins.length-1?'disabled':'')+'>'+icon('arrow','sm')+'</button>'
       +'<button class="icon-btn" data-mix-remove="'+esc(pin.uri)+'" title="Unpin mix">'+icon('close','sm')+'</button>'
     +'</div></article>'
 }).join('')+'</div>':'<div class="mix-empty">'+icon('disc','lg')+'<h3>Your collection begins with one mix.</h3><p>Paste a Spotify playlist link, or select a mix in the official Spotify app and pin it from the currently playing context.</p><button class="btn primary" data-action="add-mix">Pin a Spotify mix</button></div>')
 +'<div class="exp-section-title"><div><div class="eyebrow">ALREADY IN YOUR SPOTIFY LIBRARY</div><h2>Other mixes in rotation</h2></div><span class="tiny-label">Found in your saved playlists</span></div>'
 +'<div class="saved-mix-list">'+(state.mixCandidates||[]).filter(p=>!pins.some(x=>x.uri===p.uri)).map((p,i)=>{
   const url=art(p),id=p.id||'',playable=/^[A-Za-z0-9]{10,64}$/.test(id);
   return '<div class="saved-mix-row"><span class="saved-mix-icon">'+(url?'<img src="'+esc(url)+'" alt=""/>':icon('disc'))+'</span>'
    +'<div class="saved-mix-label"><strong>'+esc(p.name)+'</strong><small>Saved in Spotify</small></div>'
    +'<button class="btn primary small" data-mix-play="'+esc(p.uri||('spotify:playlist:'+id))+'" '+(playable?'':'disabled')+'>Listen</button>'
    +'<button class="icon-btn" data-mix-save="'+esc(id)+'" '+(playable?'':'disabled')+' title="Pin this playlist to AURA">'+icon('plus','sm')+'</button></div>';
 }).join('')||'<div class="mix-empty">No additional mix-named saved playlists were found.</div>'+'</div>'
 +'<p class="exp-help">These are local shortcuts to real Spotify playlists, not copies of their tracks. Spotify may restrict their track lists in third-party apps, but Soloist can play their playlist URIs.</p>'
 +'</section>';
}
export function yourSound(ctx){
 const {state,esc,icon,card,trackRow}=ctx;
 const data=state.insights||{tracks:[],artists:[],loading:false,error:''};
 const range=state.insightRange||'medium_term';
 const ranges=[['short_term','Last 4 weeks'],['medium_term','Last 6 months'],['long_term','All time']];
 const tracks=data.tracks||[],artists=data.artists||[];
 return '<section class="exp-page">'
 +'<header class="exp-intro"><div class="eyebrow">AURA / YOUR SONIC SIGNATURE</div>'
 +'<h1>A world that <em>sounds like you.</em></h1><p>Your real most-played artists and tracks, retrieved from Spotify. These are not recommendations that AURA invents.</p></header>'
 +'<div class="sound-range">'+ranges.map(([v,l])=>'<button class="'+(range===v?'selected':'')+'" data-insight-range="'+v+'">'+esc(l)+'</button>').join('')+'</div>'
 +(tracks.length&&!data.loading&&!data.error?'<div class="sound-playlist-action"><button class="btn primary" data-action="create-top-playlist">'+icon('plus','sm')+' Save these top tracks as a Spotify playlist</button></div>':'')
 +(data.loading?'<div class="discovery-loading">Reading your Spotify listening history…</div>':
 data.error?'<div class="info-banner">'+esc(data.error)+'</div>':
 '<div class="exp-section-title"><div><div class="eyebrow">THE ARTISTS IN YOUR ORBIT</div><h2>Your top artists</h2></div><span class="tiny-label">'+artists.length+' returned by Spotify</span></div>'
 +'<div class="collection-grid">'+(artists.length?artists.slice(0,10).map((a,i)=>card(a,i,'artist')).join(''):'<div class="mix-empty">No top artists returned for this period.</div>')+'</div>'
 +'<div class="exp-section-title"><div><div class="eyebrow">YOUR MOST-LOVED TRACKS</div><h2>The songs that stay</h2></div><span class="tiny-label">'+tracks.length+' returned by Spotify</span></div>'
 +'<div class="rows">'+(tracks.length?tracks.map((t,i)=>trackRow(t,i)).join(''):'<div class="mix-empty">No tracks returned for this period.</div>')+'</div>')
 +'<p class="exp-help">Spotify calculates these rankings. AURA never claims this is a complete raw listening-history export.</p>'
 +'</section>';
}
export function organizeAudioEntries(entries,kind,query='',sort='saved'){
 const list=Array.isArray(entries)?entries:[];
 const normalized=String(query||'').trim().toLocaleLowerCase();
 const get=e=>e?.[kind==='shows'?'show':kind==='episodes'?'episode':'audiobook']||e||{};
 const matches=e=>{
   if(!normalized)return true;
   const item=get(e);
   return [item.name,item.publisher,item.show?.name,...(item.authors||[]).map(a=>a?.name)]
     .some(v=>String(v||'').toLocaleLowerCase().includes(normalized));
 };
 const result=list.filter(matches);
 if(sort==='title')result.sort((a,b)=>String(get(a).name||'').localeCompare(String(get(b).name||'')));
 if(sort==='duration'&&kind==='episodes')result.sort((a,b)=>(Number(get(b).duration_ms)||0)-(Number(get(a).duration_ms)||0));
 if(sort==='continue'&&kind==='episodes')result.sort((a,b)=>{
   const ap=a?.resume_point||get(a).resume_point,bp=b?.resume_point||get(b).resume_point;
   const aStarted=typeof ap?.resume_position_ms==='number'&&ap.resume_position_ms>0&&!ap.fully_played;
   const bStarted=typeof bp?.resume_position_ms==='number'&&bp.resume_position_ms>0&&!bp.fully_played;
   if(aStarted!==bStarted)return aStarted?-1:1;
   const remaining=e=>{
     const item=get(e),point=e?.resume_point||item.resume_point;
     const duration=Number(item.duration_ms),pos=point?.resume_position_ms;
     return Number.isFinite(duration)&&duration>0&&typeof pos==='number'&&Number.isFinite(pos)&&pos>=0?Math.max(0,duration-pos):Infinity;
   };
   return remaining(a)-remaining(b);
 });
 return result;
}
export function audioShelf(ctx){
 const {state,esc,icon,art}=ctx;
 const data=state.audioShelf||{shows:[],episodes:[],audiobooks:[],kind:'shows',loading:false};
 const k=data.kind||'shows';
 const tabs=[['shows','Podcasts'],['episodes','Saved episodes'],['audiobooks','Audiobooks']];
 const source=data[k]||[];
 const items=organizeAudioEntries(source,k,data.filter||'',data.sort||'saved');
 const activeFilter=String(data.filter||'');
 const activeSort=data.sort||'saved';
 return '<section class="exp-page"><header class="exp-intro"><div class="eyebrow">AURA / SPOKEN WORLDS</div>'
 +'<h1>Stories worth <em>listening to.</em></h1><p>Your saved Spotify podcasts, episodes and audiobooks in a quieter, artwork-led library.</p></header>'
 +'<div class="sound-range">'+tabs.map(([id,label])=>'<button class="'+(k===id?'selected':'')+'" data-audio-kind="'+id+'">'+esc(label)+'</button>').join('')+'</div>'
 +'<div class="audio-workspace"><label class="audio-search-label" for="audio-filter">Filter your '+esc(k)+'</label>'
 +'<input id="audio-filter" type="search" autocomplete="off" placeholder="Find a title, show, or creator…" value="'+esc(activeFilter)+'" aria-label="Filter saved spoken audio" />'
 +'<label class="audio-sort-label" for="audio-sort">Order</label><select id="audio-sort" aria-label="Sort saved spoken audio">'
 +[['saved','Saved order'],['title','Title A–Z'],...(k==='episodes'?[['continue','Continue listening first'],['duration','Longest episodes first']]:[])].map(([id,label])=>'<option value="'+id+'" '+(activeSort===id?'selected':'')+'>'+label+'</option>').join('')+'</select>'
 +'<span class="audio-result-count" aria-live="polite">'+items.length+' of '+source.length+' loaded</span></div>'

 +(data.loading?'<div class="discovery-loading">Loading saved '+esc(k)+'…</div>':
 data.error?'<div class="info-banner">'+esc(data.error)+'</div>':
 '<div class="audio-shelf">'+(items.length?items.map((entry,i)=>{
   const item=entry?.[k==='shows'?'show':k==='episodes'?'episode':'audiobook']||entry;
   const uri=item.uri||((item.id&&k!=='audiobooks')?'spotify:'+(k==='shows'?'show':'episode')+':'+item.id:'');
   const name=esc(item.name||'Untitled');
   const cover=art(item);
   // Shows and audiobooks require context/chapter playback not yet verified
   // with Soloist; hand them to the official Spotify application instead.
   const playable=/^spotify:episode:[A-Za-z0-9]{10,64}$/.test(uri);
   const point=entry?.resume_point||item.resume_point;
   const duration=Number(item.duration_ms);
   const position=point?.resume_position_ms;
   const hasPosition=Number.isFinite(duration)&&duration>0
     &&Number.isFinite(position)&&position>=0;
   const completed=point?.fully_played===true;
   const percentage=completed?100:hasPosition
     ?Math.min(100,Math.max(0,Math.round(position/duration*100))):null;
   const progressText=percentage===null?'':completed?'Completed on Spotify'
     :position===0?'Not started on Spotify'
     :Math.ceil(Math.max(0,duration-position)/60000)+' min remaining on Spotify';
   const progressMarkup=k==='episodes'&&percentage!==null?
     '<div class="audio-progress-label">'+esc(progressText)+'</div>'
     +'<div class="audio-progress" role="progressbar" aria-label="Spotify episode progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percentage+'">'
     +'<span style="width:'+percentage+'%"></span></div>':'';
   return '<article class="audio-entry"><div class="audio-image">'+(cover?'<img src="'+esc(cover)+'" alt=""/>':icon('headphones','lg'))+'</div>'
    +'<div class="audio-description"><div class="eyebrow">'+(k==='shows'?'PODCAST':k==='episodes'?'SAVED EPISODE':'AUDIOBOOK')+'</div>'
    +'<h3>'+name+'</h3><p>'+esc((item.publisher||item.show?.name||item.authors?.[0]?.name||item.description||'').replace(/<[^>]+>/g,'').slice(0,160))+'</p>'+progressMarkup+'</div>'
    +'<div class="audio-actions">'+(playable?'<button class="btn primary" data-play="'+esc(uri)+'">'+icon('play','sm')+' Listen</button>':'')
    +(item.id?'<button class="btn ghost small" data-audio-open="'+(k==='shows'?'show':k==='episodes'?'episode':'audiobook')+':'+esc(item.id)+'">Open on Spotify</button>':'')+'</div>'
    +'</article>';
 }).join(''):'<div class="mix-empty">'+(activeFilter?'No matching '+esc(k)+' in the loaded collection. Try another search or load more.':'No saved '+esc(k)+' returned by Spotify. Open Spotify to explore available shows, episodes and books.')+'</div>')+'</div>'
 +(data.more?'<div class="audio-more"><button class="btn ghost" data-audio-more="true">Load more '+esc(k)+' '+icon('arrow','sm')+'</button></div>':'') )
 +'<p class="exp-help">Episode progress appears only when Spotify includes a resume point and your account has the necessary scope. AURA does not write Spotify listening progress. Shows and audiobooks open in Spotify for supported playback and chapter navigation.</p>'
 +'</section>';
}
export function listeningTools(ctx){
 const {state,esc,icon}=ctx;
 const timer=state.sleep||{},remaining=timer.active&&timer.until?Math.max(0,Math.ceil((timer.until-Date.now())/60000)):0;
 const current=state.soloist?.playback?.item;
 const id=/^spotify:track:([A-Za-z0-9]{10,64})$/.exec(current?.uri||'')?.[1]||'';
 return '<section class="exp-page"><header class="exp-intro"><div class="eyebrow">AURA / LISTENING UTILITIES</div>'
 +'<h1>Keep listening, <em>your way.</em></h1><p>Small controls that make the everyday experience feel effortless.</p></header>'
 +'<div class="tool-panels"><article class="tool-panel"><div class="eyebrow">REST & RITUALS</div><h2>Sleep timer</h2>'
 +'<p>Pause AURA Music after a chosen duration. Your music stays under your control.</p>'
 +'<div class="tool-timers">'+[15,30,45,60,90].map(n=>'<button data-sleep-minutes="'+n+'">'+n+' min</button>').join('')+'</div>'
 +'<div class="sleep-status">'+(timer.active?'<span class="dot online"></span> Timer armed • approximately '+remaining+' minutes remaining':'No timer currently running')+'</div>'
 +(timer.active?'<button class="btn ghost" data-action="cancel-sleep">Cancel timer</button>':'')+'</article>'
 +'<article class="tool-panel"><div class="eyebrow">SPOTIFY CONNECT</div><h2>Your devices</h2><p>Switch playback between your Spotify Connect devices, or return to AURA Music.</p>'
 +'<div class="tool-buttons"><button class="btn primary" data-action="devices">'+icon('device','sm')+' Choose device</button>'
 +'<button class="btn ghost" data-control="activate">Use AURA Music</button></div></article>'
 +'<article class="tool-panel"><div class="eyebrow">THE FULL SPOTIFY WORLD</div><h2>Continue in Spotify</h2>'
 +'<p>AI DJ, Jam, Blend, synchronized lyrics, Spotify recommendations and other protected experiences are still available in Spotify itself.</p>'
 +'<div class="tool-buttons"><button class="btn primary" data-action="open-spotify-home">'+icon('external','sm')+' Spotify Home</button>'
 +(id?'<button class="btn ghost" data-audio-open="track:'+id+'">Current song in Spotify</button>':'')+'</div>'
 +'<p class="exp-help">These launch Spotify; they are not native AURA implementations.</p></article></div>'
 +'</section>';
}

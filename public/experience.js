// AURA's original Listening Observatory and Chamber views.
// Real Spotify/Soloist data only; the ambient motion is purely decorative.
export function chamber(ctx) {
  const {state, icon, esc, art, titleFor, artistFor, formatMs, position, trackUri} = ctx;
  const p=state.soloist?.playback || {}, item=p.item || null;
  const cover=art(item), title=item?titleFor(item):'Your next listening moment';
  const artist=item?artistFor(item):'Choose something you love to begin';
  const playing=p.status==='playing'||p.status==='buffering';
  const duration=item?.decorations?.playback?.duration_ms||item?.duration_ms||0;
  const repeat=p.options?.repeat||'off',shuffle=!!p.options?.shuffle;
  const uri=item?trackUri(item):'';
  return [
    '<section class="listening-chamber" style="--chamber-art:url(&quot;',esc(cover),'&quot;)">',
      '<div class="chamber-ambient"></div><div class="chamber-orbit"></div>',
      '<div class="chamber-head">',
        '<div><div class="eyebrow">AURA / Listening Chamber</div><p class="chamber-kicker">The world can wait. This moment is yours.</p></div>',
        '<button class="btn ghost small" data-action="chamber-fullscreen" title="Toggle fullscreen listening mode">',icon('external','sm'),' Immersive view</button>',
      '</div>',
      '<div class="chamber-stage">',
        '<div class="chamber-art-wrap">',
          '<div class="chamber-halo"></div><div class="chamber-art">',
          cover?'<img src="'+esc(cover)+'" alt="Current album artwork" />':icon('disc','lg'),
          '</div><div class="chamber-art-caption"><span class="chamber-caption-line"></span> AURA // SONIC OBJECT</div>',
        '</div>',
        '<div class="chamber-details">',
          '<div class="eyebrow">',playing?'Now playing':'Ready when you are',' <span class="chamber-live-dot"></span></div>',
          '<h1 class="chamber-title">',esc(title),'</h1>',
          '<div class="chamber-artist">',esc(artist),'</div>',
          '<div class="chamber-detail-rule"></div>',
          '<div class="chamber-time"><span id="chamber-position">',formatMs(position()),'</span><span>',formatMs(duration),'</span></div>',
          '<input class="range chamber-seek" type="range" id="chamber-seek" min="0" max="',String(duration||1),'" value="',String(Math.min(duration||1,position())),'" aria-label="Seek the current track" ',duration?'':'disabled','/>',
          '<div class="chamber-actions">',
            '<button class="icon-btn ',shuffle?'liked':'','" data-control="set_shuffle" title="Shuffle" aria-label="Toggle shuffle">',icon('shuffle'),'</button>',
            '<button class="icon-btn" data-control="skip_prev" title="Previous track" aria-label="Previous track">',icon('prev'),'</button>',
            '<button class="play-main chamber-play" data-control="',playing?'pause':'play','" title="',playing?'Pause':'Play','" aria-label="',playing?'Pause':'Play','">',icon(playing?'pause':'play'),'</button>',
            '<button class="icon-btn" data-control="skip_next" title="Next track" aria-label="Next track">',icon('next'),'</button>',
            '<button class="icon-btn ',repeat!=='off'?'liked':'','" data-control="repeat_cycle" title="Repeat: ',esc(repeat),'" aria-label="Cycle repeat">',icon('repeat'),'</button>',
          '</div>',
          '<div class="chamber-secondary">',
            uri?'<button class="btn ghost small" data-like="'+esc(uri)+'">'+icon('heart','sm')+' Save track</button>':'',
            '<button class="btn ghost small" data-nav="queue">',icon('list','sm'),' See playing next</button>',
            '<button class="btn ghost small" data-action="devices">',icon('device','sm'),' Devices</button>',
          '</div>',
          '<p class="chamber-source">',state.soloist?.auth?.logged_in?'Streaming through '+esc(state.soloist.auth.device_name||'AURA Music'):'Connect Spotify Soloist in Settings to start listening','</p>',
        '</div>',
      '</div>',
      '<footer class="chamber-foot"><span>LISTEN DEEPLY</span><span>POWERED BY SPOTIFY • SHAPED BY AURA</span></footer>',
    '</section>'
  ].join('');
}
export function observatory(ctx) {
  const {state,icon,esc,art,card,trackRow,titleFor,artistFor} = ctx;
  const playing=state.soloist?.playback?.item;
  const cover=art(playing), linked=!!state.auth?.loggedIn;
  const playlists=linked?state.playlists:ctx.demoCollections;
  const tracks=linked?state.tracks:ctx.demoTracks;
  const recent=state.recent||[];
  const counts=[['LIKED SONGS',state.dataPages.tracks?.total,'liked'],['YOUR PLAYLISTS',state.dataPages.playlists?.total,'playlists'],['SAVED ALBUMS',state.dataPages.albums?.total,'albums']];
  const shelves=counts.map(([label,n,target])=>[
    '<button class="obs-stat" data-nav="',target,'"><span>',label,'</span>',
    '<strong>',n===undefined?'—':n.toLocaleString(),'</strong><small>Explore collection ',icon('arrow','sm'),'</small></button>'
  ].join('')).join('');
  return [
    '<div class="observatory">',
      '<section class="obs-hero" style="--obs-cover:url(&quot;',esc(cover),'&quot;)">',
        '<div class="obs-glow"></div>',
        '<div class="obs-copy">',
          '<div class="eyebrow">AURA / The Listening Observatory</div>',
          '<h1>Your music.<br/><em>A universe of its own.</em></h1>',
          '<p>',playing?'You are listening to '+esc(titleFor(playing))+' — '+esc(artistFor(playing))+'.':'Your collection, your rituals, and your next favorite sound. All in one beautifully quiet place.','</p>',
          '<div class="obs-cta"><button class="btn primary" data-nav="chamber">',icon('disc','sm'),' Enter listening chamber</button>',
          '<button class="btn ghost" data-nav="search">',icon('search','sm'),' Explore music</button></div>',
        '</div>',
        '<button class="obs-cover-case" data-nav="chamber" aria-label="Open Listening Chamber">',
          cover?'<img src="'+esc(cover)+'" alt="Currently playing album artwork"/>':'<div class="obs-disc">'+icon('disc','lg')+'</div>',
          '<span>ON AIR // AURA MUSIC</span></button>',
        '<div class="obs-index">01 / THE OBSERVATORY</div>',
      '</section>',
      linked?'<div class="obs-overview">'+shelves+'</div>':
      '<div class="info-banner">Connect Spotify in Settings to replace these preview collections with your real music.</div>',
      '<section class="section obs-section"><div class="section-header"><div><div class="eyebrow">Your recent orbit</div>',
      '<h2 class="section-title">Back in rotation</h2></div>',
      '<button class="section-link" data-nav="liked">Your liked songs ',icon('arrow','sm'),'</button></div>',
      '<div class="obs-recent">',
      recent.length?recent.slice(0,6).map((x,i)=>[
        '<button class="recent-card" data-play="',esc(x.uri||''),'">',
          '<div class="recent-art">',art(x)?'<img src="'+esc(art(x))+'" alt="" />':icon('music'),'</div>',
          '<div class="recent-copy"><strong>',esc(titleFor(x)),'</strong><span>',esc(artistFor(x)),'</span></div>',
          '<span class="recent-play">',icon('play','sm'),'</span>',
        '</button>'
      ].join('')).join(''):
      '<div class="recent-empty">',linked?'Your recent listening history is unavailable right now.':'Sign in to explore your recent listening history.','</div>',
      '</div></section>',
      '<section class="section obs-section"><div class="section-header"><div><div class="eyebrow">Your personal constellation</div>',
      '<h2 class="section-title">Collections worth keeping close</h2></div>',
      '<button class="section-link" data-nav="playlists">View library ',icon('arrow','sm'),'</button></div>',
      '<div class="collection-grid">',playlists.slice(0,5).map((x,i)=>card(x,i)).join(''),'</div></section>',
      '<section class="section obs-section"><div class="section-header"><div><div class="eyebrow">Deep cuts</div>',
      '<h2 class="section-title">From your liked songs</h2></div>',
      '<button class="section-link" data-nav="liked">All liked songs ',icon('arrow','sm'),'</button></div>',
      '<div class="rows">',tracks.slice(0,6).map((x,i)=>trackRow(x,i,{preview:!linked})).join(''),'</div></section>',
    '</div>'
  ].join('');
}


export function collection(ctx, kind) {
  const {state,icon,esc,trackRow,card,loadMore,empty,titleFor,artistFor} = ctx;
  const config={
    liked:{title:'Liked songs',subtitle:'Your saved tracks, always close.',items:state.tracks,endpoint:'tracks'},
    albums:{title:'Saved albums',subtitle:'Records worth returning to.',items:state.albums,endpoint:'albums'},
    playlists:{title:'Your playlists',subtitle:'The soundtracks you have gathered.',items:state.playlists,endpoint:'playlists'}
  };
  const current=config[kind], linked=!!state.auth?.loggedIn;
  if(!linked) return '<div class="page-head"><h1 class="page-h1">'+current.title+'</h1></div><p class="inline-empty">Connect Spotify from Settings to explore your real library.</p>';
  const total=state.dataPages[current.endpoint]?.total??current.items.length;
  const filter=(state.collectionFilter||'').trim().toLowerCase();
  const items=current.items.filter(item=>{
    if(!filter)return true;
    return [titleFor(item),artistFor(item),item?.album?.name].join(' ').toLowerCase().includes(filter);
  });
  if(state.collectionSort==='az')items.sort((a,b)=>titleFor(a).localeCompare(titleFor(b)));
  if(state.collectionSort==='za')items.sort((a,b)=>titleFor(b).localeCompare(titleFor(a)));
  return [
    '<section class="library-experience">',
      '<div class="library-head"><div><div class="eyebrow">AURA / The Living Library</div>',
        '<h1>',esc(current.title),'</h1><p>',esc(current.subtitle),'</p></div>',
        '<div class="library-count"><strong>',total.toLocaleString(),'</strong><span>IN YOUR COLLECTION</span></div>',
      '</div>',
      '<div class="library-tools">',
        '<label class="library-find">',icon('search','sm'),'<input id="collection-filter" placeholder="Filter loaded ',kind==='liked'?'songs':'collections','..." value="',esc(state.collectionFilter||''),'" aria-label="Filter loaded library items"/></label>',
        '<select id="collection-sort" aria-label="Sort loaded library items">',
          '<option value="spotify" ',state.collectionSort==='spotify'?'selected':'','>Spotify order</option>',
          '<option value="az" ',state.collectionSort==='az'?'selected':'','>Name A–Z</option>',
          '<option value="za" ',state.collectionSort==='za'?'selected':'','>Name Z–A</option>',
        '</select>',
        kind==='playlists'?'<button class="btn primary" data-action="new-playlist">'+icon('plus','sm')+' New playlist</button>':'',
      '</div>',
      '<div class="library-meta"><span>Showing ',items.length,' of ',current.items.length,' loaded</span>',
      '<span>Spotify collection total: ',total,' • Search and sorting apply to loaded items</span></div>',
      kind==='liked'?
        '<div class="rows">'+(items.length?items.map((x,i)=>trackRow(x,i)).join(''):empty('Nothing matches this filter'))+'</div>':
        '<div class="collection-grid">'+(items.length?items.map((x,i)=>card(x,i,kind==='albums'?'album':'playlist')).join(''):empty('Nothing matches this filter'))+'</div>',
      loadMore(current.endpoint,current.items,total),
    '</section>'
  ].join('');
}

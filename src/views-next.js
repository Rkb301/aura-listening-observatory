// AURA / discovery, queue, and collection detail — deliberately non-dashboard layouts.
// All artwork and music labels are derived from Spotify or Soloist, never fabricated.
export function discovery(ctx) {
  const {state,esc,icon,art,card,trackRow,empty,loadMore,titleFor,artistFor} = ctx;
  const s=state.search, linked=!!state.auth?.loggedIn;
  const types=[['track','Songs'],['album','Albums'],['artist','Artists'],['playlist','Playlists'],['episode','Episodes'],['show','Podcasts']];
  const cards=s.items.map((x,i)=>{
    if(s.type==='episode')return card(x,i,'episode');
    return card(x,i,s.type==='show'?'show':s.type);
  });
  const recents=(state.recent||[]).slice(0,4);
  const history=recents.map((x,i)=>'<button class="discovery-inspo" data-play="'+esc(x.uri)+'">'
     +'<span class="discovery-inspo-cover">'+(art(x)?'<img src="'+esc(art(x))+'" alt=""/>':icon('music'))+'</span>'
     +'<span class="discovery-inspo-copy"><strong>'+esc(titleFor(x))+'</strong><small>'+esc(artistFor(x))+'</small></span>'
     +icon('play','sm')+'</button>').join('');
  return '<section class="discovery-experience">'
      +'<div class="discovery-head"><div class="eyebrow">AURA / Discovery</div>'
      +'<h1>Follow your <em>curiosity.</em></h1>'
      +'<p>One search. Your actual Spotify catalogue. A quieter way to find your next obsession.</p></div>'
      +'<form id="search-page-form" class="discovery-search">'
      +icon('search')+'<input id="discovery-input" aria-label="Search Spotify catalogue" autocomplete="off" placeholder="An artist, a song, an album, a feeling..." value="'+esc(s.q)+'" required maxlength="120"/>'
      +'<button type="submit">Search '+icon('arrow','sm')+'</button></form>'
      +'<nav class="discovery-filters" aria-label="Search result type">'
      +types.map(([key,label])=>'<button class="discovery-filter '+(s.type===key?'selected':'')+'" data-search-type="'+key+'" type="button">'+label+'</button>').join('')
      +'</nav>'
      +(s.q?'<div class="discovery-results-head"><div><div class="eyebrow">'+esc(s.type)+' results</div><h2>'+esc(s.q)+'</h2></div><div class="discovery-count">'
         +(state.loading?'SEARCHING':(s.total?s.total.toLocaleString()+' MATCHES':'NO RESULTS YET'))+'</div></div>':'')
      +(state.loading?'<div class="discovery-loading">'+icon('disc','lg')+' Searching Spotify…</div>':
          !linked?'<div class="discovery-loading">Connect Spotify in Settings to search your music.</div>':
          !s.q?'<div class="discovery-start"><span>FROM YOUR LISTENING HISTORY</span><h2>A place to begin</h2><p>Return to something familiar—or search for something entirely new.</p>'
             +'<div class="discovery-inspo-grid">'+(history||'<div class="recent-empty">Your listening history will appear here when available.</div>')+'</div></div>':
          (s.type==='track'?'<div class="rows">'+(s.items.length?s.items.map((x,i)=>trackRow(x,i)).join(''):empty('No tracks found','Try another search or category.'))+'</div>'
            :'<div class="collection-grid discovery-cards">'+(s.items.length?cards.join(''):empty('Nothing found','Try a different search.'))+'</div>')
          +loadMore('search',s.items,s.total)
        )
      +'<div class="discovery-footer"><span>REAL MUSIC. NO GENERIC RECOMMENDATION FEED.</span>'
      +'<span>Discovery results depend on Spotify developer permissions.</span></div>'
      +'</section>';
}

export function queueSpace(ctx) {
  const {state,esc,icon,art,titleFor,artistFor,formatMs,trackUri} = ctx;
  const playback=state.soloist?.playback||{}, now=playback.item, q=state.soloist?.queue||{};
  const up=Array.isArray(q.upcoming)?q.upcoming:[],prev=Array.isArray(q.previous)?q.previous:[];
  const queueItem=(entry,i,history=false)=>{
    const x=entry?.item||entry,uri=trackUri(x),artwork=art(x);
    return '<div class="sequence-item">'
      +'<span class="sequence-index">'+String(i+1).padStart(2,'0')+'</span>'
      +'<span class="sequence-image">'+(artwork?'<img src="'+esc(artwork)+'" alt="" />':icon('music'))+'</span>'
      +'<div class="sequence-details"><strong>'+esc(titleFor(x))+'</strong><small>'+esc(artistFor(x))+'</small></div>'
      +'<div class="sequence-duration">'+formatMs(x?.decorations?.playback?.duration_ms||x?.duration_ms)+'</div>'
      +(!history&&/^spotify:track:[A-Za-z0-9]{10,64}$/.test(uri)?'<button class="icon-btn" data-play="'+esc(uri)+'" title="Play this track now" aria-label="Play '+esc(titleFor(x))+' now">'+icon('play','sm')+'</button>':'')
      +'</div>';
  };
  const artNow=art(now);
  return '<section class="sequence-experience"><div class="sequence-head">'
    +'<div><div class="eyebrow">AURA / The Sequence</div><h1>The music <em>ahead.</em></h1>'
    +'<p>Your real Soloist queue, faithfully represented. No invented order, no fake queue manipulation.</p></div>'
    +'<button class="btn ghost" data-control="get_queue">'+icon('list','sm')+' Refresh sequence</button></div>'
    +'<div class="sequence-body">'
    +'<aside class="sequence-current"><div class="eyebrow">CURRENT FREQUENCY</div>'
    +'<div class="sequence-current-image">'+(artNow?'<img src="'+esc(artNow)+'" alt="Now playing artwork"/>':icon('disc','lg'))+'</div>'
    +'<div class="sequence-current-title">'+esc(now?titleFor(now):'Nothing playing')+'</div>'
    +'<div class="sequence-current-artist">'+esc(now?artistFor(now):'The silence before the music')+'</div>'
    +'<div class="sequence-current-status"><span class="dot '+(state.soloist?.connected?'online':'')+'"></span>'
    +esc(state.soloist?.auth?.device_name||'Connect Soloist')+' • '+esc(playback.status||'Idle')+'</div>'
    +'<button class="btn primary" data-nav="chamber">'+icon('disc','sm')+' Open Listening Chamber</button></aside>'
    +'<div class="sequence-lists"><div class="sequence-list-head"><div><span>UP NEXT</span><h2>The next chapter</h2></div><small>'+up.length+' TRACKS IN ENGINE QUEUE</small></div>'
    +'<div class="sequence-rows">'+(up.length?up.map((x,i)=>queueItem(x,i)).join(''):'<div class="sequence-empty">No upcoming tracks reported. Play an album or playlist to build your sequence.</div>')+'</div>'
    +'<div class="sequence-list-head sequence-past"><div><span>BEHIND THE SOUND</span><h2>Previously in this queue</h2></div><small>'+prev.length+' TRACKS</small></div>'
    +'<div class="sequence-rows">'+(prev.length?prev.map((x,i)=>queueItem(x,i,true)).join(''):'<div class="sequence-empty">No previous tracks reported.</div>')+'</div>'
    +'<p class="sequence-note">Track additions and playback are supported. Reordering or deleting engine queue entries is not exposed by this Soloist integration.</p>'
    +'</div></div></section>';
}

export function archiveDetail(ctx) {
  const {state,esc,icon,art,titleFor,artistFor,trackRow,loadMore,empty,itemUri} = ctx;
  const d=state.detail;
  if(!d)return '<div class="loading">Opening your collection…</div>';
  const {item,type,items=[],total=0,error=''}=d;
  const artwork=art(item), title=titleFor(item);
  const owner=type==='playlist'&&(item?.owner?.id===state.profile?.id||item?.collaborative);
  const label=type==='playlist'?'PLAYLIST':type==='album'?'ALBUM':'ARTIST';
  const subtitle=type==='album'?artistFor(item):type==='playlist'?(item?.owner?.display_name||'Your Spotify collection'):'Find this artist in Spotify';
  const about=String(item?.description||'').replace(/<[^>]+>/g,'').trim();
  const back=type==='album'?'albums':type==='playlist'?'playlists':'search';
  const uri=itemUri(item,type);
  const query=(state.detailFilter||'').trim().toLowerCase();
  const matched=query?items.filter(track=>
    [titleFor(track),artistFor(track),track?.album?.name].join(' ').toLowerCase().includes(query)):items;
  const visible=matched.slice(0,state.detailVisible||120);
  return '<section class="archive-detail"><button class="archive-back" data-nav="'+back+'">'
    +icon('back','sm')+' Back to '+(back==='search'?'search':back)+'</button>'
    +'<div class="archive-hero" style="--archive-cover:url(&quot;'+esc(artwork)+'&quot;)">'
    +'<div class="archive-cover">'+(artwork?'<img src="'+esc(artwork)+'" alt="Collection artwork"/>':icon('disc','lg'))+'</div>'
    +'<div class="archive-text"><div class="eyebrow">AURA / '+label+'</div><h1>'+esc(title)+'</h1>'
    +'<p class="archive-byline">'+esc(subtitle)+'</p>'
    +(about?'<p class="archive-description">'+esc(about)+'</p>':'')
    +'<div class="archive-metadata"><span>'+label+'</span>'+(type!=='artist'?'<span>'+total.toLocaleString()+' TRACKS VISIBLE VIA API</span>':'')+'</div>'
    +'<div class="archive-actions">'
    +(type==='artist'?'<button class="btn primary" data-artist-search="'+esc(title)+'">'+icon('search','sm')+' Find songs</button>':
      '<button class="btn primary" data-play="'+esc(uri)+'">'+icon('play','sm')+' Play '+label.toLowerCase()+'</button>')
    +(owner?'<button class="btn ghost" data-action="rename-playlist" data-id="'+esc(item.id)+'">'+icon('settings','sm')+' Edit playlist</button>':'')
    +(type==='album'?'<button class="btn ghost" data-save-object="'+esc(uri)+'">'+icon('heart','sm')+' Save album</button>':'')
    +'</div></div></div>'
    +(error?'<div class="info-banner">'+icon('shield','lg')+' '+esc(error)+'</div>':'')
    +(type==='artist'?'<div class="archive-hint">Artist top tracks are not directly exposed through the current integration. Use <strong>Find songs</strong> to search this artist.</div>':
       '<div class="archive-tracks-head"><div><div class="eyebrow">INSIDE THE COLLECTION</div><h2>Every note, in order.</h2></div><small>'+items.length+' loaded • '+total+' reported</small></div>'
      +'<label class="archive-filter">'+icon('search','sm')+'<input id="detail-filter" placeholder="Find songs among the loaded tracks" value="'+esc(state.detailFilter||'')+'" aria-label="Filter loaded album or playlist tracks"/></label>'
      +'<div class="archive-filter-status">Showing '+visible.length+' of '+matched.length+' matching loaded tracks • '+(items.length<total?'Load more pages to search the rest.':'Full track listing loaded.')+'</div>'
      +'<div class="rows">'+(visible.length?visible.map((x,i)=>trackRow(x,Number.isInteger(x.__auraPosition)?x.__auraPosition:i,{from:item.id,removable:owner&&!!item.snapshot_id,reorder:owner&&!!item.snapshot_id,total})).join(''):empty('No matching tracks','Try a different search or load more pages.'))+'</div>'
      +(matched.length>visible.length?'<div class="pagination"><button class="btn ghost" data-detail-visible="true">Show more loaded tracks</button></div>':'')
      +loadMore('detail',items,total))
    +'</section>';
}

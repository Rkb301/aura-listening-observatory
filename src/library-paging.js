// Spotify library pagination with stable offsets and duplicate-safe rendering.
// Offset advances by the RAW Spotify response count, not filtered item count.
export const libraryKinds = ['tracks', 'albums', 'playlists'];

export function unwrapLibraryItem(type, wrapper) {
  if (!wrapper || typeof wrapper !== 'object') return null;
  const item = type === 'tracks' ? (wrapper.track || wrapper.item || wrapper)
    : type === 'albums' ? (wrapper.album || wrapper.item || wrapper) : wrapper;
  if (!item || typeof item !== 'object') return null;
  const id = item.uri || item.id;
  if(typeof id!=='string'||id.length===0)return null;
  const added=wrapper.added_at;
  return typeof added==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(added)
    ? {...item,__auraAddedAt:added}:item;
}

export function mergeLibraryPage(type, current, page, {replace=false, offset=0}={}) {
  if (!libraryKinds.includes(type)) throw new TypeError('Unknown library type');
  if (!page || !Array.isArray(page.items)) throw new TypeError('Invalid Spotify page');
  if (!Number.isInteger(offset) || offset < 0) throw new TypeError('Invalid offset');
  const old = replace ? [] : current?.items || [];
  const seen=new Set(old.map(x=>x.uri||x.id).filter(Boolean));
  const items=[...old];
  for(const wrapper of page.items){
    const item=unwrapLibraryItem(type,wrapper);
    if(!item)continue;
    const id=item.uri||item.id;
    if(seen.has(id))continue;
    seen.add(id);items.push(item);
  }
  const total=Number.isInteger(page.total)&&page.total>=0 ? page.total : Math.max(items.length,offset+page.items.length);
  const nextOffset=offset+page.items.length;
  const more=page.next === null ? false
    : page.next !== undefined ? !!page.next
    : nextOffset < total;
  // Empty pages and exhausted totals must terminate a bulk scan.
  const hasMore=page.items.length>0 && more && nextOffset<Math.max(total,nextOffset+1);
  return {items, total, nextOffset, hasMore, loaded:items.length};
}

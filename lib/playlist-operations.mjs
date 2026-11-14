// Spotify's Update Playlist Items endpoint uses insertion indices from the
// *original* list, before removing the item being moved.
export function adjacentPlaylistMove(position,direction,total){
  if(!Number.isInteger(position)||!Number.isInteger(total)||total<2
      ||position<0||position>=total||![-1,1].includes(direction))
    throw new TypeError('Invalid playlist position');
  const target=position+direction;
  if(target<0||target>=total)return null;
  return {
    range_start:position,
    insert_before:direction===-1?position-1:position+2,
    range_length:1
  };
}

export function validateReorder(body){
  const {range_start,insert_before,range_length,snapshot_id,total}=body||{};
  if(!Number.isInteger(total)||total<2||total>100000
      ||!Number.isInteger(range_start)||range_start<0||range_start>=total
      ||!Number.isInteger(insert_before)||insert_before<0||insert_before>total
      ||range_length!==1||![range_start-1,range_start+2].includes(insert_before)
      ||typeof snapshot_id!=='string'||snapshot_id.trim().length<1||snapshot_id.length>512
      ||/[\x00-\x1f\x7f]/.test(snapshot_id))
    throw new TypeError('Invalid adjacent playlist reorder command');
  return {range_start,insert_before,range_length:1,snapshot_id};
}


// Spotify's current DELETE /playlists/{id}/items accepts URIs, not a row
// position. A URI can appear multiple times, so explicitly require an
// all-occurrences acknowledgement and a snapshot. Never silently turn a
// row-level click into a potentially multi-row destructive operation.
export function validatePlaylistRemoval(body){
  if(!body||typeof body!=='object'||Array.isArray(body))
    throw new TypeError('Invalid playlist removal request');
  const {uri,snapshot_id,confirm_all_occurrences}=body;
  if(Object.keys(body).some(key=>!['uri','snapshot_id','confirm_all_occurrences'].includes(key))
      ||typeof uri!=='string'
      ||!/^spotify:(?:track|episode):[A-Za-z0-9]{10,64}$/.test(uri)
      ||typeof snapshot_id!=='string'
      ||snapshot_id.trim().length<1||snapshot_id.length>512
      ||/[\x00-\x1f\x7f]/.test(snapshot_id)
      ||confirm_all_occurrences!==true)
    throw new TypeError('Explicit all-occurrences confirmation and a playlist snapshot are required');
  return {items:[{uri}],snapshot_id};
}

// Never coerce arbitrary JSON objects into playlist metadata or silently
// truncate descriptions. Return only Spotify-supported fields.
export function validatePlaylistMetadata(body,{create=false}={}){
  if(!body||typeof body!=='object'||Array.isArray(body)
      ||Object.keys(body).some(key=>!['name','description'].includes(key))
      ||typeof body.name!=='string')
    throw new TypeError('Invalid playlist metadata');
  const name=body.name.trim();
  if(!name||name.length>100||/[\x00-\x1f\x7f]/.test(name)
      ||(body.description!==undefined&&(typeof body.description!=='string'
        ||body.description.length>300||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body.description))))
    throw new TypeError('Invalid playlist metadata');
  return {...(create?{public:false}:{}),name,description:body.description??''};
}

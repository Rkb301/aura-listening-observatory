// Pure, nonsecret playback reliability checks shared by live sampling and tests.
export const EXPECTED_SONG='spotify:track:4fsQ0K37TOXa3hEQfjEic1';
export function inspectSample(health,state){
 const p=state?.playback;
 const failures=[];
 if(health?.status!=='ok'||health?.spotifyAuthenticated!==true||health?.soloistConnected!==true||health?.soloistPaired!==true||state?.connected!==true||p?.status!=='playing')failures.push('connection_or_playback');
 if(p?.item?.uri!==EXPECTED_SONG)failures.push('wrong_song');
 if(p?.options?.repeat!=='track')failures.push('repeat_disabled');
 if(p?.volume!==32)failures.push('volume_changed');
 return {healthy:failures.length===0,failures,version:typeof health?.version==='string'?health.version:'unknown'};
}
export function makeSummary(durationSeconds,intervalMs){return {durationSeconds,intervalMs,samples:0,healthy:0,failures:0,backendVersions:[],repeatTrackSamples:0,expectedSongSamples:0,volume32Samples:0,firstError:null,failureReasons:{},currentFailureStreak:0,longestFailureStreak:0,recoveries:0};}
export function recordSample(summary,result){
 summary.samples++;
 if(result.healthy){
  summary.healthy++;
  if(summary.currentFailureStreak>0)summary.recoveries++;
  summary.currentFailureStreak=0;
 }else{
  summary.failures++;
  summary.currentFailureStreak++;
  summary.longestFailureStreak=Math.max(summary.longestFailureStreak,summary.currentFailureStreak);
  summary.firstError??=result.failures.join(',');
  for(const reason of new Set(result.failures))summary.failureReasons[reason]=(summary.failureReasons[reason]||0)+1;
 }
 if(!summary.backendVersions.includes(result.version))summary.backendVersions.push(result.version);
 if(!result.failures.includes('repeat_disabled'))summary.repeatTrackSamples++;
 if(!result.failures.includes('wrong_song'))summary.expectedSongSamples++;
 if(!result.failures.includes('volume_changed'))summary.volume32Samples++;
 return summary;
}

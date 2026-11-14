import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPECTED_SONG,inspectSample,makeSummary,recordSample} from '../lib/soak-check.mjs';
const health={status:'ok',spotifyAuthenticated:true,soloistConnected:true,soloistPaired:true,version:'0.8.0'};
const state={connected:true,playback:{status:'playing',item:{uri:EXPECTED_SONG},options:{repeat:'track'},volume:32}};
test('healthy playback sample records all conditions',()=>{
 const r=inspectSample(health,state);assert.equal(r.healthy,true);
 const s=recordSample(makeSummary(60,5000),r);assert.equal(s.healthy,1);assert.equal(s.failures,0);assert.equal(s.repeatTrackSamples,1);assert.equal(s.expectedSongSamples,1);assert.equal(s.volume32Samples,1);
});
test('repeat-off, wrong song and changed volume are failures even when connected',()=>{
 const s=recordSample(makeSummary(60,5000),inspectSample(health,{...state,playback:{...state.playback,item:{uri:'spotify:track:other'},options:{repeat:'off'},volume:55}}));
 assert.equal(s.failures,1);assert.equal(s.healthy,0);assert.equal(s.repeatTrackSamples,0);assert.equal(s.expectedSongSamples,0);assert.equal(s.volume32Samples,0);
 assert.match(s.firstError,/wrong_song/);
});
test('missing playback and disconnected Spotify are rejected without throwing',()=>{
 const r=inspectSample({...health,spotifyAuthenticated:false},{connected:false,playback:null});
 assert.equal(r.healthy,false);assert.ok(r.failures.includes('connection_or_playback'));
});
test('summary tracks recovery and preserves first failure',()=>{
 const s=makeSummary(60,5000);
 recordSample(s,inspectSample(health,{...state,playback:{...state.playback,options:{repeat:'off'}}}));
 recordSample(s,inspectSample(health,state));
 assert.equal(s.samples,2);assert.equal(s.healthy,1);assert.equal(s.failures,1);assert.equal(s.repeatTrackSamples,1);assert.equal(s.expectedSongSamples,2);assert.equal(s.volume32Samples,2);assert.equal(s.firstError,'repeat_disabled');
});

test('outage streaks and recoveries distinguish transient from persistent failures',()=>{
 const s=makeSummary(60,5000);
 const bad=inspectSample(health,{...state,playback:{...state.playback,options:{repeat:'off'}}});
 recordSample(s,bad);recordSample(s,bad);recordSample(s,inspectSample(health,state));recordSample(s,bad);
 assert.equal(s.failures,3);assert.equal(s.healthy,1);assert.equal(s.recoveries,1);
 assert.equal(s.currentFailureStreak,1);assert.equal(s.longestFailureStreak,2);
 assert.deepEqual(s.failureReasons,{repeat_disabled:3});
});
test('multiple failures per sample are counted once each and never expose response bodies',()=>{
 const s=makeSummary(60,5000);
 recordSample(s,{healthy:false,failures:['connection_or_playback','wrong_song','wrong_song'],version:'unknown'});
 assert.equal(s.failures,1);assert.equal(s.failureReasons.wrong_song,1);
 assert.equal(s.failureReasons.connection_or_playback,1);
});

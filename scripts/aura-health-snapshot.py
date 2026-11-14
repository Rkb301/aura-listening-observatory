#!/usr/bin/env python3
"""AURA unattended read-only health snapshot. No music metadata or credentials."""
import json
import os
import pathlib
import subprocess
import urllib.request
from datetime import datetime

BASE = pathlib.Path.home()/'.aura-music'/'health'
BASE.mkdir(parents=True, exist_ok=True, mode=0o700)
os.chmod(BASE, 0o700)
LOG = BASE/'history.jsonl'

def command(*args):
    try:
        x=subprocess.run(args, capture_output=True, text=True, timeout=4, check=False)
        return x.stdout.strip() if x.returncode==0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None

record={
  'time':datetime.now().astimezone().isoformat(timespec='seconds'),
  'server':'unreachable',
  'audio_service':command('systemctl','--user','is-active','aura-audio.service'),
  'app_service':command('systemctl','--user','is-active','aura.service'),
  'mpris_service':command('systemctl','--user','is-active','aura-mpris.service'),
}
try:
    with urllib.request.urlopen('http://127.0.0.1:4373/api/health',timeout=4) as result:
        info=json.load(result)
    record.update({
        'server': 'ok' if info.get('status')=='ok' else 'degraded',
        'version': info.get('version'),
        'spotify_authenticated': bool(info.get('spotifyAuthenticated')),
        'soloist_connected': bool(info.get('soloistConnected')),
        'soloist_paired': bool(info.get('soloistPaired')),
        'playback_status': info.get('playbackStatus')
    })
except Exception:
    pass

sinks=command('pactl','list','short','sinks')
inputs=command('pactl','list','short','sink-inputs')
record['speaker_running']= bool(sinks and any('RUNNING' in line for line in sinks.splitlines()))
record['active_audio_streams']=len(inputs.splitlines()) if inputs else 0
players=command('playerctl','-l')
record['mpris_registered']=bool(players and 'aura' in players.splitlines())
record['healthy']=all((
    record['server']=='ok',
    record['app_service']=='active',
    record['audio_service']=='active',
    record.get('soloist_connected',False),
    record.get('soloist_paired',False),
    record['active_audio_streams']>=1
))
fd=os.open(LOG,os.O_APPEND|os.O_CREAT|os.O_WRONLY,0o600)
with os.fdopen(fd,'a') as f:
    f.write(json.dumps(record,sort_keys=True,separators=(',',':'))+'\n')
os.chmod(LOG,0o600)
print(json.dumps(record,indent=2))
# Do not restart audio or auto-play music: the user may intentionally pause playback.

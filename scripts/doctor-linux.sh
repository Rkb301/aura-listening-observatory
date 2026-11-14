#!/usr/bin/env bash
# Read-only local diagnostics. Never prints Spotify tokens or Soloist API keys.
set -euo pipefail
origin='http://127.0.0.1:4373'
echo 'AURA / local service health'
for service in aura.service aura-audio.service aura-mpris.service; do
  active="$(systemctl --user is-active "$service" 2>/dev/null || true)"
  enabled="$(systemctl --user is-enabled "$service" 2>/dev/null || true)"
  printf '  %-20s %-9s enabled=%s\n' "$service" "$active" "$enabled"
done
if curl --silent --fail --max-time 3 "$origin/api/health" | python3 -c '
import json,sys
s=json.load(sys.stdin)
print("  backend:",s.get("status"),"version",s.get("version"))
print("  Spotify authenticated:",s.get("spotifyAuthenticated"))
print("  Soloist:", "connected="+str(s.get("soloistConnected")), "paired="+str(s.get("soloistPaired")), "managed="+str(s.get("soloistManaged")))
print("  playback:",s.get("playbackStatus"))
print("  saved key:",s.get("credentialsSaved"))
'; then :; else echo '  AURA backend unavailable'; fi
echo 'Audio bridge'
if command -v pactl >/dev/null; then
  pactl list short sink-inputs | grep -E '.' | awk '{print "  PulseAudio sink-input:",$1,"sink",$2,"format",$5}' | head -8 || true
  pactl list short sinks | awk '{print "  Speaker sink:",$2,"state",$NF}' | head -8 || true
fi
if command -v pw-dump >/dev/null; then
  pw-dump | python3 -c '
import json,sys
data=json.load(sys.stdin)
wanted={"spotify","aura_bridge_sink","aura_bridge_source","AURA Audio Bridge"}
for node in data:
    if node.get("type")!="PipeWire:Interface:Node":continue
    name=(node.get("info",{}).get("props") or {}).get("node.name")
    if name in wanted: print("  PipeWire:",name,"status",node.get("info",{}).get("state"))
' || true
fi

echo 'Linux desktop media controls'
if command -v playerctl >/dev/null;then
  printf '  MPRIS player status: '
  playerctl -p aura status 2>/dev/null || echo 'AURA media control unavailable'
else
  echo '  playerctl not installed (optional diagnostics)'
fi

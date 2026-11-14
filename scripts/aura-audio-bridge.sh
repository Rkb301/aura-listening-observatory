#!/usr/bin/env bash
# AURA: user-session audio bridge for Ubuntu 22.04's separate PipeWire and PulseAudio.
# No root, package installs, permanent audio changes, or Spotify credentials required.
set -euo pipefail

for tool in pw-loopback pw-dump pactl gst-launch-1.0 python3; do
  command -v "$tool" >/dev/null || { echo "Missing $tool" >&2; exit 1; }
done
if ! pactl info | grep -q '^Server Name: pulseaudio$'; then
  echo "AURA bridge not needed: PulseAudio is not the independent audio server."
  exit 0
fi
if pw-dump | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(x.get("type")=="PipeWire:Interface:Node" and x.get("info",{}).get("props",{}).get("node.name")=="aura_bridge_sink" for x in d) else 1)'; then
  echo "AURA bridge already exists; refusing to start a duplicate." >&2
  exit 1
fi

sink="$(pactl get-default-sink)"
pw-loopback -c 2 \
  --capture-props='{ node.name = "aura_bridge_sink" node.description = "AURA Bridge Sink" media.class = "Audio/Sink" audio.position = [ FL FR ] node.always-process = true node.want-driver = true }' \
  --playback-props='{ node.name = "aura_bridge_source" node.description = "AURA Bridge Source" media.class = "Audio/Source" audio.position = [ FL FR ] node.always-process = true node.want-driver = true }' &
loopback_pid=$!
cleanup() {
  trap - EXIT INT TERM
  if [[ -n "${gst_pid:-}" ]]; then kill "$gst_pid" 2>/dev/null || true; wait "$gst_pid" 2>/dev/null || true; fi
  kill "$loopback_pid" 2>/dev/null || true
  wait "$loopback_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 0' TERM

source_id=""
for _ in {1..50}; do
  source_id="$(pw-dump | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next((x["id"] for x in d if x.get("type")=="PipeWire:Interface:Node" and x.get("info",{}).get("props",{}).get("node.name")=="aura_bridge_source"),""))')" || true
  [[ -n "$source_id" ]] && break
  sleep 0.1
done
[[ -n "$source_id" ]] || { echo "PipeWire bridge source did not appear." >&2; exit 1; }
echo "AURA audio bridge active: PipeWire → PulseAudio sink: $sink"
# Clock the final playback to PulseAudio rather than pushing unsynchronized
# chunks into the sound device. Timestamp the PipeWire capture and resample
# explicitly to the PulseAudio hardware rate (48 kHz on the Acer).
# A modest time-based queue absorbs jitter without unbounded latency.
gst-launch-1.0 -q pipewiresrc path="$source_id" do-timestamp=true min-buffers=16 client-name='AURA Audio Bridge' \
  ! queue max-size-buffers=0 max-size-bytes=0 max-size-time=500000000 leaky=downstream \
  ! audioconvert ! audioresample quality=8 \
  ! 'audio/x-raw,rate=48000,channels=2' \
  ! pulsesink device="$sink" client-name='AURA Audio Bridge' buffer-time=250000 latency-time=20000 sync=true &
gst_pid=$!
wait "$gst_pid"

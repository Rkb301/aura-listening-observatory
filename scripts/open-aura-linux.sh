#!/usr/bin/env bash
# AURA Linux desktop-style launcher — the app remains a locally hosted PWA.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
host='http://127.0.0.1'
port=''
for check in 4373 4374; do
  if curl --fail --silent --max-time 2 "$host:$check/api/bootstrap" >/dev/null; then
    port="$check";break
  fi
done
if [[ -z "$port" ]]; then
  command -v node >/dev/null || { echo 'Node.js is required for AURA.' >&2;exit 1; }
  mkdir -p "$HOME/.aura-music/logs"
  # Prefer our supervised user service, if installed. Otherwise fall back
  # to a local Node process for development or a fresh computer.
  if systemctl --user cat aura.service >/dev/null 2>&1; then
    systemctl --user start aura-audio.service aura.service || true
  else
    (cd "$root" && nohup node server.mjs </dev/null >>"$HOME/.aura-music/logs/launcher.log" 2>&1 &)
  fi
  for _ in {1..60};do
    if curl --fail --silent --max-time 1 "$host:4373/api/bootstrap" >/dev/null;then port=4373;break;fi
    sleep .25
  done
fi
[[ -n "$port" ]] || { echo 'AURA local server did not start. Check ~/.aura-music/logs/launcher.log' >&2;exit 1; }
target="$host:$port/"
for browser in google-chrome chromium chromium-browser microsoft-edge; do
  if command -v "$browser" >/dev/null;then
    exec "$browser" --app="$target" --class=AURA --user-data-dir="$HOME/.aura-music/chrome-profile" --no-first-run --no-default-browser-check
  fi
done
echo "No Chrome/Chromium/Edge binary was found. Open $target in your browser." >&2
exit 1

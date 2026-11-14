#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null; then echo "Install Node.js 22+ first."; exit 1; fi
echo 'Launching AURA at http://127.0.0.1:4373'
(sleep 1; command -v xdg-open >/dev/null && xdg-open 'http://127.0.0.1:4373' >/dev/null 2>&1 || true) &
exec node server.mjs

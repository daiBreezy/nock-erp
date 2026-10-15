#!/bin/zsh
# Started by macOS at login (owner 2026-10-15 — installed by scripts/install-line-service.sh):
# keeps the erp-v2 dev server on :3310 up and runs `npm run line` (tunnel + webhook + LIFF sync).
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$HOME/.local/bin"
cd "$(dirname "$0")/.." || exit 1
LOG="$HOME/Library/Logs/nockerp-dev.log"

# the dev server: start it if nothing answers on :3310 (Claude's preview may already run one) — check every 30 s
(
  while true; do
    if ! nc -z localhost 3310 2>/dev/null; then
      echo "[$(date)] starting dev server" >> "$LOG"
      npm run dev -- --port 3310 >> "$LOG" 2>&1 &
      sleep 60
    fi
    sleep 30
  done
) &

exec node scripts/line-up.mjs

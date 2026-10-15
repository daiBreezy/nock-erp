#!/bin/zsh
# Turn on / off: LINE keeps working after a restart (owner 2026-10-15).
#   install:    zsh erp-v2/scripts/install-line-service.sh
#   uninstall:  zsh erp-v2/scripts/install-line-service.sh off
# What it does: adds ~/Library/LaunchAgents/com.nockacademy.erp-line.plist so macOS runs scripts/line-service.sh at
# login (your user only, no admin rights) — dev server on :3310 + `npm run line`. Logs: ~/Library/Logs/nockerp-line.log
LABEL=com.nockacademy.erp-line
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DIR="$(cd "$(dirname "$0")" && pwd)"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
if [[ "$1" == "off" ]]; then
  rm -f "$PLIST"
  echo "ปิดแล้ว — LINE จะไม่เปิดเองตอนเปิดเครื่องอีก"
  exit 0
fi

chmod +x "$DIR/line-service.sh"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/zsh</string><string>$DIR/line-service.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/nockerp-line.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/nockerp-line.log</string>
</dict>
</plist>
EOF
launchctl bootstrap "gui/$(id -u)" "$PLIST" && echo "เปิดแล้ว — LINE จะทำงานเองทุกครั้งที่เปิดเครื่อง · ดู log: tail -f ~/Library/Logs/nockerp-line.log"

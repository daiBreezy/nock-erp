#!/bin/bash
# ============================================================
# gemini.sh — NockERP Gemini Code Generator
# Usage: ./gemini.sh "prompt here"
#        ./gemini.sh -f prompt_file.txt
#        ./gemini.sh -f prompt_file.txt -o output_file.js
# ============================================================

set -euo pipefail

# Load env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "❌ GEMINI_API_KEY not found in .env" >&2
  exit 1
fi

MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
PROMPT=""
OUTPUT_FILE=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)   PROMPT=$(cat "$2"); shift 2 ;;
    -o|--output) OUTPUT_FILE="$2"; shift 2 ;;
    *) PROMPT="$1"; shift ;;
  esac
done

if [ -z "$PROMPT" ]; then
  echo "❌ No prompt provided" >&2
  exit 1
fi

# Build JSON payload
PAYLOAD=$(python3 -c "
import json, sys
prompt = sys.argv[1]
payload = {
  'contents': [{'parts': [{'text': prompt}]}],
  'generationConfig': {
    'temperature': 0.2,
    'maxOutputTokens': 8192
  }
}
print(json.dumps(payload))
" "$PROMPT")

# Call Gemini API
RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Extract text
RESULT=$(echo "$RESPONSE" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if 'candidates' in d:
    text = d['candidates'][0]['content']['parts'][0]['text']
    # Strip markdown code blocks if present
    lines = text.split('\n')
    if lines[0].startswith('\`\`\`'):
        lines = lines[1:]
    if lines and lines[-1].strip() == '\`\`\`':
        lines = lines[:-1]
    print('\n'.join(lines))
else:
    err = d.get('error', {})
    print(f'ERROR {err.get(\"code\")}: {err.get(\"message\",\"Unknown\")}', file=sys.stderr)
    sys.exit(1)
")

# Output
if [ -n "$OUTPUT_FILE" ]; then
  echo "$RESULT" > "$OUTPUT_FILE"
  echo "✅ Saved to $OUTPUT_FILE ($(echo "$RESULT" | wc -l | tr -d ' ') lines)"
else
  echo "$RESULT"
fi

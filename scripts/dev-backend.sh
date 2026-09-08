#!/usr/bin/env bash
set -euo pipefail

# Isolated local Supabase; never links, pushes, resets, or reads remote credentials.
# ./scripts/dev-backend.sh          Start, migrate and seed the local backend
# ./scripts/dev-backend.sh --status Check local health without printing keys
# ./scripts/dev-backend.sh --stop   Stop only this project's local containers
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
umask 077
command -v supabase >/dev/null || { echo 'Install the Supabase CLI first.' >&2; exit 1; }
command -v node >/dev/null || { echo 'Node.js is required.' >&2; exit 1; }
BACKEND_LOG="$ROOT_DIR/.dev-backend.log"
STATUS_FILE="$ROOT_DIR/.env.supabase.status.json"

case "${1:-}" in
  --status)
    supabase status -o json > "$STATUS_FILE" 2> "$BACKEND_LOG" || { echo 'Local Supabase is not running.'; exit 1; }
    node "$ROOT_DIR/scripts/dev-backend.mjs" --status
    exit
    ;;
  --stop)
    supabase stop >> "$BACKEND_LOG" 2>&1
    echo 'Local Captuto Supabase stopped; its database is preserved.'
    exit
    ;;
  '') ;;
  *) echo 'Usage: ./scripts/dev-backend.sh [--status|--stop]' >&2; exit 1 ;;
esac

echo 'Starting isolated Captuto Supabase (first run downloads Docker images)…'
if ! supabase start --exclude analytics,vector,edge-runtime,imgproxy > "$BACKEND_LOG" 2>&1; then
  echo "Local backend start failed. See $BACKEND_LOG (may contain local credentials)." >&2
  exit 1
fi
if ! supabase migration up --local >> "$BACKEND_LOG" 2>&1; then
  echo "Local migrations failed. See $BACKEND_LOG." >&2
  exit 1
fi
supabase status -o json > "$STATUS_FILE" 2>> "$BACKEND_LOG"
node "$ROOT_DIR/scripts/dev-backend.mjs"
echo 'Backend ready. To use it: ./scripts/dev-start.sh --stop && ./scripts/dev-start.sh --local'

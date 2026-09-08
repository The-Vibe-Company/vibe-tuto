#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# dev-start.sh — Idempotent dev environment bootstrap
#
# Usage: ./scripts/dev-start.sh          Start/verify dev server
#        ./scripts/dev-start.sh --local  Start with isolated local Supabase
#        ./scripts/dev-start.sh --stop   Stop the dev server
#        ./scripts/dev-start.sh --status Check if running
#
# Idempotent: safe to run N times. If the server is healthy, exits instantly.
# =============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_PORT="${CONDUCTOR_PORT:-3678}"
PID_FILE="$ROOT_DIR/.dev-server.pid"
LOG_FILE="$ROOT_DIR/.dev-server.log"
BACKEND_FILE="$ROOT_DIR/.dev-server.backend"
BACKEND_MODE="configured"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
die()   { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

# --------------- helpers ---------------

is_port_listening() {
  lsof -iTCP:"$WEB_PORT" -sTCP:LISTEN -t &>/dev/null
}

is_server_healthy() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$WEB_PORT" 2>/dev/null || echo "000")
  [[ "$code" =~ ^[23] ]]
}

get_pid_on_port() {
  lsof -iTCP:"$WEB_PORT" -sTCP:LISTEN -t 2>/dev/null | head -1
}

kill_server() {
  local pid
  # Kill by PID file
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
  # Kill anything still on the port
  if is_port_listening; then
    pid=$(get_pid_on_port)
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null || true
    fi
  fi
  sleep 1
}

# --------------- commands ---------------

cmd_stop() {
  kill_server
  rm -f "$BACKEND_FILE"
  info "Dev server stopped"
}

cmd_status() {
  if is_port_listening && is_server_healthy; then
    info "Dev server running on http://localhost:$WEB_PORT (PID: $(get_pid_on_port))"
    return 0
  elif is_port_listening; then
    warn "Port $WEB_PORT is occupied but server is not healthy"
    return 1
  else
    warn "Dev server is not running"
    return 1
  fi
}

cmd_start() {
  cd "$ROOT_DIR"

  # Backend changes are explicit even if the current frontend is unhealthy.
  if is_port_listening; then
    local running_mode="configured"
    [ -f "$BACKEND_FILE" ] && running_mode=$(cat "$BACKEND_FILE")
    if [ "$running_mode" != "$BACKEND_MODE" ]; then
      die "Server uses $running_mode backend. Stop it first with ./scripts/dev-start.sh --stop, then start the desired backend (use --local for Docker Supabase)."
    fi
  fi

  # --- Fast path: already running and healthy? Do nothing. ---
  if is_port_listening && is_server_healthy; then
    info "Dev server already running on http://localhost:$WEB_PORT ($BACKEND_MODE backend)"
    exit 0
  fi

  # --- If port is occupied but unhealthy, kill it ---
  if is_port_listening; then
    warn "Port $WEB_PORT occupied but unhealthy — restarting..."
    kill_server
  fi

  # --- Clean stale PID file ---
  if [ -f "$PID_FILE" ]; then
    local old_pid
    old_pid=$(cat "$PID_FILE")
    if ! kill -0 "$old_pid" 2>/dev/null; then
      rm -f "$PID_FILE"
    fi
  fi

  # --- Check pnpm ---
  command -v pnpm &>/dev/null || die "pnpm not found. Install: npm i -g pnpm@9"
  info "pnpm $(pnpm --version)"

  # --- Bring up isolated backend only when explicitly requested ---
  if [ "$BACKEND_MODE" = "local" ]; then
    "$ROOT_DIR/scripts/dev-backend.sh"
  fi

  # --- Check env files ---
  if [ "$BACKEND_MODE" != "local" ] && [ ! -f "$ROOT_DIR/.env.local" ] && [ ! -f "$ROOT_DIR/apps/web/.env.local" ]; then
    die "No .env.local found. Copy apps/web/.env.example to .env.local and fill in values."
  fi
  info "Environment config found"

  # Next.js loads env files from the app directory. Export root env values too,
  # because this repo keeps shared local configuration at the workspace root.
  set -a
  [ -f "$ROOT_DIR/.env.local" ] && source "$ROOT_DIR/.env.local"
  [ -f "$ROOT_DIR/apps/web/.env.local" ] && source "$ROOT_DIR/apps/web/.env.local"
  if [ "$BACKEND_MODE" = "local" ]; then
    source "$ROOT_DIR/.env.supabase.local"
  fi
  set +a

  # --- Install deps (pnpm is idempotent — instant if nothing changed) ---
  info "Checking dependencies..."
  pnpm install --frozen-lockfile 2>&1 | tail -3
  info "Dependencies OK"

  # --- Start dev server ---
  warn "Starting dev server on port $WEB_PORT..."
  # Detach the process session as well as stdio so agent command cleanup cannot
  # terminate the server when the launching shell exits.
  python3 - "$LOG_FILE" "$PID_FILE" "$ROOT_DIR" "$WEB_PORT" <<'PY_START'
import pathlib, subprocess, sys
with open(sys.argv[1], 'ab') as log:
    process = subprocess.Popen(['pnpm', '--filter', '@captuto/web', 'exec', 'next', 'dev', '-p', sys.argv[4]], cwd=sys.argv[3],
        stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
pathlib.Path(sys.argv[2]).write_text(str(process.pid))
PY_START
  echo "$BACKEND_MODE" > "$BACKEND_FILE"

  # --- Wait for healthy response ---
  local waited=0
  local max_wait=90
  while [ $waited -lt $max_wait ]; do
    if is_server_healthy; then
      echo ""
      info "Dev server ready at http://localhost:$WEB_PORT (PID: $(cat "$PID_FILE"))"
      exit 0
    fi
    # Check process didn't crash
    if [ -f "$PID_FILE" ] && ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo ""
      die "Dev server crashed. Logs:\n$(tail -30 "$LOG_FILE")"
    fi
    printf "."
    sleep 2
    waited=$((waited + 2))
  done

  echo ""
  die "Timeout (${max_wait}s). Logs:\n$(tail -30 "$LOG_FILE")"
}

cmd_start_foreground() {
  cd "$ROOT_DIR"

  # Foreground mode `exec`s into next dev so a supervisor (e.g. Conductor's `run`)
  # watches that exact PID. If the port is busy we always reclaim it — handing
  # control to a pre-existing process would leave the supervisor watching this
  # shell, not the server.
  if is_port_listening; then
    warn "Port $WEB_PORT already occupied — reclaiming for foreground supervision..."
    kill_server
  fi

  # --- Clean stale PID file (background-mode artifact) ---
  if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
  fi

  # --- Check pnpm ---
  command -v pnpm &>/dev/null || die "pnpm not found. Install: npm i -g pnpm@9"
  info "pnpm $(pnpm --version)"

  # --- Check env files ---
  if [ ! -f "$ROOT_DIR/.env.local" ] && [ ! -f "$ROOT_DIR/apps/web/.env.local" ]; then
    die "No .env.local found. Copy apps/web/.env.example to .env.local and fill in values."
  fi
  info "Environment config found"

  # --- Install deps (pnpm is idempotent — instant if nothing changed) ---
  info "Checking dependencies..."
  pnpm install --frozen-lockfile 2>&1 | tail -3
  info "Dependencies OK"

  # --- Replace this shell with the dev server so the supervisor sees it directly ---
  warn "Starting dev server on port $WEB_PORT (foreground)..."
  exec pnpm --filter web exec next dev -p "$WEB_PORT" -H 0.0.0.0
}

# --------------- main ---------------

case "${1:-}" in
  --foreground) cmd_start_foreground ;;
  --stop)   cmd_stop   ;;
  --status) cmd_status ;;
  --local)  BACKEND_MODE="local"; cmd_start ;;
  '')       cmd_start ;;
  *)        die "Usage: ./scripts/dev-start.sh [--local|--stop|--status]" ;;
esac

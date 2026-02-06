#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# dev-start.sh — Idempotent dev environment bootstrap
#
# Usage: ./scripts/dev-start.sh          Start/verify dev server
#        ./scripts/dev-start.sh --stop   Stop the dev server
#        ./scripts/dev-start.sh --status Check if running
#
# Idempotent: safe to run N times. If the server is healthy, exits instantly.
# =============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_PORT=3678
PID_FILE="$ROOT_DIR/.dev-server.pid"
LOG_FILE="$ROOT_DIR/.dev-server.log"

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

  # --- Fast path: already running and healthy? Do nothing. ---
  if is_port_listening && is_server_healthy; then
    info "Dev server already running on http://localhost:$WEB_PORT"
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

  # --- Check env files ---
  if [ ! -f "$ROOT_DIR/.env.local" ] && [ ! -f "$ROOT_DIR/apps/web/.env.local" ]; then
    die "No .env.local found. Copy apps/web/.env.example to .env.local and fill in values."
  fi
  info "Environment config found"

  # --- Install deps (pnpm is idempotent — instant if nothing changed) ---
  info "Checking dependencies..."
  pnpm install --frozen-lockfile 2>&1 | tail -3
  info "Dependencies OK"

  # --- Start dev server ---
  warn "Starting dev server on port $WEB_PORT..."
  nohup pnpm --filter web dev > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"

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

# --------------- main ---------------

case "${1:-}" in
  --stop)   cmd_stop   ;;
  --status) cmd_status ;;
  *)        cmd_start  ;;
esac

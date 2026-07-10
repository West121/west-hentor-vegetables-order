#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hentor-vegetables}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
WEB_DIR="${WEB_DIR:-$APP_DIR/frontend/apps/admin-web}"
PID_FILE="$APP_DIR/admin-web.pid"
LOG_FILE="$APP_DIR/logs/admin-web.log"

mkdir -p "$APP_DIR/logs"

if [ ! -d "$WEB_DIR/.next/static" ]; then
  echo "Admin web static assets are missing: $WEB_DIR/.next/static" >&2
  echo "Copy .next/static alongside the standalone Next.js output before starting." >&2
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
export SPRING_API_BASE_URL="${SPRING_API_BASE_URL:-http://127.0.0.1:8080}"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Admin web is already running: $(cat "$PID_FILE")"
  exit 0
fi

cd "$WEB_DIR"
nohup node server.js >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
echo "Admin web started: $(cat "$PID_FILE")"

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hentor-vegetables}"

stop_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [ ! -f "$pid_file" ]; then
    echo "$name is not running"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "$name stopped: $pid"
  else
    echo "$name pid file was stale: $pid"
  fi
  rm -f "$pid_file"
}

stop_pid_file "Admin web" "$APP_DIR/admin-web.pid"
stop_pid_file "Spring API" "$APP_DIR/backend.pid"

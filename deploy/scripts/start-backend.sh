#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hentor-vegetables}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
JAR_FILE="${JAR_FILE:-$APP_DIR/backend/vegetables-spring-api.jar}"
PID_FILE="$APP_DIR/backend.pid"
LOG_FILE="$APP_DIR/logs/spring-api.log"

mkdir -p "$APP_DIR/logs" "$APP_DIR/uploads"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

export SPRING_STORAGE_MODE="${SPRING_STORAGE_MODE:-local}"
export SPRING_STORAGE_LOCAL_ROOT="${SPRING_STORAGE_LOCAL_ROOT:-$APP_DIR/uploads}"
export SPRING_STORAGE_PUBLIC_BASE_URL="${SPRING_STORAGE_PUBLIC_BASE_URL:-/uploads}"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Spring API is already running: $(cat "$PID_FILE")"
  exit 0
fi

nohup java ${JAVA_OPTS:-} -jar "$JAR_FILE" >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
echo "Spring API started: $(cat "$PID_FILE")"

#!/bin/sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"

if [ -n "${MINIO_ENDPOINT:-}" ] && [ -z "${SPRING_MINIO_ENDPOINT:-}" ]; then
  minio_scheme="http"
  case "${MINIO_USE_SSL:-false}" in
    1|true|TRUE|yes|YES)
      minio_scheme="https"
      ;;
  esac

  if [ -n "${MINIO_PORT:-}" ]; then
    export SPRING_MINIO_ENDPOINT="${minio_scheme}://${MINIO_ENDPOINT}:${MINIO_PORT}"
  else
    export SPRING_MINIO_ENDPOINT="${minio_scheme}://${MINIO_ENDPOINT}"
  fi
fi

if [ -z "${SPRING_MINIO_PUBLIC_URL:-}" ] && [ -n "${SPRING_MINIO_ENDPOINT:-}" ]; then
  export SPRING_MINIO_PUBLIC_URL="${SPRING_MINIO_ENDPOINT}"
fi

if [ -z "${SPRING_MINIO_ACCESS_KEY:-}" ] && [ -n "${MINIO_ACCESS_KEY:-}" ]; then
  export SPRING_MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY}"
fi

if [ -z "${SPRING_MINIO_SECRET_KEY:-}" ] && [ -n "${MINIO_SECRET_KEY:-}" ]; then
  export SPRING_MINIO_SECRET_KEY="${MINIO_SECRET_KEY}"
fi

if [ -z "${SPRING_MINIO_BUCKET:-}" ] && [ -n "${MINIO_BUCKET:-}" ]; then
  export SPRING_MINIO_BUCKET="${MINIO_BUCKET}"
fi

# Prevent Spring relaxed environment binding from overriding minio.endpoint
# with a host-only value such as "localhost".
unset MINIO_ENDPOINT
unset MINIO_PORT
unset MINIO_USE_SSL

exec mvn -f apps/spring-api/pom.xml spring-boot:run

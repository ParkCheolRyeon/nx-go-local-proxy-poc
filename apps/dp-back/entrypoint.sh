#!/bin/sh
set -e

export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

case "$1" in
migrate)
    shift
    exec /usr/local/bin/migrate -path /migrations -database "$DATABASE_URL" "$@"
    ;;
*)
    exec /usr/local/bin/dp-back
    ;;
esac
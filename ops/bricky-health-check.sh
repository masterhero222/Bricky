#!/usr/bin/env bash
set -Eeuo pipefail

SITE_URL="${BRICKY_SITE_URL:-https://bricky.bg}"
READY_URL="${BRICKY_READY_URL:-https://bricky.bg/api/health/ready}"
DISK_PATH="${BRICKY_DISK_PATH:-/var/www}"
DISK_LIMIT="${BRICKY_DISK_LIMIT:-85}"
TIMEOUT="${BRICKY_HEALTH_TIMEOUT:-15}"
STATE_DIR="${BRICKY_MONITOR_STATE_DIR:-/var/lib/bricky-monitor}"

mkdir -p "$STATE_DIR"

failures=()
site_code="$(curl --silent --show-error --location --output /dev/null \
  --write-out '%{http_code}' --max-time "$TIMEOUT" "$SITE_URL" || true)"
[[ "$site_code" == "200" ]] || failures+=("site_http_${site_code:-000}")

ready_body="$(curl --silent --show-error --location --max-time "$TIMEOUT" \
  "$READY_URL" || true)"
if ! grep -Eq '"database"[[:space:]]*:[[:space:]]*"ok"' <<<"$ready_body"; then
  failures+=("database_not_ready")
fi
if ! grep -Eq '"storage"[[:space:]]*:[[:space:]]*"ok"' <<<"$ready_body"; then
  failures+=("storage_not_ready")
fi

disk_used="$(df -P "$DISK_PATH" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
if [[ ! "$disk_used" =~ ^[0-9]+$ ]] || (( disk_used >= DISK_LIMIT )); then
  failures+=("disk_${disk_used:-unknown}_percent")
fi

timestamp="$(date --iso-8601=seconds)"
if ((${#failures[@]})); then
  message="Bricky health failure: ${failures[*]}"
  logger -t bricky-health "$message"
  printf '%s %s\n' "$timestamp" "$message" >"$STATE_DIR/last-failure.log"
  if [[ -n "${BRICKY_ALERT_WEBHOOK_URL:-}" ]]; then
    payload="$(printf '%s' "$message" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    curl --silent --show-error --max-time "$TIMEOUT" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"$payload\"}" "$BRICKY_ALERT_WEBHOOK_URL" >/dev/null || true
  fi
  exit 1
fi

rm -f "$STATE_DIR/last-failure.log"
logger -t bricky-health "ok site=200 disk=${disk_used}%"

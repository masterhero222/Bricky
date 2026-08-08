#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:?Usage: rehearsal-stack.sh start|stop}"
BUILDER_ROOT="${BRICKY_REHEARSAL_BUILDER_ROOT:-/var/www/Bricky-final-builder}"
STATE_DIR="${BRICKY_REHEARSAL_STATE_DIR:-/var/tmp/bricky-final-stack}"
API_PORT="${BRICKY_REHEARSAL_API_PORT:-3100}"
WEB_PORT="${BRICKY_REHEARSAL_WEB_PORT:-4173}"
PM2_PROCESS_NAME="${BRICKY_PM2_PROCESS_NAME:-bricky-backend}"
PM2_PROCESS_ID="${BRICKY_PM2_PROCESS_ID:-}"

if [[ "$ACTION" == start ]]; then
  if [[ -z "$PM2_PROCESS_ID" ]]; then
    PM2_PROCESS_ID="$(pm2 jlist | node -e '
      let input = "";
      process.stdin.on("data", (chunk) => (input += chunk));
      process.stdin.on("end", () => {
        const name = process.argv[1];
        const processEntry = JSON.parse(input).find((entry) => entry.name === name);
        if (processEntry) process.stdout.write(String(processEntry.pm_id));
      });
    ' "$PM2_PROCESS_NAME")"
  fi
  [[ -n "$PM2_PROCESS_ID" ]] || {
    echo "PM2 process is missing: $PM2_PROCESS_NAME" >&2
    exit 1
  }

  read_pm2_value() {
    local key="$1"
    pm2 env "$PM2_PROCESS_ID" | sed -n "s/^${key}: //p" | head -n 1
  }
  for key in DB_HOST DB_PORT DB_USER DB_PASS JWT_SECRET NODE_ENV TYPEORM_SYNCHRONIZE; do
    value="${!key:-$(read_pm2_value "$key")}" 
    [[ -n "$value" ]] || {
      echo "Missing $key in PM2 process $PM2_PROCESS_ID" >&2
      exit 1
    }
    export "$key=$value"
  done
  for key in MAIL_HOST MAIL_PORT MAIL_USER MAIL_PASS MAIL_FROM; do
    value="${!key:-$(read_pm2_value "$key")}" 
    [[ -n "$value" ]] && export "$key=$value"
  done
  for key in DB_NAME UPLOADS_DIR APP_COMMIT_SHA; do
    [[ -n "${!key:-}" ]] || {
      echo "$key must be set for the rehearsal stack" >&2
      exit 1
    }
  done
  export PORT="$API_PORT"
  export CORS_ORIGINS="http://127.0.0.1:$WEB_PORT"
fi

stop_process() {
  local name="$1"
  local pid_file="$STATE_DIR/$name.pid"
  [[ -f "$pid_file" ]] || return 0
  local pid
  pid="$(cat "$pid_file")"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    command_line="$(ps -p "$pid" -o args=)"
    process_cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    if [[ "$command_line" != *"$BUILDER_ROOT"* && "$process_cwd" != "$BUILDER_ROOT"/* ]]; then
      echo "Refusing to stop unexpected process $pid: $command_line" >&2
      exit 1
    fi
    kill "$pid"
    for _ in {1..20}; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.25
    done
  fi
  rm -f "$pid_file"
}

if [[ "$ACTION" == stop ]]; then
  stop_process web
  stop_process api
  exit 0
fi

[[ "$ACTION" == start ]] || {
  echo "Unsupported action: $ACTION" >&2
  exit 1
}
[[ -f "$BUILDER_ROOT/backend/dist/main.js" ]] || {
  echo "Backend rehearsal build is missing" >&2
  exit 1
}
[[ -f "$BUILDER_ROOT/frontend/dist/index.html" ]] || {
  echo "Frontend rehearsal build is missing" >&2
  exit 1
}

mkdir -p "$STATE_DIR"
stop_process web
stop_process api

node "$BUILDER_ROOT/backend/dist/main.js" >"$STATE_DIR/api.log" 2>&1 &
echo "$!" >"$STATE_DIR/api.pid"

npm --prefix "$BUILDER_ROOT/frontend" run preview -- \
  --host 127.0.0.1 --port "$WEB_PORT" >"$STATE_DIR/web.log" 2>&1 &
echo "$!" >"$STATE_DIR/web.pid"

for _ in {1..60}; do
  if curl --silent --fail "http://127.0.0.1:$API_PORT/health/ready" >/dev/null &&
    curl --silent --fail "http://127.0.0.1:$WEB_PORT" >/dev/null; then
    printf 'rehearsal_stack=ready api=%s web=%s\n' "$API_PORT" "$WEB_PORT"
    exit 0
  fi
  sleep 0.5
done

tail -n 50 "$STATE_DIR/api.log" >&2 || true
tail -n 50 "$STATE_DIR/web.log" >&2 || true
exit 1

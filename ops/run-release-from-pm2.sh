#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:?Usage: run-release-from-pm2.sh RELEASE_ACTION}"
PM2_PROCESS_NAME="${BRICKY_PM2_PROCESS_NAME:-bricky-backend}"
PM2_PROCESS_ID="${BRICKY_PM2_PROCESS_ID:-}"
BACKEND_DIR="${BRICKY_BACKEND_DIR:-/var/www/Bricky-sprint3-release/backend}"

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
[[ -f "$BACKEND_DIR/scripts/sprint3-release.mjs" ]] || {
  echo "Release runner is missing in: $BACKEND_DIR" >&2
  exit 1
}

read_pm2_value() {
  local key="$1"
  pm2 env "$PM2_PROCESS_ID" | sed -n "s/^${key}: //p" | head -n 1
}

for key in DB_HOST DB_PORT DB_USER DB_PASS DB_NAME JWT_SECRET NODE_ENV TYPEORM_SYNCHRONIZE; do
  value="$(read_pm2_value "$key")"
  [[ -n "$value" ]] || {
    echo "Missing $key in PM2 process $PM2_PROCESS_ID" >&2
    exit 1
  }
  export "$key=$value"
done

cd "$BACKEND_DIR"
exec node scripts/sprint3-release.mjs "$ACTION"

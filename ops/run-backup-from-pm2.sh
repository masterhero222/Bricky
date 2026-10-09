#!/usr/bin/env bash
set -Eeuo pipefail

PM2_PROCESS_NAME="${BRICKY_PM2_PROCESS_NAME:-bricky-backend}"
PM2_PROCESS_ID="${BRICKY_PM2_PROCESS_ID:-}"
BACKUP_SCRIPT="${BRICKY_BACKUP_SCRIPT:-/usr/local/sbin/bricky-backup}"

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

export DB_HOST="$(read_pm2_value DB_HOST)"
export DB_PORT="$(read_pm2_value DB_PORT)"
export DB_USER="$(read_pm2_value DB_USER)"
export DB_PASS="$(read_pm2_value DB_PASS)"
export DB_NAME="$(read_pm2_value DB_NAME)"

for key in DB_HOST DB_PORT DB_USER DB_PASS DB_NAME; do
  [[ -n "${!key:-}" ]] || {
    echo "Missing $key in PM2 process $PM2_PROCESS_ID" >&2
    exit 1
  }
done

exec "$BACKUP_SCRIPT"

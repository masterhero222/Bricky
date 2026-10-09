#!/usr/bin/env bash
set -Eeuo pipefail

PM2_PROCESS_NAME="${BRICKY_PM2_PROCESS_NAME:-bricky-backend}"
PM2_PROCESS_ID="${BRICKY_PM2_PROCESS_ID:-}"
BACKUP_DIR="${1:?Usage: rehearse-migrations-from-backup.sh BACKUP_DIR [SOURCE_DIR]}"
SOURCE_DIR="${2:-/var/www/Bricky-sprint3-release/backend}"
REHEARSAL_DB="${BRICKY_REHEARSAL_DB:-bricky_sprint3_final_rehearsal}"

[[ "$REHEARSAL_DB" == bricky_sprint3_* ]] || {
  echo "Rehearsal database must start with bricky_sprint3_: $REHEARSAL_DB" >&2
  exit 1
}
[[ -f "$BACKUP_DIR/database.sql.gz" ]] || {
  echo "Database backup is missing: $BACKUP_DIR/database.sql.gz" >&2
  exit 1
}
[[ -f "$SOURCE_DIR/scripts/rehearse-sprint3-migrations.mjs" ]] || {
  echo "Migration runner is missing in: $SOURCE_DIR" >&2
  exit 1
}

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
export MYSQL_PWD="$DB_PASS"

for key in DB_HOST DB_PORT DB_USER DB_PASS; do
  [[ -n "${!key:-}" ]] || {
    echo "Missing $key in PM2 process $PM2_PROCESS_ID" >&2
    exit 1
  }
done

mysql_args=(--host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER")
cleanup() {
  mysql "${mysql_args[@]}" -e "DROP DATABASE IF EXISTS \`$REHEARSAL_DB\`" >/dev/null 2>&1 || true
}
trap cleanup EXIT

mysql "${mysql_args[@]}" -e \
  "DROP DATABASE IF EXISTS \`$REHEARSAL_DB\`; CREATE DATABASE \`$REHEARSAL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
gzip -dc "$BACKUP_DIR/database.sql.gz" | mysql "${mysql_args[@]}" "$REHEARSAL_DB"

(
  cd "$SOURCE_DIR"
  SPRINT3_REHEARSAL_DATABASE="$REHEARSAL_DB" \
    node scripts/rehearse-sprint3-migrations.mjs
)

printf 'migration_rehearsal=ok database=%s\n' "$REHEARSAL_DB"

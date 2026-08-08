#!/usr/bin/env bash
set -Eeuo pipefail

PM2_PROCESS_NAME="${BRICKY_PM2_PROCESS_NAME:-bricky-backend}"
PM2_PROCESS_ID="${BRICKY_PM2_PROCESS_ID:-}"
BACKUP_ROOT="${BRICKY_BACKUP_ROOT:-/var/backups/bricky}"
BACKUP_DIR="${1:-$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20????????T??????Z' | sort | tail -n 1)}"

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

[[ -d "$BACKUP_DIR" ]] || {
  echo "Backup directory is missing: $BACKUP_DIR" >&2
  exit 1
}

read_pm2_value() {
  local key="$1"
  pm2 env "$PM2_PROCESS_ID" | sed -n "s/^${key}: //p" | head -n 1
}

export MYSQL_PWD="$(read_pm2_value DB_PASS)"
db_host="$(read_pm2_value DB_HOST)"
db_port="$(read_pm2_value DB_PORT)"
db_user="$(read_pm2_value DB_USER)"
source_db="$(read_pm2_value DB_NAME)"

for value in "$MYSQL_PWD" "$db_host" "$db_port" "$db_user" "$source_db"; do
  [[ -n "$value" ]] || {
    echo "Incomplete database configuration in PM2 process $PM2_PROCESS_ID" >&2
    exit 1
  }
done

mysql_args=(--host="$db_host" --port="$db_port" --user="$db_user")
restore_db="bricky_restore_$(date -u +%Y%m%dT%H%M%S)_$$"
work_dir="$(mktemp -d /var/tmp/bricky-restore.XXXXXX)"

cleanup() {
  mysql "${mysql_args[@]}" -e "DROP DATABASE IF EXISTS \`$restore_db\`" >/dev/null 2>&1 || true
  rm -rf -- "$work_dir"
}
trap cleanup EXIT

(
  cd "$BACKUP_DIR"
  sha256sum --check SHA256SUMS
)
gzip -t "$BACKUP_DIR/database.sql.gz"
tar -tzf "$BACKUP_DIR/uploads.tar.gz" >/dev/null

mysql "${mysql_args[@]}" -e "CREATE DATABASE \`$restore_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
gzip -dc "$BACKUP_DIR/database.sql.gz" | mysql "${mysql_args[@]}" "$restore_db"
tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "$work_dir"

source_tables="$(mysql "${mysql_args[@]}" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$source_db'")"
restore_tables="$(mysql "${mysql_args[@]}" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$restore_db'")"
[[ "$restore_tables" -eq "$source_tables" ]] || {
  echo "Table count mismatch: source=$source_tables restore=$restore_tables" >&2
  exit 1
}

printf 'database_restore=ok tables=%s\n' "$restore_tables"
for table in users repair_requests request_applications media_assets notifications; do
  exists="$(mysql "${mysql_args[@]}" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$restore_db' AND table_name='$table'")"
  if [[ "$exists" -eq 1 ]]; then
    source_count="$(mysql "${mysql_args[@]}" -Nse "SELECT COUNT(*) FROM \`$source_db\`.\`$table\`")"
    restore_count="$(mysql "${mysql_args[@]}" -Nse "SELECT COUNT(*) FROM \`$restore_db\`.\`$table\`")"
    [[ "$restore_count" -eq "$source_count" ]] || {
      echo "$table count mismatch: source=$source_count restore=$restore_count" >&2
      exit 1
    }
    printf '%s=%s\n' "$table" "$restore_count"
  fi
done

upload_files="$(find "$work_dir" -type f | wc -l)"
printf 'uploads_restore=ok files=%s\n' "$upload_files"

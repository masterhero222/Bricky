#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_ROOT="${BRICKY_BACKUP_ROOT:-/var/backups/bricky}"
UPLOADS_DIR="${BRICKY_UPLOADS_DIR:-/var/www/Bricky-production-uploads}"
RETENTION_DAYS="${BRICKY_BACKUP_RETENTION_DAYS:-14}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-bricky}"

for command in mysqldump gzip tar sha256sum; do
  command -v "$command" >/dev/null || {
    echo "Missing required command: $command" >&2
    exit 1
  }
done
[[ -d "$UPLOADS_DIR" ]] || {
  echo "Uploads directory is missing: $UPLOADS_DIR" >&2
  exit 1
}

mkdir -p "$BACKUP_ROOT"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
working="$(mktemp -d "$BACKUP_ROOT/.${timestamp}.XXXXXX")"
final="$BACKUP_ROOT/$timestamp"
trap 'rm -rf -- "$working"' EXIT

mysql_args=(--host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER")
if [[ -n "${DB_PASS:-}" ]]; then
  export MYSQL_PWD="$DB_PASS"
fi

mysqldump "${mysql_args[@]}" --single-transaction --quick \
  --routines --triggers --events --set-gtid-purged=OFF "$DB_NAME" \
  >"$working/database.sql"
gzip -9 "$working/database.sql"

uploads_parent="$(dirname "$UPLOADS_DIR")"
uploads_name="$(basename "$UPLOADS_DIR")"
tar -C "$uploads_parent" -czf "$working/uploads.tar.gz" "$uploads_name"

gzip -t "$working/database.sql.gz"
tar -tzf "$working/uploads.tar.gz" >/dev/null
(
  cd "$working"
  sha256sum database.sql.gz uploads.tar.gz >SHA256SUMS
  sha256sum --check SHA256SUMS >/dev/null
)

cat >"$working/manifest.txt" <<EOF
created_at=$timestamp
database=$DB_NAME
database_host=$DB_HOST
uploads=$UPLOADS_DIR
hostname=$(hostname -f 2>/dev/null || hostname)
EOF

mv "$working" "$final"
trap - EXIT
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
  -name '20????????T??????Z' -mtime "+$RETENTION_DAYS" -exec rm -rf -- {} +
logger -t bricky-backup "completed path=$final"
printf '%s\n' "$final"

#!/usr/bin/env bash
set -euo pipefail

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-bricky_rehearsal}"

mysql_cmd=(mysql --protocol=TCP -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" "-p${MYSQL_PASSWORD}")

"${mysql_cmd[@]}" -e "DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`; CREATE DATABASE \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
"${mysql_cmd[@]}" "${MYSQL_DATABASE}" < scripts/migration-fixtures/sprint2-current-schema.sql

before_count="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM requests;")"
test "${before_count}" = "2"

"${mysql_cmd[@]}" "${MYSQL_DATABASE}" < scripts/migrations/20260705_001_sprint2_foundation_up.sql
"${mysql_cmd[@]}" "${MYSQL_DATABASE}" < scripts/migrations/20260705_002_moderation_gate_up.sql

tables_after_up="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name IN ('request_activities','request_calculations','request_events');")"
test "${tables_after_up}" = "3"

columns_after_up="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${MYSQL_DATABASE}' AND table_name='requests' AND column_name IN ('statusKey','addressVisibility','assignedAt','startedAt','canceledAt','updated_at');")"
test "${columns_after_up}" = "6"

status_mapping="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT GROUP_CONCAT(CONCAT(id, ':', statusKey) ORDER BY id SEPARATOR ',') FROM requests;")"
test "${status_mapping}" = "1:new,2:in_progress"

migration_count="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM bricky_schema_migrations WHERE version='20260705_001_sprint2_foundation';")"
test "${migration_count}" = "1"

"${mysql_cmd[@]}" "${MYSQL_DATABASE}" < scripts/migrations/20260705_001_sprint2_foundation_up.sql
second_up_count="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM bricky_schema_migrations WHERE version='20260705_001_sprint2_foundation';")"
test "${second_up_count}" = "1"

"${mysql_cmd[@]}" "${MYSQL_DATABASE}" < scripts/migrations/20260705_002_moderation_gate_up.sql
moderation_count="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM bricky_schema_migrations WHERE version='20260705_002_moderation_gate';")"
test "${moderation_count}" = "1"
moderation_tables="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name='admin_audit_logs';")"
test "${moderation_tables}" = "1"

"${mysql_cmd[@]}" "${MYSQL_DATABASE}" < scripts/migrations/20260705_002_moderation_gate_down.sql

"${mysql_cmd[@]}" "${MYSQL_DATABASE}" < scripts/migrations/20260705_001_sprint2_foundation_down.sql

tables_after_down="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name IN ('request_activities','request_calculations','request_events');")"
test "${tables_after_down}" = "0"

columns_after_down="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${MYSQL_DATABASE}' AND table_name='requests' AND column_name IN ('statusKey','addressVisibility','assignedAt','startedAt','canceledAt','updated_at');")"
test "${columns_after_down}" = "0"

after_count="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT COUNT(*) FROM requests;")"
test "${after_count}" = "${before_count}"

legacy_statuses="$("${mysql_cmd[@]}" -N -B "${MYSQL_DATABASE}" -e "SELECT GROUP_CONCAT(CONCAT(id, ':', status) ORDER BY id SEPARATOR ',') FROM requests;")"
test "${legacy_statuses}" = "1:нова,2:в процес"

echo "Sprint 2 MySQL migration rehearsal passed."

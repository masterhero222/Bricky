import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const version = "20260705_002_moderation_gate";
const up = readFileSync(new URL(`./migrations/${version}_up.sql`, import.meta.url), "utf8");
const down = readFileSync(new URL(`./migrations/${version}_down.sql`, import.meta.url), "utf8");
for (const table of ["requests", "request_images", "worker_gallery_images"]) {
  for (const column of ["moderationStatus", "moderationReason", "moderatedByUserId", "moderatedAt"]) {
    assert.ok(up.includes(`'${table}', '${column}'`), `Missing ${table}.${column}`);
  }
}
assert.ok(up.includes("admin_audit_logs"), "Missing audit log table");
assert.ok(up.includes("IF NOT EXISTS (SELECT 1 FROM bricky_schema_migrations"), "Backfill must run once only");
assert.ok(up.includes("DEFAULT ''pending_review''"), "New content must default to pending review");
assert.ok(down.includes("DROP TABLE IF EXISTS admin_audit_logs"), "Rollback must remove audit log table");
console.log(`Moderation migration ${version} verified.`);


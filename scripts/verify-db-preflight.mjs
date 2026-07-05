import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./db-sprint2-preflight.sql", import.meta.url), "utf8");
const executableSql = source
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .trim();

for (const statement of ["INSERT", "UPDATE", "DELETE", "ALTER", "DROP", "CREATE", "TRUNCATE", "REPLACE", "CALL"]) {
  assert.equal(
    new RegExp(`\\b${statement}\\b`, "i").test(executableSql),
    false,
    `Sprint 2 preflight must remain read-only; found ${statement}`
  );
}

for (const requiredTable of [
  "users",
  "worker",
  "requests",
  "request_applications",
  "request_images",
  "reviews",
  "notifications",
]) {
  assert.ok(executableSql.includes(requiredTable), `Preflight does not inspect ${requiredTable}`);
}

assert.ok(executableSql.includes("information_schema.columns"), "Preflight must inventory columns");
assert.ok(executableSql.includes("information_schema.statistics"), "Preflight must inventory indexes");
assert.ok(executableSql.includes("information_schema.key_column_usage"), "Preflight must inventory foreign keys");
assert.ok(executableSql.includes("duplicate_application"), "Preflight must detect duplicate applications");
assert.ok(executableSql.includes("request_image_without_request"), "Preflight must detect orphan request images");

console.log("Sprint 2 database preflight verified as read-only.");

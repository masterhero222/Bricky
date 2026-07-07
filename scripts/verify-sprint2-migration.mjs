import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const version = "20260705_001_sprint2_foundation";
const up = readFileSync(new URL(`./migrations/${version}_up.sql`, import.meta.url), "utf8");
const down = readFileSync(new URL(`./migrations/${version}_down.sql`, import.meta.url), "utf8");
const fixture = readFileSync(new URL("./migration-fixtures/sprint2-current-schema.sql", import.meta.url), "utf8");
const rehearsal = readFileSync(new URL("./rehearse-sprint2-migration.sh", import.meta.url), "utf8");

const stripComments = (source) => source.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, " ");
const upSql = stripComments(up);
const downSql = stripComments(down);

for (const source of [up, down, rehearsal]) {
  assert.ok(source.includes(version), `Migration artifact is missing version ${version}`);
}

for (const forbidden of [
  /\bDROP\s+TABLE\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\s+(users|worker|requests|reviews|notifications)\b/i,
  /\bDROP\s+COLUMN\b/i,
]) {
  assert.equal(forbidden.test(upSql), false, `UP migration contains destructive SQL: ${forbidden}`);
}

for (const table of ["request_activities", "request_calculations", "request_events"]) {
  assert.ok(upSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `UP migration does not create ${table}`);
  assert.ok(downSql.includes(`DROP TABLE IF EXISTS ${table}`), `DOWN migration does not remove ${table}`);
}

for (const column of ["statusKey", "addressVisibility", "assignedAt", "startedAt", "canceledAt", "updated_at"]) {
  assert.ok(up.includes(`'requests', '${column}'`), `UP migration does not add requests.${column}`);
  assert.ok(down.includes(`'requests', '${column}'`), `DOWN migration does not remove requests.${column}`);
}

for (const mapping of [
  ["нова", "new"],
  ["кандидатствана", "applied"],
  ["назначена", "assigned"],
  ["в процес", "in_progress"],
  ["завършена", "completed"],
  ["отказана", "canceled"],
]) {
  assert.ok(up.includes(`WHEN '${mapping[0]}' THEN '${mapping[1]}'`), `Missing status mapping ${mapping.join(" -> ")}`);
}

assert.ok(upSql.includes("FOREIGN KEY (requestId) REFERENCES requests(id)"), "New request tables require request FKs");
assert.ok(upSql.includes("FOREIGN KEY (actorUserId) REFERENCES users(id)"), "Request events require actor FK");
assert.ok(fixture.includes("Legacy new request"), "Rehearsal fixture is missing a new request");
assert.ok(fixture.includes("Legacy assigned request"), "Rehearsal fixture is missing an assigned request");
assert.ok(rehearsal.includes("second_up_count"), "Rehearsal must verify idempotent second UP run");
assert.ok(rehearsal.includes("after_count"), "Rehearsal must verify legacy row preservation after rollback");

console.log(`Sprint 2 migration ${version} verified.`);

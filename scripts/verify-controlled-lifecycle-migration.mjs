import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const version = '20260706_003_controlled_request_lifecycle';
const up = readFileSync(new URL(`./migrations/${version}_up.sql`, import.meta.url), 'utf8');
const down = readFileSync(new URL(`./migrations/${version}_down.sql`, import.meta.url), 'utf8');

assert.ok(!/MODIFY COLUMN status/i.test(up), 'Migration must not rewrite the legacy status enum');
assert.ok(up.includes('bricky_s2_003_add_column'), 'UP must use an idempotent column helper');
assert.ok(down.includes('bricky_s2_003_drop_column'), 'DOWN must use an idempotent column helper');
for (const column of ['workerArrivedAt', 'workStartedAt', 'workReadyAt', 'clientConfirmedAt', 'disputedAt', 'disputeReason']) {
  assert.ok(up.includes(`'requests', '${column}'`), `Missing requests.${column}`);
}
for (const column of ['thumbnailUrl', 'thumbnailStorageKey']) {
  assert.ok(up.includes(`'request_images', '${column}'`), `Missing request_images.${column}`);
}
assert.ok(up.includes(version), 'UP must record its migration version');
assert.ok(down.includes(version), 'DOWN must remove its migration version');
console.log(`Controlled lifecycle migration ${version} verified.`);

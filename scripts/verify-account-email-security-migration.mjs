import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const version = '20260709_004_account_email_security';
const up = readFileSync(new URL(`./migrations/${version}_up.sql`, import.meta.url), 'utf8');
const down = readFileSync(new URL(`./migrations/${version}_down.sql`, import.meta.url), 'utf8');

assert.ok(up.includes('bricky_s2_004_add_column'), 'UP must use an idempotent column helper');
assert.ok(up.includes('bricky_s2_004_add_index'), 'UP must use an idempotent index helper');
assert.ok(down.includes('bricky_s2_004_drop_column'), 'DOWN must use an idempotent column helper');
assert.ok(down.includes('bricky_s2_004_drop_index'), 'DOWN must use an idempotent index helper');

for (const column of [
  'emailVerifiedAt',
  'emailVerificationRequired',
  'tokenVersion',
  'passwordChangedAt',
  'newsOptIn',
  'newsOptInAt',
  'newsOptInSource',
  'newsUnsubscribedAt',
]) {
  assert.ok(up.includes(`'users', '${column}'`), `Missing users.${column}`);
  assert.ok(down.includes(`'users', '${column}'`), `Rollback missing users.${column}`);
}

for (const table of ['account_tokens', 'email_delivery_logs']) {
  assert.ok(up.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Missing ${table} table`);
  assert.ok(down.includes(`DROP TABLE IF EXISTS ${table}`), `Rollback missing ${table} drop`);
}

assert.ok(up.includes('UNIQUE KEY uq_account_tokens_token_hash'), 'Token hashes must be unique');
assert.ok(up.includes('FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE'), 'Account tokens must cascade with users');
assert.ok(up.includes('FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL'), 'Email logs must preserve rows when users are removed');
assert.ok(up.includes("WHERE role = 'admin'"), 'Admin accounts must be marked verified during migration');
assert.ok(up.includes(version), 'UP must record its migration version');
assert.ok(down.includes(version), 'DOWN must remove its migration version');
assert.ok(!/MAIL_PASS|SMTP_PASS|password reset token value/i.test(up), 'Migration must not contain secrets or raw token values');

console.log(`Account email security migration ${version} verified.`);

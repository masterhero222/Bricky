import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const migrationDir = resolve(scriptDir, '../migrations');

export const migrationNames = [
  '20260718_sprint3_v2_data_core.sql',
  '20260719_sprint3_v2_schema_alignment.sql',
  '20260808_account_profile_settings.sql',
  '20260808_password_reset_tokens.sql',
  '20260808_email_verification.sql',
  '20260808_content_reports.sql',
  '20260811_media_display_order.sql',
  '20260825_worker_onboarding_profile_guidance.sql',
];

export const migrations = migrationNames.map((name) => ({
  name,
  sql: readFileSync(resolve(migrationDir, name), 'utf8'),
}));

const expectedTables = [
  'users',
  'client_profiles',
  'worker_profiles',
  'worker_skills',
  'repair_requests',
  'request_pricing_snapshots',
  'repair_request_events',
  'media_assets',
  'repair_categories',
  'repair_activities',
  'pricing_rules',
  'repair_request_applications',
  'repair_request_reviews',
  'user_notifications',
  'admin_action_audit_logs',
  'worker_plans',
  'worker_credit_wallets',
  'worker_credit_transactions',
  'referrals',
  'referral_qualifications',
  'referral_rewards',
  'password_reset_tokens',
  'email_verification_tokens',
  'content_reports',
];

const expectedIndexes = [
  ['repair_requests', 'idx_repair_requests_status_created'],
  ['repair_requests', 'idx_repair_requests_category_status'],
  ['repair_requests', 'idx_repair_requests_archived'],
  ['repair_request_applications', 'uq_repair_request_application'],
  ['repair_request_reviews', 'uq_repair_request_review_client'],
  ['media_assets', 'idx_media_moderation'],
  ['media_assets', 'idx_media_display_order'],
  ['worker_profiles', 'idx_worker_profiles_approval'],
  ['pricing_rules', 'uq_pricing_rule'],
  ['referrals', 'uq_referrals_code'],
  ['worker_plans', 'uq_worker_plan_worker'],
  ['worker_credit_wallets', 'uq_worker_credit_wallet'],
  ['email_verification_tokens', 'uq_email_verification_token_hash'],
  ['content_reports', 'idx_content_reports_status'],
];

const expectedChecks = [
  ['worker_credit_wallets', 'chk_worker_credit_wallet_balance'],
  ['worker_credit_transactions', 'chk_worker_credit_transaction_amount'],
];

const expectedWorkerProfileColumns = [
  'primary_category_key',
  'preferred_contact_method',
  'contact_accuracy_confirmed',
  'work_type',
  'experience_range',
  'availability_status',
  'acquisition_source_self_reported',
  'acquisition_source_detail',
  'project_photos_readiness',
  'service_description_readiness',
  'onboarding_step',
  'onboarding_completed_at',
];

const expectedForeignKeys = new Set(
  migrations[0].sql
    .match(/CONSTRAINT\s+([a-zA-Z0-9_]+)\s+FOREIGN KEY/g)
    ?.map((entry) =>
      entry.replace(/^CONSTRAINT\s+/, '').replace(/\s+FOREIGN KEY$/, ''),
    ) || [],
);

export async function validateSprint3Schema(connection, database) {
  const [tableRows] = await connection.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  const tables = new Set(
    tableRows.map((row) => row.TABLE_NAME || row.table_name),
  );
  const missingTables = expectedTables.filter((table) => !tables.has(table));

  const [indexRows] = await connection.query(
    'SELECT DISTINCT table_name, index_name FROM information_schema.statistics WHERE table_schema = DATABASE()',
  );
  const indexes = new Set(
    indexRows.map(
      (row) =>
        `${row.TABLE_NAME || row.table_name}.${row.INDEX_NAME || row.index_name}`,
    ),
  );
  const missingIndexes = expectedIndexes
    .filter(([table, index]) => !indexes.has(`${table}.${index}`))
    .map(([table, index]) => `${table}.${index}`);

  const [foreignKeyRows] = await connection.query(
    'SELECT constraint_name FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()',
  );
  const foreignKeys = new Set(
    foreignKeyRows.map((row) => row.CONSTRAINT_NAME || row.constraint_name),
  );
  const missingForeignKeys = [...expectedForeignKeys].filter(
    (constraint) => !foreignKeys.has(constraint),
  );
  const [checkRows] = await connection.query(
    `SELECT table_name, constraint_name
       FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND constraint_type = 'CHECK'`,
  );
  const checks = new Set(
    checkRows.map(
      (row) =>
        `${row.TABLE_NAME || row.table_name}.${row.CONSTRAINT_NAME || row.constraint_name}`,
    ),
  );
  const missingChecks = expectedChecks
    .filter(([table, constraint]) => !checks.has(`${table}.${constraint}`))
    .map(([table, constraint]) => `${table}.${constraint}`);

  const [[statusColumn]] = await connection.query(
    `SELECT column_type, column_default
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'repair_requests'
        AND column_name = 'status'`,
  );
  const [categoryRows] = await connection.query(
    'SELECT category_key FROM repair_categories ORDER BY sort_order',
  );
  const [workerProfileColumnRows] = await connection.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'worker_profiles'`,
  );
  const workerProfileColumns = new Set(
    workerProfileColumnRows.map((row) => row.COLUMN_NAME || row.column_name),
  );
  const missingWorkerProfileColumns = expectedWorkerProfileColumns.filter(
    (column) => !workerProfileColumns.has(column),
  );

  const result = {
    database,
    tables: tables.size,
    foreignKeys: foreignKeys.size,
    indexes: indexes.size,
    seededCategories: categoryRows.length,
    requestStatusType: statusColumn?.COLUMN_TYPE || statusColumn?.column_type,
    requestStatusDefault:
      statusColumn?.COLUMN_DEFAULT || statusColumn?.column_default,
    missingTables,
    missingIndexes,
    missingForeignKeys,
    missingChecks,
    missingWorkerProfileColumns,
  };

  if (
    missingTables.length ||
    missingIndexes.length ||
    missingForeignKeys.length ||
    missingChecks.length ||
    missingWorkerProfileColumns.length ||
    categoryRows.length !== 15 ||
    result.requestStatusDefault !== 'pending_admin'
  ) {
    throw new Error(
      `Sprint 3 schema validation failed:\n${JSON.stringify(result, null, 2)}`,
    );
  }

  return result;
}

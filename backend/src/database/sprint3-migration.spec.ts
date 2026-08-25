import { readFileSync } from 'fs';
import { resolve } from 'path';

const readMigration = (name: string) =>
  readFileSync(resolve(__dirname, '../../migrations', name), 'utf8');

describe('Sprint 3 SQL migrations', () => {
  const core = readMigration('20260718_sprint3_v2_data_core.sql');
  const alignment = readMigration('20260719_sprint3_v2_schema_alignment.sql');
  const accountSettings = readMigration(
    '20260808_account_profile_settings.sql',
  );
  const passwordReset = readMigration('20260808_password_reset_tokens.sql');
  const emailVerification = readMigration('20260808_email_verification.sql');
  const contentReports = readMigration('20260808_content_reports.sql');
  const mediaDisplayOrder = readMigration('20260811_media_display_order.sql');
  const workerOnboarding = readMigration(
    '20260825_worker_onboarding_profile_guidance.sql',
  );
  const integrityVerifier = readFileSync(
    resolve(__dirname, '../../scripts/verify-sprint3-integrity.mjs'),
    'utf8',
  );

  it('creates the canonical users table before altering it', () => {
    const createUsersAt = core.indexOf('CREATE TABLE IF NOT EXISTS users');
    const alterUsersAt = core.indexOf('ALTER TABLE users');

    expect(createUsersAt).toBeGreaterThanOrEqual(0);
    expect(alterUsersAt).toBeGreaterThan(createUsersAt);
  });

  it.each([
    'pending_admin',
    'worker_selected',
    'worker_confirmed',
    'worker_on_site',
    'inspected',
    'work_finished',
    'ready_for_client_confirmation',
    'client_confirmed',
    'reviewed',
  ])('supports the %s request lifecycle state', (status) => {
    expect(core).toContain(`'${status}'`);
    expect(alignment).toContain(`'${status}'`);
  });

  it('defaults new requests to admin moderation', () => {
    expect(core).toContain("NOT NULL DEFAULT 'pending_admin'");
    expect(alignment).toContain("NOT NULL DEFAULT 'pending_admin'");
  });

  it('keeps the v2 request timeline separate from legacy request_events', () => {
    const sql = `${core}\n${alignment}`;

    expect(core).toContain('CREATE TABLE IF NOT EXISTS repair_request_events');
    expect(alignment).toContain('ALTER TABLE repair_request_events');
    expect(sql).not.toMatch(
      /(?:CREATE|ALTER) TABLE (?:IF NOT EXISTS )?request_events\b/,
    );
  });

  it.each([
    ['request_applications', 'repair_request_applications'],
    ['reviews', 'repair_request_reviews'],
    ['notifications', 'user_notifications'],
    ['admin_audit_logs', 'admin_action_audit_logs'],
  ])('keeps v2 %s data in the separate %s table', (legacy, canonical) => {
    const sql = `${core}\n${alignment}`;

    expect(core).toContain(`CREATE TABLE IF NOT EXISTS ${canonical}`);
    expect(sql).not.toMatch(
      new RegExp(`(?:CREATE|ALTER) TABLE (?:IF NOT EXISTS )?${legacy}\\b`),
    );
  });

  it('checks v2 application and review uniqueness in release verification', () => {
    expect(integrityVerifier).toContain('FROM repair_request_applications');
    expect(integrityVerifier).toContain('FROM repair_request_reviews');
    expect(integrityVerifier).not.toMatch(/\bFROM request_applications\b/);
    expect(integrityVerifier).not.toMatch(/\bFROM reviews\b/);
  });

  it.each([
    'client_confirmed_at',
    'archived_at',
    'archive_reason',
    'archive_source',
    'archived_by_user_id',
  ])('contains request archive metadata column %s', (column) => {
    expect(core).toContain(column);
    expect(alignment).toContain(column);
  });

  it('uses the entity column names for catalog activation', () => {
    expect(core).toContain('is_active tinyint(1) NOT NULL DEFAULT 1');
    expect(core).toContain(
      'INSERT INTO repair_categories (category_key, label, is_active, sort_order)',
    );
    expect(alignment).toContain(
      'ADD COLUMN is_active tinyint(1) NOT NULL DEFAULT 1',
    );
  });

  it.each([
    ['core', core],
    ['alignment', alignment],
  ])(
    'guards the %s category seed against the required legacy category_group column',
    (_name, migration) => {
      const guardAt = migration.indexOf(
        'ALTER TABLE repair_categories ALTER COLUMN category_group SET DEFAULT',
      );
      const seedAt = migration.indexOf(
        'INSERT INTO repair_categories (category_key, label, is_active, sort_order)',
      );

      expect(migration).toContain("column_name = 'category_group'");
      expect(guardAt).toBeGreaterThanOrEqual(0);
      expect(seedAt).toBeGreaterThan(guardAt);
    },
  );

  it('adds the worker profile banner used by the public profile editor', () => {
    expect(core).toContain('profile_banner_key varchar(64)');
    expect(alignment).toContain('ADD COLUMN profile_banner_key varchar(64)');
  });

  it('adds private worker contact fields without exposing them in the public profile schema', () => {
    expect(accountSettings).toContain('phone_private varchar(40) NULL');
    expect(accountSettings).toContain('default_address varchar(255) NULL');
    expect(accountSettings).toContain('information_schema.columns');
  });

  it('stores only hashed, expiring and single-use password reset tokens', () => {
    expect(passwordReset).toContain('password_reset_tokens');
    expect(passwordReset).toContain('token_hash char(64)');
    expect(passwordReset).toContain('expires_at datetime NOT NULL');
    expect(passwordReset).toContain('consumed_at datetime NULL');
    expect(passwordReset).toContain('auth_version int NOT NULL DEFAULT 0');
    expect(passwordReset).toContain('information_schema.columns');
    expect(passwordReset).not.toMatch(/\btoken\s+varchar/i);
  });

  it('stores only hashed, expiring and single-use email verification tokens', () => {
    expect(emailVerification).toContain('email_verification_tokens');
    expect(emailVerification).toContain('token_hash CHAR(64)');
    expect(emailVerification).toContain('expires_at DATETIME NOT NULL');
    expect(emailVerification).toContain('consumed_at DATETIME NULL');
    expect(emailVerification).toContain('information_schema.columns');
    expect(emailVerification).not.toMatch(/\btoken\s+varchar/i);
  });

  it('trusts legacy email addresses only when the verification column is first added', () => {
    expect(emailVerification).toContain('@email_verified_at_exists');
    expect(emailVerification).toContain(
      'UPDATE users SET email_verified_at = COALESCE(created_at, NOW())',
    );
    expect(emailVerification).toMatch(
      /IF\(\s*@email_verified_at_exists,\s*'SELECT 1'/,
    );
  });

  it('adds traceable content reports without polymorphic destructive cascades', () => {
    expect(contentReports).toContain(
      'CREATE TABLE IF NOT EXISTS content_reports',
    );
    expect(contentReports).toContain('reporter_user_id INT NOT NULL');
    expect(contentReports).toContain('resolved_by_user_id INT NULL');
    expect(contentReports).toContain('ON DELETE RESTRICT');
    expect(contentReports).toContain('ON DELETE SET NULL');
  });

  it('adds persistent portfolio media ordering idempotently', () => {
    expect(mediaDisplayOrder).toContain("column_name = 'display_order'");
    expect(mediaDisplayOrder).toContain('ADD COLUMN display_order int NULL');
    expect(mediaDisplayOrder).toContain('idx_media_display_order');
  });

  it('adds the worker onboarding fields idempotently', () => {
    expect(workerOnboarding).toContain('primary_category_key');
    expect(workerOnboarding).toContain('contact_accuracy_confirmed');
    expect(workerOnboarding).toContain('onboarding_completed_at');
    expect(workerOnboarding).toContain('information_schema.columns');
    expect(workerOnboarding).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });

  it.each([
    'moderationStatus',
    'moderationReason',
    'moderatedByUserId',
    'moderatedAt',
  ])('aligns review moderation column %s with the entity', (column) => {
    expect(core).toContain(column);
    expect(alignment).toContain(`ADD COLUMN ${column}`);
  });

  it('uses MySQL-compatible idempotent column guards', () => {
    const sql = `${core}\n${alignment}\n${accountSettings}\n${passwordReset}\n${emailVerification}\n${contentReports}`;

    expect(sql).not.toMatch(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i);
    expect(sql).toContain('information_schema.columns');
    expect(sql).toContain("IF(@users_columns = '', 'SELECT 1'");
    expect(sql).toMatch(/IF\(\s*@repair_request_columns\s*=\s*''/);
  });

  it('contains feed and archive indexes', () => {
    expect(core).toContain('idx_repair_requests_status_created');
    expect(core).toContain('idx_repair_requests_category_status');
    expect(core).toContain('idx_repair_requests_archived');
    expect(alignment).toContain('idx_repair_requests_status_created');
    expect(alignment).toContain('idx_repair_requests_category_status');
    expect(alignment).toContain('idx_repair_requests_archived');
  });

  it('aligns the pricing rule uniqueness contract for legacy schemas', () => {
    expect(core).toContain(
      'UNIQUE KEY uq_pricing_rule (category_key, activity_key, version)',
    );
    expect(alignment).toContain(
      'ADD UNIQUE INDEX uq_pricing_rule (category_key, activity_key, version)',
    );
  });

  it('does not contain destructive schema or data operations', () => {
    const sql = `${core}\n${alignment}\n${accountSettings}\n${passwordReset}\n${emailVerification}\n${contentReports}`;

    expect(sql).not.toMatch(/\bDROP\s+(TABLE|DATABASE)\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

-- Bricky account email security foundation (UP).
-- Version: 20260709_004_account_email_security
-- Additive and idempotent. Does not delete users or production data.

CREATE TABLE IF NOT EXISTS bricky_schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //
DROP PROCEDURE IF EXISTS bricky_s2_004_add_column//
CREATE PROCEDURE bricky_s2_004_add_column(IN table_in VARCHAR(64), IN column_in VARCHAR(64), IN ddl_in TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = table_in AND column_name = column_in
  ) THEN
    SET @ddl = ddl_in;
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//

DROP PROCEDURE IF EXISTS bricky_s2_004_add_index//
CREATE PROCEDURE bricky_s2_004_add_index(IN table_in VARCHAR(64), IN index_in VARCHAR(64), IN ddl_in TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = table_in AND index_name = index_in
  ) THEN
    SET @ddl = ddl_in;
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//
DELIMITER ;

CALL bricky_s2_004_add_column('users', 'emailVerifiedAt',
  'ALTER TABLE users ADD COLUMN emailVerifiedAt DATETIME NULL AFTER accountStatus');
CALL bricky_s2_004_add_column('users', 'emailVerificationRequired',
  'ALTER TABLE users ADD COLUMN emailVerificationRequired TINYINT(1) NOT NULL DEFAULT 1 AFTER emailVerifiedAt');
CALL bricky_s2_004_add_column('users', 'tokenVersion',
  'ALTER TABLE users ADD COLUMN tokenVersion INT NOT NULL DEFAULT 0 AFTER emailVerificationRequired');
CALL bricky_s2_004_add_column('users', 'passwordChangedAt',
  'ALTER TABLE users ADD COLUMN passwordChangedAt DATETIME NULL AFTER tokenVersion');
CALL bricky_s2_004_add_column('users', 'newsOptIn',
  'ALTER TABLE users ADD COLUMN newsOptIn TINYINT(1) NOT NULL DEFAULT 0 AFTER passwordChangedAt');
CALL bricky_s2_004_add_column('users', 'newsOptInAt',
  'ALTER TABLE users ADD COLUMN newsOptInAt DATETIME NULL AFTER newsOptIn');
CALL bricky_s2_004_add_column('users', 'newsOptInSource',
  'ALTER TABLE users ADD COLUMN newsOptInSource VARCHAR(100) NULL AFTER newsOptInAt');
CALL bricky_s2_004_add_column('users', 'newsUnsubscribedAt',
  'ALTER TABLE users ADD COLUMN newsUnsubscribedAt DATETIME NULL AFTER newsOptInSource');

CREATE TABLE IF NOT EXISTS account_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  tokenHash CHAR(64) NOT NULL,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  createdIp VARCHAR(45) NULL,
  userAgent VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_account_tokens_token_hash (tokenHash),
  KEY idx_account_tokens_user_type (userId, type),
  KEY idx_account_tokens_expires_at (expiresAt),
  CONSTRAINT fk_account_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NULL,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(80) NOT NULL,
  provider VARCHAR(80) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  providerMessageId VARCHAR(255) NULL,
  errorCode VARCHAR(100) NULL,
  errorMessage TEXT NULL,
  attemptCount INT NOT NULL DEFAULT 0,
  lastAttemptAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_email_delivery_logs_user_type (userId, type),
  KEY idx_email_delivery_logs_email_type (email, type),
  KEY idx_email_delivery_logs_status (status),
  CONSTRAINT fk_email_delivery_logs_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL bricky_s2_004_add_index('users', 'idx_users_email_verified_at',
  'CREATE INDEX idx_users_email_verified_at ON users (emailVerifiedAt)');
CALL bricky_s2_004_add_index('users', 'idx_users_token_version',
  'CREATE INDEX idx_users_token_version ON users (tokenVersion)');

UPDATE users
SET emailVerifiedAt = COALESCE(emailVerifiedAt, NOW()),
    emailVerificationRequired = 0
WHERE role = 'admin';

INSERT INTO bricky_schema_migrations (version, description)
VALUES ('20260709_004_account_email_security', 'Add account email verification, token, and email delivery foundations')
ON DUPLICATE KEY UPDATE description = VALUES(description);

DROP PROCEDURE IF EXISTS bricky_s2_004_add_index;
DROP PROCEDURE IF EXISTS bricky_s2_004_add_column;

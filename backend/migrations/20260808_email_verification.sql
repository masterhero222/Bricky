-- Final sprint: additive email verification. Existing accounts are trusted.

SET @email_verified_at_exists = EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email_verified_at'
);

SET @add_verified_at = IF(
  @email_verified_at_exists,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER auth_version'
);
PREPARE stmt FROM @add_verified_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @backfill_verified_at = IF(
  @email_verified_at_exists,
  'SELECT 1',
  'UPDATE users SET email_verified_at = COALESCE(created_at, NOW()) WHERE email_verified_at IS NULL'
);
PREPARE stmt FROM @backfill_verified_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verification_token_hash (token_hash),
  KEY idx_email_verification_user_active (user_id, consumed_at, expires_at),
  CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

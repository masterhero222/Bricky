SET @auth_version_column = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'auth_version'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN auth_version int NOT NULL DEFAULT 0'
);
PREPARE password_auth_stmt FROM @auth_version_column;
EXECUTE password_auth_stmt;
DEALLOCATE PREPARE password_auth_stmt;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  token_hash char(64) NOT NULL,
  expires_at datetime NOT NULL,
  consumed_at datetime NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_user_active (user_id, consumed_at, expires_at),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

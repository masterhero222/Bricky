-- Bricky account email security foundation (DOWN).
-- Idempotent. Drops only objects created by 20260709_004_account_email_security.

DELIMITER //
DROP PROCEDURE IF EXISTS bricky_s2_004_drop_index//
CREATE PROCEDURE bricky_s2_004_drop_index(IN table_in VARCHAR(64), IN index_in VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = table_in AND index_name = index_in
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_in, '` DROP INDEX `', index_in, '`');
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//

DROP PROCEDURE IF EXISTS bricky_s2_004_drop_column//
CREATE PROCEDURE bricky_s2_004_drop_column(IN table_in VARCHAR(64), IN column_in VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = table_in AND column_name = column_in
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_in, '` DROP COLUMN `', column_in, '`');
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//
DELIMITER ;

CALL bricky_s2_004_drop_index('users', 'idx_users_token_version');
CALL bricky_s2_004_drop_index('users', 'idx_users_email_verified_at');

DROP TABLE IF EXISTS email_delivery_logs;
DROP TABLE IF EXISTS account_tokens;

CALL bricky_s2_004_drop_column('users', 'newsUnsubscribedAt');
CALL bricky_s2_004_drop_column('users', 'newsOptInSource');
CALL bricky_s2_004_drop_column('users', 'newsOptInAt');
CALL bricky_s2_004_drop_column('users', 'newsOptIn');
CALL bricky_s2_004_drop_column('users', 'passwordChangedAt');
CALL bricky_s2_004_drop_column('users', 'tokenVersion');
CALL bricky_s2_004_drop_column('users', 'emailVerificationRequired');
CALL bricky_s2_004_drop_column('users', 'emailVerifiedAt');

DELETE FROM bricky_schema_migrations WHERE version = '20260709_004_account_email_security';

DROP PROCEDURE IF EXISTS bricky_s2_004_drop_column;
DROP PROCEDURE IF EXISTS bricky_s2_004_drop_index;

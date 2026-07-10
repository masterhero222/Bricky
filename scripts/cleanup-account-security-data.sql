-- Bricky account-security retention cleanup.
--
-- Run only after taking a database backup.
-- This script removes old operational security data only:
--   - expired account tokens older than @token_retention_days;
--   - used account tokens older than @token_retention_days;
--   - email delivery logs older than @email_log_retention_days.
--
-- It does not modify users, requests, media, reviews, admin records, or production content.

SET @token_retention_days = 30;
SET @email_log_retention_days = 180;

SET @token_cutoff = DATE_SUB(NOW(), INTERVAL @token_retention_days DAY);
SET @email_log_cutoff = DATE_SUB(NOW(), INTERVAL @email_log_retention_days DAY);

START TRANSACTION;

DELETE FROM account_tokens
WHERE expiresAt < @token_cutoff;

DELETE FROM account_tokens
WHERE usedAt IS NOT NULL
  AND usedAt < @token_cutoff;

DELETE FROM email_delivery_logs
WHERE createdAt < @email_log_cutoff;

COMMIT;

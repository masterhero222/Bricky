-- Bricky Sprint 2 controlled lifecycle and media derivatives (UP).
-- Version: 20260706_003_controlled_request_lifecycle
-- Additive and idempotent. Legacy request.status is not modified.

CREATE TABLE IF NOT EXISTS bricky_schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //
DROP PROCEDURE IF EXISTS bricky_s2_003_add_column//
CREATE PROCEDURE bricky_s2_003_add_column(IN table_in VARCHAR(64), IN column_in VARCHAR(64), IN ddl_in TEXT)
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
DELIMITER ;

CALL bricky_s2_003_add_column('requests', 'statusKey',
  'ALTER TABLE requests ADD COLUMN statusKey VARCHAR(32) NULL AFTER status');
CALL bricky_s2_003_add_column('requests', 'workerArrivedAt',
  'ALTER TABLE requests ADD COLUMN workerArrivedAt DATETIME NULL AFTER statusKey');
CALL bricky_s2_003_add_column('requests', 'workStartedAt',
  'ALTER TABLE requests ADD COLUMN workStartedAt DATETIME NULL AFTER workerArrivedAt');
CALL bricky_s2_003_add_column('requests', 'workReadyAt',
  'ALTER TABLE requests ADD COLUMN workReadyAt DATETIME NULL AFTER workStartedAt');
CALL bricky_s2_003_add_column('requests', 'clientConfirmedAt',
  'ALTER TABLE requests ADD COLUMN clientConfirmedAt DATETIME NULL AFTER workReadyAt');
CALL bricky_s2_003_add_column('requests', 'disputedAt',
  'ALTER TABLE requests ADD COLUMN disputedAt DATETIME NULL AFTER clientConfirmedAt');
CALL bricky_s2_003_add_column('requests', 'disputeReason',
  'ALTER TABLE requests ADD COLUMN disputeReason TEXT NULL AFTER disputedAt');

CALL bricky_s2_003_add_column('request_images', 'thumbnailUrl',
  'ALTER TABLE request_images ADD COLUMN thumbnailUrl LONGTEXT NULL AFTER url');
CALL bricky_s2_003_add_column('request_images', 'thumbnailStorageKey',
  'ALTER TABLE request_images ADD COLUMN thumbnailStorageKey VARCHAR(255) NULL AFTER storageKey');
CALL bricky_s2_003_add_column('worker_gallery_images', 'thumbnailUrl',
  'ALTER TABLE worker_gallery_images ADD COLUMN thumbnailUrl VARCHAR(255) NULL AFTER url');
CALL bricky_s2_003_add_column('worker_gallery_images', 'storageKey',
  'ALTER TABLE worker_gallery_images ADD COLUMN storageKey VARCHAR(255) NULL AFTER thumbnailUrl');
CALL bricky_s2_003_add_column('worker_gallery_images', 'thumbnailStorageKey',
  'ALTER TABLE worker_gallery_images ADD COLUMN thumbnailStorageKey VARCHAR(255) NULL AFTER storageKey');
CALL bricky_s2_003_add_column('worker', 'avatarThumbnailUrl',
  'ALTER TABLE worker ADD COLUMN avatarThumbnailUrl VARCHAR(255) NULL AFTER avatarUrl');

UPDATE requests
SET statusKey = CASE LOWER(TRIM(status))
  WHEN 'нова' THEN 'approved'
  WHEN 'кандидатствана' THEN 'approved'
  WHEN 'назначена' THEN 'assigned'
  WHEN 'в процес' THEN 'in_progress'
  WHEN 'завършена' THEN 'completed'
  WHEN 'отказана' THEN 'canceled'
  ELSE 'approved'
END
WHERE statusKey IS NULL OR statusKey = '' OR statusKey IN ('new', 'applied');

INSERT INTO bricky_schema_migrations (version, description)
VALUES ('20260706_003_controlled_request_lifecycle', 'Add controlled request lifecycle timestamps and media thumbnails')
ON DUPLICATE KEY UPDATE description = VALUES(description);

DROP PROCEDURE IF EXISTS bricky_s2_003_add_column;

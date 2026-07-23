-- Bricky Sprint 2 controlled lifecycle and media derivatives (DOWN).
-- Idempotent. It does not alter legacy request.status or delete rows.

DELIMITER //
DROP PROCEDURE IF EXISTS bricky_s2_003_drop_column//
CREATE PROCEDURE bricky_s2_003_drop_column(IN table_in VARCHAR(64), IN column_in VARCHAR(64))
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

CALL bricky_s2_003_drop_column('request_images', 'thumbnailStorageKey');
CALL bricky_s2_003_drop_column('request_images', 'thumbnailUrl');
CALL bricky_s2_003_drop_column('worker_gallery_images', 'thumbnailStorageKey');
CALL bricky_s2_003_drop_column('worker_gallery_images', 'storageKey');
CALL bricky_s2_003_drop_column('worker_gallery_images', 'thumbnailUrl');
CALL bricky_s2_003_drop_column('worker', 'avatarThumbnailUrl');
CALL bricky_s2_003_drop_column('requests', 'disputeReason');
CALL bricky_s2_003_drop_column('requests', 'disputedAt');
CALL bricky_s2_003_drop_column('requests', 'clientConfirmedAt');
CALL bricky_s2_003_drop_column('requests', 'workReadyAt');
CALL bricky_s2_003_drop_column('requests', 'workStartedAt');
CALL bricky_s2_003_drop_column('requests', 'workerArrivedAt');

DELETE FROM bricky_schema_migrations WHERE version = '20260706_003_controlled_request_lifecycle';
DROP PROCEDURE IF EXISTS bricky_s2_003_drop_column;

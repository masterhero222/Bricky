-- Sprint 2 moderation gate. Existing rows are approved; new rows default to pending review.
DELIMITER //
DROP PROCEDURE IF EXISTS bricky_moderation_add_column//
CREATE PROCEDURE bricky_moderation_add_column(IN table_in VARCHAR(64), IN column_in VARCHAR(64), IN ddl_in TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = table_in AND column_name = column_in) THEN
    SET @ddl = ddl_in; PREPARE statement FROM @ddl; EXECUTE statement; DEALLOCATE PREPARE statement;
  END IF;
END//
DELIMITER ;
CALL bricky_moderation_add_column('requests', 'moderationStatus', 'ALTER TABLE requests ADD COLUMN moderationStatus VARCHAR(30) NOT NULL DEFAULT ''pending_review''');
CALL bricky_moderation_add_column('requests', 'moderationReason', 'ALTER TABLE requests ADD COLUMN moderationReason TEXT NULL');
CALL bricky_moderation_add_column('requests', 'moderatedByUserId', 'ALTER TABLE requests ADD COLUMN moderatedByUserId INT NULL');
CALL bricky_moderation_add_column('requests', 'moderatedAt', 'ALTER TABLE requests ADD COLUMN moderatedAt DATETIME NULL');
CALL bricky_moderation_add_column('request_images', 'moderationStatus', 'ALTER TABLE request_images ADD COLUMN moderationStatus VARCHAR(30) NOT NULL DEFAULT ''pending_review''');
CALL bricky_moderation_add_column('request_images', 'moderationReason', 'ALTER TABLE request_images ADD COLUMN moderationReason TEXT NULL');
CALL bricky_moderation_add_column('request_images', 'moderatedByUserId', 'ALTER TABLE request_images ADD COLUMN moderatedByUserId INT NULL');
CALL bricky_moderation_add_column('request_images', 'moderatedAt', 'ALTER TABLE request_images ADD COLUMN moderatedAt DATETIME NULL');
CALL bricky_moderation_add_column('worker_gallery_images', 'moderationStatus', 'ALTER TABLE worker_gallery_images ADD COLUMN moderationStatus VARCHAR(30) NOT NULL DEFAULT ''pending_review''');
CALL bricky_moderation_add_column('worker_gallery_images', 'moderationReason', 'ALTER TABLE worker_gallery_images ADD COLUMN moderationReason TEXT NULL');
CALL bricky_moderation_add_column('worker_gallery_images', 'moderatedByUserId', 'ALTER TABLE worker_gallery_images ADD COLUMN moderatedByUserId INT NULL');
CALL bricky_moderation_add_column('worker_gallery_images', 'moderatedAt', 'ALTER TABLE worker_gallery_images ADD COLUMN moderatedAt DATETIME NULL');
DELIMITER //
DROP PROCEDURE IF EXISTS bricky_moderation_backfill//
CREATE PROCEDURE bricky_moderation_backfill()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bricky_schema_migrations WHERE version = '20260705_002_moderation_gate') THEN
    UPDATE requests SET moderationStatus = 'approved', moderatedAt = COALESCE(moderatedAt, NOW()) WHERE moderationStatus = 'pending_review';
    UPDATE request_images SET moderationStatus = 'approved', isApproved = 1, moderatedAt = COALESCE(moderatedAt, NOW()) WHERE moderationStatus = 'pending_review';
    UPDATE worker_gallery_images SET moderationStatus = 'approved', moderatedAt = COALESCE(moderatedAt, NOW()) WHERE moderationStatus = 'pending_review';
  END IF;
END//
DELIMITER ;
CALL bricky_moderation_backfill();
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, adminUserId INT NOT NULL, entityType VARCHAR(40) NOT NULL,
  entityId INT NOT NULL, action VARCHAR(40) NOT NULL, reason TEXT NULL, metadata JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_admin_audit_actor (adminUserId), KEY idx_admin_audit_entity (entityType, entityId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO bricky_schema_migrations (version, description) VALUES ('20260705_002_moderation_gate', 'Add moderation gate and audit log') ON DUPLICATE KEY UPDATE description = VALUES(description);
DROP PROCEDURE IF EXISTS bricky_moderation_add_column;
DROP PROCEDURE IF EXISTS bricky_moderation_backfill;

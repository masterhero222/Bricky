DROP TABLE IF EXISTS admin_audit_logs;
DELIMITER //
DROP PROCEDURE IF EXISTS bricky_moderation_drop_column//
CREATE PROCEDURE bricky_moderation_drop_column(IN table_in VARCHAR(64), IN column_in VARCHAR(64))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = table_in AND column_name = column_in) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_in, '` DROP COLUMN `', column_in, '`');
    PREPARE statement FROM @ddl; EXECUTE statement; DEALLOCATE PREPARE statement;
  END IF;
END//
DELIMITER ;
CALL bricky_moderation_drop_column('worker_gallery_images', 'moderatedAt');
CALL bricky_moderation_drop_column('worker_gallery_images', 'moderatedByUserId');
CALL bricky_moderation_drop_column('worker_gallery_images', 'moderationReason');
CALL bricky_moderation_drop_column('worker_gallery_images', 'moderationStatus');
CALL bricky_moderation_drop_column('request_images', 'moderatedAt');
CALL bricky_moderation_drop_column('request_images', 'moderatedByUserId');
CALL bricky_moderation_drop_column('request_images', 'moderationReason');
CALL bricky_moderation_drop_column('request_images', 'moderationStatus');
CALL bricky_moderation_drop_column('requests', 'moderatedAt');
CALL bricky_moderation_drop_column('requests', 'moderatedByUserId');
CALL bricky_moderation_drop_column('requests', 'moderationReason');
CALL bricky_moderation_drop_column('requests', 'moderationStatus');
CALL bricky_moderation_drop_column('worker', 'avatarModeratedAt');
CALL bricky_moderation_drop_column('worker', 'avatarModeratedByUserId');
CALL bricky_moderation_drop_column('worker', 'avatarModerationReason');
CALL bricky_moderation_drop_column('worker', 'avatarModerationStatus');
CALL bricky_moderation_drop_column('worker', 'moderatedAt');
CALL bricky_moderation_drop_column('worker', 'moderatedByUserId');
CALL bricky_moderation_drop_column('worker', 'moderationReason');
CALL bricky_moderation_drop_column('worker', 'moderationStatus');
CALL bricky_moderation_drop_column('reviews', 'moderatedAt');
CALL bricky_moderation_drop_column('reviews', 'moderatedByUserId');
CALL bricky_moderation_drop_column('reviews', 'moderationReason');
CALL bricky_moderation_drop_column('reviews', 'moderationStatus');
CALL bricky_moderation_drop_column('users', 'accountStatus');
DELETE FROM bricky_schema_migrations WHERE version = '20260705_002_moderation_gate';
DROP PROCEDURE IF EXISTS bricky_moderation_drop_column;

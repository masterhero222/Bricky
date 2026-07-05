DROP TABLE IF EXISTS admin_audit_logs;
ALTER TABLE worker_gallery_images DROP COLUMN IF EXISTS moderatedAt, DROP COLUMN IF EXISTS moderatedByUserId, DROP COLUMN IF EXISTS moderationReason, DROP COLUMN IF EXISTS moderationStatus;
ALTER TABLE request_images DROP COLUMN IF EXISTS moderatedAt, DROP COLUMN IF EXISTS moderatedByUserId, DROP COLUMN IF EXISTS moderationReason, DROP COLUMN IF EXISTS moderationStatus;
ALTER TABLE requests DROP COLUMN IF EXISTS moderatedAt, DROP COLUMN IF EXISTS moderatedByUserId, DROP COLUMN IF EXISTS moderationReason, DROP COLUMN IF EXISTS moderationStatus;
DELETE FROM bricky_schema_migrations WHERE version = '20260705_002_moderation_gate';

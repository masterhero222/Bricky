-- Persistent worker-controlled ordering for approved portfolio media.
-- Additive and safe to re-run on MySQL 8.

SET @media_display_order_column = IF(
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'media_assets'
      AND column_name = 'display_order'
  ),
  'SELECT 1',
  'ALTER TABLE media_assets ADD COLUMN display_order int NULL AFTER moderation_status'
);
PREPARE media_order_stmt FROM @media_display_order_column;
EXECUTE media_order_stmt;
DEALLOCATE PREPARE media_order_stmt;

SET @media_display_order_index = IF(
  EXISTS(
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'media_assets'
      AND index_name = 'idx_media_display_order'
  ),
  'SELECT 1',
  'CREATE INDEX idx_media_display_order ON media_assets (worker_user_id, request_id, kind, display_order)'
);
PREPARE media_order_stmt FROM @media_display_order_index;
EXECUTE media_order_stmt;
DEALLOCATE PREPARE media_order_stmt;

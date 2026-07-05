-- Bricky Sprint 2 foundation migration (DOWN).
-- Removes only structures introduced by 20260705_001_sprint2_foundation.
-- Run only after preserving any canonical rows written after the UP migration.

DROP TABLE IF EXISTS request_events;
DROP TABLE IF EXISTS request_calculations;
DROP TABLE IF EXISTS request_activities;

DELIMITER //

DROP PROCEDURE IF EXISTS bricky_s2_drop_index//
CREATE PROCEDURE bricky_s2_drop_index(
  IN table_name_in VARCHAR(64),
  IN index_name_in VARCHAR(64)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = table_name_in
      AND index_name = index_name_in
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_name_in, '` DROP INDEX `', index_name_in, '`');
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//

DROP PROCEDURE IF EXISTS bricky_s2_drop_column//
CREATE PROCEDURE bricky_s2_drop_column(
  IN table_name_in VARCHAR(64),
  IN column_name_in VARCHAR(64)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_in
      AND column_name = column_name_in
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_name_in, '` DROP COLUMN `', column_name_in, '`');
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//

DELIMITER ;

CALL bricky_s2_drop_index('requests', 'idx_requests_assigned_status_updated');
CALL bricky_s2_drop_index('requests', 'idx_requests_client_created');
CALL bricky_s2_drop_index('requests', 'idx_requests_status_key_created');

CALL bricky_s2_drop_column('requests', 'updated_at');
CALL bricky_s2_drop_column('requests', 'canceledAt');
CALL bricky_s2_drop_column('requests', 'startedAt');
CALL bricky_s2_drop_column('requests', 'assignedAt');
CALL bricky_s2_drop_column('requests', 'addressVisibility');
CALL bricky_s2_drop_column('requests', 'statusKey');

DELETE FROM bricky_schema_migrations
WHERE version = '20260705_001_sprint2_foundation';

DROP PROCEDURE IF EXISTS bricky_s2_drop_column;
DROP PROCEDURE IF EXISTS bricky_s2_drop_index;

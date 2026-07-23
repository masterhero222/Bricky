-- Bricky request core fields migration.
--
-- Purpose:
--   Add the columns that the rebuilt request flow, Sofia map, and future
--   repair-category database model need.
--
-- Safety:
--   1. Run a mysqldump backup before this file.
--   2. Run this on staging/local first.
--   3. Do not expose MySQL port 3306 publicly.
--
-- Backup:
--   mysqldump -u <MYSQL_USER> -p --single-transaction --routines --triggers bricky > bricky_before_request_core_fields.sql
--
-- Rollback is at the bottom of this file.

DELIMITER //

DROP PROCEDURE IF EXISTS bricky_add_column_if_missing//
CREATE PROCEDURE bricky_add_column_if_missing(
  IN table_name_in VARCHAR(64),
  IN column_name_in VARCHAR(64),
  IN alter_sql_in TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_in
      AND COLUMN_NAME = column_name_in
  ) THEN
    SET @sql = alter_sql_in;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS bricky_add_index_if_missing//
CREATE PROCEDURE bricky_add_index_if_missing(
  IN table_name_in VARCHAR(64),
  IN index_name_in VARCHAR(64),
  IN alter_sql_in TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_in
      AND INDEX_NAME = index_name_in
  ) THEN
    SET @sql = alter_sql_in;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL bricky_add_column_if_missing('requests', 'categoryKey', 'ALTER TABLE requests ADD COLUMN categoryKey VARCHAR(80) NULL AFTER category');
CALL bricky_add_column_if_missing('requests', 'latitude', 'ALTER TABLE requests ADD COLUMN latitude DECIMAL(10,7) NULL AFTER description');
CALL bricky_add_column_if_missing('requests', 'longitude', 'ALTER TABLE requests ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude');
CALL bricky_add_column_if_missing('requests', 'locationSource', 'ALTER TABLE requests ADD COLUMN locationSource VARCHAR(50) NULL AFTER longitude');
CALL bricky_add_column_if_missing('requests', 'estimateMin', 'ALTER TABLE requests ADD COLUMN estimateMin DECIMAL(10,2) NULL AFTER locationSource');
CALL bricky_add_column_if_missing('requests', 'estimateMax', 'ALTER TABLE requests ADD COLUMN estimateMax DECIMAL(10,2) NULL AFTER estimateMin');
CALL bricky_add_column_if_missing('requests', 'estimateCurrency', 'ALTER TABLE requests ADD COLUMN estimateCurrency VARCHAR(30) NULL AFTER estimateMax');

UPDATE requests
SET categoryKey = CASE
  WHEN category IN ('ВиК', 'ВиК ремонти') THEN 'vik'
  WHEN category IN ('Електро', 'Електро ремонти', 'Електро инсталация') THEN 'electro'
  WHEN category IN ('Боядисване', 'Пребоядисване', 'Освежителен ремонт') THEN 'painting'
  WHEN category IN ('Шпакловка и боя', 'Шпакловка и мазилки', 'Зидария и мазилки') THEN 'plaster'
  WHEN category IN ('Плочки', 'Плочки / теракот / гранитогрес') THEN 'tiles'
  WHEN category IN ('Ремонт на бани', 'Ремонт на баня') THEN 'bathroom_renovation'
  WHEN category = 'Гипсокартон' THEN 'drywall'
  WHEN category = 'Подови настилки' THEN 'flooring'
  WHEN category IN ('Отопление и климатици', 'Климатици / отопление') THEN 'heating_cooling'
  WHEN category IN ('Дограма и врати', 'Врати и дограма') THEN 'windows_doors'
  WHEN category = 'Мебели и монтажи' THEN 'furniture_mounting'
  WHEN category IN ('Ремонт на покриви', 'Покриви и хидроизолация', 'Изолация') THEN 'roof_waterproofing'
  WHEN category IN ('Къртене и извозване', 'Къртене, чистене, извозване') THEN 'demolition_cleanup'
  WHEN category IN ('Основен ремонт', 'Цялостен ремонт') THEN 'full_renovation'
  ELSE 'small_repairs'
END
WHERE categoryKey IS NULL OR categoryKey = '';

UPDATE requests
SET locationSource = COALESCE(NULLIF(locationSource, ''), 'manual'),
    estimateCurrency = COALESCE(NULLIF(estimateCurrency, ''), 'BGN');

CALL bricky_add_index_if_missing('requests', 'idx_requests_category_key', 'ALTER TABLE requests ADD INDEX idx_requests_category_key (categoryKey)');
CALL bricky_add_index_if_missing('requests', 'idx_requests_status_created', 'ALTER TABLE requests ADD INDEX idx_requests_status_created (status, created_at)');
CALL bricky_add_index_if_missing('requests', 'idx_requests_assigned_worker', 'ALTER TABLE requests ADD INDEX idx_requests_assigned_worker (assignedWorkerId)');
CALL bricky_add_index_if_missing('requests', 'idx_requests_completed_worker', 'ALTER TABLE requests ADD INDEX idx_requests_completed_worker (completedByWorkerId)');
CALL bricky_add_index_if_missing('requests', 'idx_requests_location', 'ALTER TABLE requests ADD INDEX idx_requests_location (latitude, longitude)');

DROP PROCEDURE IF EXISTS bricky_add_index_if_missing;
DROP PROCEDURE IF EXISTS bricky_add_column_if_missing;

-- Rollback:
-- DROP INDEX idx_requests_location ON requests;
-- DROP INDEX idx_requests_completed_worker ON requests;
-- DROP INDEX idx_requests_assigned_worker ON requests;
-- DROP INDEX idx_requests_status_created ON requests;
-- DROP INDEX idx_requests_category_key ON requests;
-- ALTER TABLE requests
--   DROP COLUMN estimateCurrency,
--   DROP COLUMN estimateMax,
--   DROP COLUMN estimateMin,
--   DROP COLUMN locationSource,
--   DROP COLUMN longitude,
--   DROP COLUMN latitude,
--   DROP COLUMN categoryKey;

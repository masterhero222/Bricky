-- Allow the rebuilt request catalog to store all supported category labels.
-- Idempotent: only converts requests.category while it is still an ENUM.

DELIMITER //

DROP PROCEDURE IF EXISTS bricky_expand_request_category//
CREATE PROCEDURE bricky_expand_request_category()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'requests'
      AND COLUMN_NAME = 'category'
      AND DATA_TYPE = 'enum'
  ) THEN
    ALTER TABLE requests MODIFY COLUMN category VARCHAR(100) NULL;
  END IF;
END//

DELIMITER ;

CALL bricky_expand_request_category();
DROP PROCEDURE IF EXISTS bricky_expand_request_category;

-- Rollback is intentionally not automatic. Existing values outside the old
-- four-value ENUM must be migrated before narrowing this column again.

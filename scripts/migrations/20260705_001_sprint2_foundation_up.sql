-- Bricky Sprint 2 foundation migration (UP).
-- Version: 20260705_001_sprint2_foundation
-- Additive only: no legacy columns or rows are removed.

CREATE TABLE IF NOT EXISTS bricky_schema_migrations (
  version VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

DROP PROCEDURE IF EXISTS bricky_s2_add_column//
CREATE PROCEDURE bricky_s2_add_column(
  IN table_name_in VARCHAR(64),
  IN column_name_in VARCHAR(64),
  IN alter_sql_in TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_in
      AND column_name = column_name_in
  ) THEN
    SET @ddl = alter_sql_in;
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//

DROP PROCEDURE IF EXISTS bricky_s2_add_index//
CREATE PROCEDURE bricky_s2_add_index(
  IN table_name_in VARCHAR(64),
  IN index_name_in VARCHAR(64),
  IN alter_sql_in TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = table_name_in
      AND index_name = index_name_in
  ) THEN
    SET @ddl = alter_sql_in;
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//

DELIMITER ;

CALL bricky_s2_add_column('requests', 'statusKey',
  'ALTER TABLE requests ADD COLUMN statusKey VARCHAR(32) NULL AFTER status');
CALL bricky_s2_add_column('requests', 'addressVisibility',
  'ALTER TABLE requests ADD COLUMN addressVisibility VARCHAR(32) NOT NULL DEFAULT ''private'' AFTER locationSource');
CALL bricky_s2_add_column('requests', 'assignedAt',
  'ALTER TABLE requests ADD COLUMN assignedAt DATETIME(6) NULL AFTER assignedWorkerId');
CALL bricky_s2_add_column('requests', 'startedAt',
  'ALTER TABLE requests ADD COLUMN startedAt DATETIME(6) NULL AFTER assignedAt');
CALL bricky_s2_add_column('requests', 'canceledAt',
  'ALTER TABLE requests ADD COLUMN canceledAt DATETIME(6) NULL AFTER completedAt');
CALL bricky_s2_add_column('requests', 'updated_at',
  'ALTER TABLE requests ADD COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) AFTER created_at');

UPDATE requests
SET statusKey = CASE LOWER(TRIM(status))
  WHEN 'нова' THEN 'new'
  WHEN 'кандидатствана' THEN 'applied'
  WHEN 'назначена' THEN 'assigned'
  WHEN 'в процес' THEN 'in_progress'
  WHEN 'завършена' THEN 'completed'
  WHEN 'отказана' THEN 'canceled'
  ELSE statusKey
END
WHERE statusKey IS NULL OR statusKey = '';

CALL bricky_s2_add_index('requests', 'idx_requests_status_key_created',
  'ALTER TABLE requests ADD INDEX idx_requests_status_key_created (statusKey, created_at)');
CALL bricky_s2_add_index('requests', 'idx_requests_client_created',
  'ALTER TABLE requests ADD INDEX idx_requests_client_created (clientId, created_at)');
CALL bricky_s2_add_index('requests', 'idx_requests_assigned_status_updated',
  'ALTER TABLE requests ADD INDEX idx_requests_assigned_status_updated (assignedWorkerId, statusKey, updated_at)');

CREATE TABLE IF NOT EXISTS request_activities (
  id BIGINT NOT NULL AUTO_INCREMENT,
  requestId INT NOT NULL,
  categoryKey VARCHAR(80) NOT NULL,
  activityKey VARCHAR(100) NOT NULL,
  activityLabel VARCHAR(160) NOT NULL,
  quantity DECIMAL(12,3) NULL,
  unit VARCHAR(30) NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_activities_request_activity (requestId, activityKey),
  KEY idx_request_activities_category_activity (categoryKey, activityKey),
  CONSTRAINT fk_request_activities_request
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_calculations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  requestId INT NOT NULL,
  pricingVersion VARCHAR(80) NOT NULL,
  materialRulesVersion VARCHAR(80) NULL,
  materialIndexVersion VARCHAR(80) NULL,
  currency VARCHAR(10) NOT NULL,
  pricingMode VARCHAR(40) NOT NULL,
  exactAreaM2 DECIMAL(12,3) NULL,
  laborMin DECIMAL(12,2) NOT NULL,
  laborMax DECIMAL(12,2) NOT NULL,
  materialMin DECIMAL(12,2) NOT NULL,
  materialMax DECIMAL(12,2) NOT NULL,
  expectedMin DECIMAL(12,2) NOT NULL,
  expectedMax DECIMAL(12,2) NOT NULL,
  possibleMin DECIMAL(12,2) NOT NULL,
  possibleMax DECIMAL(12,2) NOT NULL,
  totalMin DECIMAL(12,2) NOT NULL,
  totalMax DECIMAL(12,2) NOT NULL,
  confidence VARCHAR(40) NULL,
  snapshotJson JSON NOT NULL,
  calculated_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_calculations_request (requestId),
  CONSTRAINT fk_request_calculations_request
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  requestId INT NOT NULL,
  actorUserId INT NULL,
  eventType VARCHAR(80) NOT NULL,
  previousStatus VARCHAR(32) NULL,
  nextStatus VARCHAR(32) NULL,
  metadataJson JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_request_events_request_created (requestId, created_at),
  KEY idx_request_events_actor_created (actorUserId, created_at),
  CONSTRAINT fk_request_events_request
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_events_actor
    FOREIGN KEY (actorUserId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO bricky_schema_migrations (version, description)
VALUES ('20260705_001_sprint2_foundation', 'Add canonical request status, activities, calculation snapshot, and events')
ON DUPLICATE KEY UPDATE description = VALUES(description);

DROP PROCEDURE IF EXISTS bricky_s2_add_index;
DROP PROCEDURE IF EXISTS bricky_s2_add_column;

-- Sprint 3 v2 schema alignment.
-- Run after 20260718_sprint3_v2_data_core.sql.
-- This migration is additive and safe to re-run on MySQL 8.

SET @worker_profile_columns = CONCAT_WS(', ',
  IF(
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'profile_banner_key'),
    NULL,
    'ADD COLUMN profile_banner_key varchar(64) NOT NULL DEFAULT ''blueprint_general_v1'''
  )
);
SET @worker_profiles_alter = IF(
  @worker_profile_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE worker_profiles ', @worker_profile_columns)
);
PREPARE sprint3_stmt FROM @worker_profiles_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @repair_request_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'client_confirmed_at'), NULL, 'ADD COLUMN client_confirmed_at datetime NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'archived_at'), NULL, 'ADD COLUMN archived_at datetime NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'archive_reason'), NULL, 'ADD COLUMN archive_reason varchar(40) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'archive_source'), NULL, 'ADD COLUMN archive_source varchar(40) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'archived_by_user_id'), NULL, 'ADD COLUMN archived_by_user_id int NULL')
);
SET @repair_requests_alter = IF(
  @repair_request_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE repair_requests ', @repair_request_columns)
);
PREPARE sprint3_stmt FROM @repair_requests_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

ALTER TABLE repair_requests
  MODIFY COLUMN status enum(
    'draft',
    'pending_admin',
    'published',
    'applied',
    'assigned',
    'worker_selected',
    'worker_confirmed',
    'worker_on_site',
    'inspected',
    'in_progress',
    'work_finished',
    'ready_for_client_confirmation',
    'client_confirmed',
    'reviewed',
    'completed',
    'canceled',
    'archived'
  ) NOT NULL DEFAULT 'pending_admin';

ALTER TABLE request_pricing_snapshots
  MODIFY COLUMN pricing_version varchar(80) NULL,
  MODIFY COLUMN currency varchar(10) NOT NULL DEFAULT 'EUR';

ALTER TABLE request_events
  MODIFY COLUMN actor_user_id int NULL,
  MODIFY COLUMN event_type varchar(80) NOT NULL;

SET @review_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'completed_at'), NULL, 'ADD COLUMN completed_at datetime NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'completed_by_worker_id'), NULL, 'ADD COLUMN completed_by_worker_id int NULL')
);
SET @reviews_alter = IF(@review_columns = '', 'SELECT 1', CONCAT('ALTER TABLE reviews ', @review_columns));
PREPARE sprint3_stmt FROM @reviews_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @category_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'repair_categories' AND column_name = 'is_active'), NULL, 'ADD COLUMN is_active tinyint(1) NOT NULL DEFAULT 1')
);
SET @repair_categories_alter = IF(
  @category_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE repair_categories ', @category_columns)
);
PREPARE sprint3_stmt FROM @repair_categories_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @has_legacy_category_active = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'repair_categories'
    AND column_name = 'active'
);
SET @copy_category_active = IF(
  @has_legacy_category_active > 0,
  'UPDATE repair_categories SET is_active = active',
  'SELECT 1'
);
PREPARE sprint3_stmt FROM @copy_category_active;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @activity_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'repair_activities' AND column_name = 'is_active'), NULL, 'ADD COLUMN is_active tinyint(1) NOT NULL DEFAULT 1')
);
SET @repair_activities_alter = IF(
  @activity_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE repair_activities ', @activity_columns)
);
PREPARE sprint3_stmt FROM @repair_activities_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @has_legacy_activity_active = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'repair_activities'
    AND column_name = 'active'
);
SET @copy_activity_active = IF(
  @has_legacy_activity_active > 0,
  'UPDATE repair_activities SET is_active = active',
  'SELECT 1'
);
PREPARE sprint3_stmt FROM @copy_activity_active;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @pricing_rule_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pricing_rules' AND column_name = 'is_active'), NULL, 'ADD COLUMN is_active tinyint(1) NOT NULL DEFAULT 1')
);
SET @pricing_rules_alter = IF(
  @pricing_rule_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE pricing_rules ', @pricing_rule_columns)
);
PREPARE sprint3_stmt FROM @pricing_rules_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @has_legacy_pricing_active = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'pricing_rules'
    AND column_name = 'active'
);
SET @copy_pricing_active = IF(
  @has_legacy_pricing_active > 0,
  'UPDATE pricing_rules SET is_active = active',
  'SELECT 1'
);
PREPARE sprint3_stmt FROM @copy_pricing_active;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @add_pricing_rule_unique_index = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE pricing_rules ADD UNIQUE INDEX uq_pricing_rule (category_key, activity_key, version)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'pricing_rules'
    AND index_name = 'uq_pricing_rule'
);
PREPARE sprint3_stmt FROM @add_pricing_rule_unique_index;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @add_status_created_index = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE repair_requests ADD INDEX idx_repair_requests_status_created (status, created_at)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'repair_requests'
    AND index_name = 'idx_repair_requests_status_created'
);
PREPARE sprint3_stmt FROM @add_status_created_index;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @add_category_status_index = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE repair_requests ADD INDEX idx_repair_requests_category_status (category_key, status)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'repair_requests'
    AND index_name = 'idx_repair_requests_category_status'
);
PREPARE sprint3_stmt FROM @add_category_status_index;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @add_archived_index = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE repair_requests ADD INDEX idx_repair_requests_archived (archived_at)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'repair_requests'
    AND index_name = 'idx_repair_requests_archived'
);
PREPARE sprint3_stmt FROM @add_archived_index;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @add_worker_plan_unique_index = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE worker_plans ADD UNIQUE INDEX uq_worker_plan_worker (worker_user_id)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'worker_plans'
    AND index_name = 'uq_worker_plan_worker'
);
PREPARE sprint3_stmt FROM @add_worker_plan_unique_index;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @add_wallet_balance_check = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE worker_credit_wallets ADD CONSTRAINT chk_worker_credit_wallet_balance CHECK (balance >= 0)',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'worker_credit_wallets'
    AND constraint_name = 'chk_worker_credit_wallet_balance'
    AND constraint_type = 'CHECK'
);
PREPARE sprint3_stmt FROM @add_wallet_balance_check;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

SET @add_credit_transaction_amount_check = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE worker_credit_transactions ADD CONSTRAINT chk_worker_credit_transaction_amount CHECK (amount <> 0)',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'worker_credit_transactions'
    AND constraint_name = 'chk_worker_credit_transaction_amount'
    AND constraint_type = 'CHECK'
);
PREPARE sprint3_stmt FROM @add_credit_transaction_amount_check;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

INSERT INTO repair_categories (category_key, label, is_active, sort_order)
VALUES
  ('vik', 'VIK repairs', 1, 10),
  ('electro', 'Electrical repairs', 1, 20),
  ('painting', 'Painting', 1, 30),
  ('plaster', 'Plaster and skim coat', 1, 40),
  ('tiles', 'Tiles', 1, 50),
  ('bathroom_renovation', 'Bathroom renovation', 1, 60),
  ('drywall', 'Drywall', 1, 70),
  ('flooring', 'Flooring', 1, 80),
  ('heating_cooling', 'Heating and cooling', 1, 90),
  ('windows_doors', 'Windows and doors', 1, 100),
  ('furniture_mounting', 'Furniture mounting', 1, 110),
  ('roof_waterproofing', 'Roof and waterproofing', 1, 120),
  ('demolition_cleanup', 'Demolition and cleanup', 1, 130),
  ('full_renovation', 'Full renovation', 1, 140),
  ('small_repairs', 'Small home repairs', 1, 150)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order);

-- Sprint 3 v2 data core.
-- Safe direction: add v2 tables/columns only. Do not drop or rename legacy tables here.

CREATE TABLE IF NOT EXISTS users (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  password varchar(255) NOT NULL,
  password_hash varchar(255) NULL,
  role varchar(40) NOT NULL DEFAULT 'client',
  status varchar(40) NOT NULL DEFAULT 'active',
  created_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @users_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_hash'), NULL, 'ADD COLUMN password_hash varchar(255) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'role'), NULL, 'ADD COLUMN role varchar(40) NOT NULL DEFAULT ''client'''),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'status'), NULL, 'ADD COLUMN status varchar(40) NOT NULL DEFAULT ''active'''),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'created_at'), NULL, 'ADD COLUMN created_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6)'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'updated_at'), NULL, 'ADD COLUMN updated_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)')
);
SET @users_alter = IF(@users_columns = '', 'SELECT 1', CONCAT('ALTER TABLE users ', @users_columns));
PREPARE sprint3_stmt FROM @users_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_profiles (
  user_id int NOT NULL,
  display_name varchar(120) NOT NULL,
  phone_private varchar(40) NULL,
  default_address varchar(255) NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_client_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_profiles (
  user_id int NOT NULL,
  public_name varchar(140) NOT NULL,
  city varchar(100) NULL,
  bio text NULL,
  experience text NULL,
  equipment text NULL,
  approval_status varchar(40) NOT NULL DEFAULT 'pending',
  visibility_status varchar(40) NOT NULL DEFAULT 'private',
  profile_banner_key varchar(64) NOT NULL DEFAULT 'blueprint_general_v1',
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id),
  KEY idx_worker_profiles_approval (approval_status),
  KEY idx_worker_profiles_visibility (visibility_status),
  CONSTRAINT fk_worker_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_skills (
  id int NOT NULL AUTO_INCREMENT,
  worker_user_id int NOT NULL,
  category_key varchar(80) NOT NULL,
  activity_key varchar(120) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_worker_skill (worker_user_id, category_key, activity_key),
  KEY idx_worker_skills_worker (worker_user_id),
  KEY idx_worker_skills_category (category_key),
  CONSTRAINT fk_worker_skills_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS repair_requests (
  id int NOT NULL AUTO_INCREMENT,
  client_user_id int NOT NULL,
  category_key varchar(80) NOT NULL,
  title varchar(180) NOT NULL,
  description text NULL,
  address_text varchar(255) NULL,
  latitude decimal(10,7) NULL,
  longitude decimal(10,7) NULL,
  location_source varchar(50) NULL,
  address_visibility varchar(60) NOT NULL DEFAULT 'exact_after_assignment',
  status enum(
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
  ) NOT NULL DEFAULT 'pending_admin',
  estimate_min decimal(10,2) NULL,
  estimate_max decimal(10,2) NULL,
  estimate_currency varchar(30) NOT NULL DEFAULT 'EUR',
  pricing_snapshot_id int NULL,
  assigned_worker_user_id int NULL,
  completed_at datetime NULL,
  client_confirmed_at datetime NULL,
  archived_at datetime NULL,
  archive_reason varchar(40) NULL,
  archive_source varchar(40) NULL,
  archived_by_user_id int NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_repair_requests_client (client_user_id),
  KEY idx_repair_requests_worker (assigned_worker_user_id),
  KEY idx_repair_requests_category (category_key),
  KEY idx_repair_requests_status (status),
  KEY idx_repair_requests_status_created (status, created_at),
  KEY idx_repair_requests_category_status (category_key, status),
  KEY idx_repair_requests_archived (archived_at),
  KEY idx_repair_requests_latitude (latitude),
  KEY idx_repair_requests_longitude (longitude),
  CONSTRAINT fk_repair_requests_client FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_repair_requests_worker FOREIGN KEY (assigned_worker_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_pricing_snapshots (
  id int NOT NULL AUTO_INCREMENT,
  request_id int NULL,
  pricing_version varchar(80) NULL,
  currency varchar(10) NOT NULL DEFAULT 'EUR',
  category_key varchar(80) NOT NULL,
  activity_keys_json json NULL,
  input_json json NULL,
  result_json json NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_request_pricing_snapshots_request (request_id),
  CONSTRAINT fk_request_pricing_snapshots_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_events (
  id int NOT NULL AUTO_INCREMENT,
  request_id int NOT NULL,
  actor_user_id int NULL,
  event_type varchar(80) NOT NULL,
  metadata_json json NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_request_events_request (request_id),
  KEY idx_request_events_actor (actor_user_id),
  CONSTRAINT fk_request_events_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_assets (
  id int NOT NULL AUTO_INCREMENT,
  owner_user_id int NOT NULL,
  request_id int NULL,
  worker_user_id int NULL,
  kind varchar(60) NOT NULL,
  storage_provider varchar(40) NOT NULL DEFAULT 'vps',
  storage_key varchar(255) NOT NULL,
  public_url varchar(255) NOT NULL,
  mime_type varchar(120) NULL,
  size_bytes int NULL,
  width int NULL,
  height int NULL,
  moderation_status varchar(40) NOT NULL DEFAULT 'pending',
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_media_owner (owner_user_id),
  KEY idx_media_request (request_id),
  KEY idx_media_worker (worker_user_id),
  KEY idx_media_kind (kind),
  KEY idx_media_moderation (moderation_status),
  CONSTRAINT fk_media_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_media_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_media_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS repair_categories (
  id int NOT NULL AUTO_INCREMENT,
  category_key varchar(80) NOT NULL,
  label varchar(140) NOT NULL,
  description text NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_categories_key (category_key),
  KEY idx_repair_categories_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS repair_activities (
  id int NOT NULL AUTO_INCREMENT,
  category_key varchar(80) NOT NULL,
  activity_key varchar(120) NOT NULL,
  label varchar(180) NOT NULL,
  unit_type varchar(40) NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_activity (category_key, activity_key),
  KEY idx_repair_activities_category (category_key),
  KEY idx_repair_activities_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id int NOT NULL AUTO_INCREMENT,
  version varchar(80) NOT NULL,
  category_key varchar(80) NOT NULL,
  activity_key varchar(120) NOT NULL,
  labor_min decimal(10,2) NOT NULL,
  labor_max decimal(10,2) NOT NULL,
  material_min decimal(10,2) NULL,
  material_max decimal(10,2) NULL,
  currency varchar(10) NOT NULL DEFAULT 'EUR',
  valid_from datetime NULL,
  valid_to datetime NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_pricing_rule (category_key, activity_key, version),
  KEY idx_pricing_rules_lookup (category_key, activity_key, is_active),
  KEY idx_pricing_rules_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_applications (
  id int NOT NULL AUTO_INCREMENT,
  request_id int NOT NULL,
  worker_user_id int NOT NULL,
  status enum('applied','shortlisted','assigned','withdrawn','rejected') NOT NULL DEFAULT 'applied',
  offer_min decimal(10,2) NULL,
  offer_max decimal(10,2) NULL,
  message text NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_application (request_id, worker_user_id),
  KEY idx_request_applications_request (request_id),
  KEY idx_request_applications_worker (worker_user_id),
  CONSTRAINT fk_request_applications_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_applications_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @request_application_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'request_applications' AND column_name = 'request_id'), NULL, 'ADD COLUMN request_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'request_applications' AND column_name = 'worker_user_id'), NULL, 'ADD COLUMN worker_user_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'request_applications' AND column_name = 'offer_min'), NULL, 'ADD COLUMN offer_min decimal(10,2) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'request_applications' AND column_name = 'offer_max'), NULL, 'ADD COLUMN offer_max decimal(10,2) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'request_applications' AND column_name = 'message'), NULL, 'ADD COLUMN message text NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'request_applications' AND column_name = 'updated_at'), NULL, 'ADD COLUMN updated_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)')
);
SET @request_applications_alter = IF(
  @request_application_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE request_applications ', @request_application_columns)
);
PREPARE sprint3_stmt FROM @request_applications_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

CREATE TABLE IF NOT EXISTS reviews (
  id int NOT NULL AUTO_INCREMENT,
  request_id int NOT NULL,
  client_user_id int NOT NULL,
  worker_user_id int NOT NULL,
  rating int NOT NULL,
  comment text NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  completed_at datetime NULL,
  completed_by_worker_id int NULL,
  moderationStatus varchar(30) NOT NULL DEFAULT 'pending_review',
  moderationReason text NULL,
  moderatedByUserId int NULL,
  moderatedAt datetime NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_request_client (request_id, client_user_id),
  KEY idx_reviews_worker (worker_user_id),
  CONSTRAINT fk_reviews_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_client FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @review_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'request_id'), NULL, 'ADD COLUMN request_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'client_user_id'), NULL, 'ADD COLUMN client_user_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'worker_user_id'), NULL, 'ADD COLUMN worker_user_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'completed_at'), NULL, 'ADD COLUMN completed_at datetime NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'completed_by_worker_id'), NULL, 'ADD COLUMN completed_by_worker_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'moderationStatus'), NULL, 'ADD COLUMN moderationStatus varchar(30) NOT NULL DEFAULT ''pending_review'''),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'moderationReason'), NULL, 'ADD COLUMN moderationReason text NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'moderatedByUserId'), NULL, 'ADD COLUMN moderatedByUserId int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'moderatedAt'), NULL, 'ADD COLUMN moderatedAt datetime NULL')
);
SET @reviews_alter = IF(@review_columns = '', 'SELECT 1', CONCAT('ALTER TABLE reviews ', @review_columns));
PREPARE sprint3_stmt FROM @reviews_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

CREATE TABLE IF NOT EXISTS notifications (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  request_id int NULL,
  type varchar(50) NOT NULL,
  message text NOT NULL,
  payload_json json NULL,
  read_at datetime NULL,
  is_read tinyint(1) NOT NULL DEFAULT 0,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id),
  KEY idx_notifications_request (request_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @notification_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'user_id'), NULL, 'ADD COLUMN user_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'request_id'), NULL, 'ADD COLUMN request_id int NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'payload_json'), NULL, 'ADD COLUMN payload_json json NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'read_at'), NULL, 'ADD COLUMN read_at datetime NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'is_read'), NULL, 'ADD COLUMN is_read tinyint(1) NOT NULL DEFAULT 0'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'created_at'), NULL, 'ADD COLUMN created_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6)')
);
SET @notifications_alter = IF(
  @notification_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE notifications ', @notification_columns)
);
PREPARE sprint3_stmt FROM @notifications_alter;
EXECUTE sprint3_stmt;
DEALLOCATE PREPARE sprint3_stmt;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id int NOT NULL AUTO_INCREMENT,
  admin_user_id int NULL,
  action varchar(80) NOT NULL,
  target_type varchar(80) NULL,
  target_id varchar(80) NULL,
  reason text NULL,
  metadata_json json NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_admin_audit_admin (admin_user_id),
  KEY idx_admin_audit_action (action),
  CONSTRAINT fk_admin_audit_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_plans (
  id int NOT NULL AUTO_INCREMENT,
  worker_user_id int NOT NULL,
  plan_key varchar(80) NOT NULL DEFAULT 'free',
  status varchar(40) NOT NULL DEFAULT 'active',
  starts_at datetime NULL,
  ends_at datetime NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_worker_plan_worker (worker_user_id),
  KEY idx_worker_plans_status (status),
  CONSTRAINT fk_worker_plans_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_credit_wallets (
  id int NOT NULL AUTO_INCREMENT,
  worker_user_id int NOT NULL,
  balance int NOT NULL DEFAULT 0,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_worker_credit_wallet (worker_user_id),
  CONSTRAINT fk_worker_credit_wallet_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_worker_credit_wallet_balance CHECK (balance >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_credit_transactions (
  id int NOT NULL AUTO_INCREMENT,
  worker_user_id int NOT NULL,
  amount int NOT NULL,
  balance_after int NOT NULL,
  reason varchar(80) NOT NULL,
  admin_user_id int NULL,
  metadata_json json NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_worker_credit_transactions_worker (worker_user_id),
  KEY idx_worker_credit_transactions_admin (admin_user_id),
  CONSTRAINT fk_worker_credit_transactions_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_worker_credit_transactions_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_worker_credit_transaction_amount CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

SET @legacy_category_group_default = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE repair_categories ALTER COLUMN category_group SET DEFAULT ''general''',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'repair_categories'
    AND column_name = 'category_group'
);
PREPARE sprint3_stmt FROM @legacy_category_group_default;
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

CREATE TABLE IF NOT EXISTS referrals (
  id int NOT NULL AUTO_INCREMENT,
  code varchar(24) NOT NULL,
  type enum('worker_to_worker','client_to_client') NOT NULL,
  referrer_user_id int NOT NULL,
  referred_user_id int NULL,
  status enum('created','registered','qualifying','qualified','rewarded','rejected') NOT NULL DEFAULT 'created',
  qualified_repair_count int NOT NULL DEFAULT 0,
  qualified_at datetime NULL,
  rewarded_at datetime NULL,
  rejection_reason text NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_referrals_code (code),
  UNIQUE KEY uq_referrals_referred_user (referred_user_id),
  KEY idx_referrals_referrer (referrer_user_id),
  KEY idx_referrals_type_status (type, status),
  CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_referrals_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_qualifications (
  id int NOT NULL AUTO_INCREMENT,
  referral_id int NOT NULL,
  request_id int NOT NULL,
  referred_worker_user_id int NOT NULL,
  client_user_id int NOT NULL,
  status enum('pending','qualified','revoked') NOT NULL DEFAULT 'qualified',
  qualified_at datetime NULL,
  revoked_at datetime NULL,
  reason text NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_referral_qualification (referral_id, request_id),
  UNIQUE KEY uq_referral_qualification_request (request_id),
  KEY idx_referral_qualifications_worker (referred_worker_user_id),
  KEY idx_referral_qualifications_client (client_user_id),
  CONSTRAINT fk_referral_qualifications_referral FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_qualifications_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_qualifications_worker FOREIGN KEY (referred_worker_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_referral_qualifications_client FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_rewards (
  id int NOT NULL AUTO_INCREMENT,
  referral_id int NOT NULL,
  user_id int NOT NULL,
  reward_type varchar(80) NOT NULL,
  status enum('pending','active','expired','revoked') NOT NULL DEFAULT 'active',
  starts_at datetime NOT NULL,
  ends_at datetime NOT NULL,
  metadata_json json NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_referral_rewards_referral (referral_id),
  KEY idx_referral_rewards_user_type_status (user_id, reward_type, status),
  KEY idx_referral_rewards_ends_at (ends_at),
  CONSTRAINT fk_referral_rewards_referral FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_rewards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

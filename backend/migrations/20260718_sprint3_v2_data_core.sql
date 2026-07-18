-- Sprint 3 v2 data core.
-- Safe direction: add v2 tables/columns only. Do not drop or rename legacy tables here.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS status varchar(40) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS updated_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);

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
  status enum('draft','published','applied','assigned','in_progress','completed','canceled','archived') NOT NULL DEFAULT 'published',
  estimate_min decimal(10,2) NULL,
  estimate_max decimal(10,2) NULL,
  estimate_currency varchar(30) NOT NULL DEFAULT 'EUR',
  pricing_snapshot_id int NULL,
  assigned_worker_user_id int NULL,
  completed_at datetime NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_repair_requests_client (client_user_id),
  KEY idx_repair_requests_worker (assigned_worker_user_id),
  KEY idx_repair_requests_category (category_key),
  KEY idx_repair_requests_status (status),
  KEY idx_repair_requests_latitude (latitude),
  KEY idx_repair_requests_longitude (longitude),
  CONSTRAINT fk_repair_requests_client FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_repair_requests_worker FOREIGN KEY (assigned_worker_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_pricing_snapshots (
  id int NOT NULL AUTO_INCREMENT,
  request_id int NULL,
  pricing_version varchar(80) NOT NULL,
  currency varchar(30) NOT NULL DEFAULT 'EUR',
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
  actor_user_id int NOT NULL,
  event_type varchar(100) NOT NULL,
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
  active tinyint(1) NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_categories_key (category_key),
  KEY idx_repair_categories_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS repair_activities (
  id int NOT NULL AUTO_INCREMENT,
  category_key varchar(80) NOT NULL,
  activity_key varchar(120) NOT NULL,
  label varchar(160) NOT NULL,
  unit_type varchar(60) NULL,
  active tinyint(1) NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_activity (category_key, activity_key),
  KEY idx_repair_activities_category (category_key),
  KEY idx_repair_activities_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id int NOT NULL AUTO_INCREMENT,
  version varchar(80) NOT NULL,
  category_key varchar(80) NOT NULL,
  activity_key varchar(120) NULL,
  labor_min decimal(10,2) NULL,
  labor_max decimal(10,2) NULL,
  material_min decimal(10,2) NULL,
  material_max decimal(10,2) NULL,
  currency varchar(30) NOT NULL DEFAULT 'EUR',
  valid_from datetime NULL,
  valid_to datetime NULL,
  active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_pricing_rules_lookup (category_key, activity_key, active),
  KEY idx_pricing_rules_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_applications (
  id int NOT NULL AUTO_INCREMENT,
  request_id int NULL,
  worker_user_id int NULL,
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

ALTER TABLE request_applications
  ADD COLUMN IF NOT EXISTS request_id int NULL,
  ADD COLUMN IF NOT EXISTS worker_user_id int NULL,
  ADD COLUMN IF NOT EXISTS offer_min decimal(10,2) NULL,
  ADD COLUMN IF NOT EXISTS offer_max decimal(10,2) NULL,
  ADD COLUMN IF NOT EXISTS message text NULL,
  ADD COLUMN IF NOT EXISTS updated_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);

CREATE TABLE IF NOT EXISTS reviews (
  id int NOT NULL AUTO_INCREMENT,
  request_id int NULL,
  client_user_id int NULL,
  worker_user_id int NULL,
  rating int NOT NULL,
  comment text NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_request_client (request_id, client_user_id),
  KEY idx_reviews_worker (worker_user_id),
  CONSTRAINT fk_reviews_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_client FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS request_id int NULL,
  ADD COLUMN IF NOT EXISTS client_user_id int NULL,
  ADD COLUMN IF NOT EXISTS worker_user_id int NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NULL,
  request_id int NULL,
  type varchar(100) NOT NULL,
  message text NULL,
  payload_json json NULL,
  read_at datetime NULL,
  is_read tinyint(1) NOT NULL DEFAULT 0,
  created_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id),
  KEY idx_notifications_request (request_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_request FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id int NULL,
  ADD COLUMN IF NOT EXISTS request_id int NULL,
  ADD COLUMN IF NOT EXISTS payload_json json NULL,
  ADD COLUMN IF NOT EXISTS read_at datetime NULL,
  ADD COLUMN IF NOT EXISTS is_read tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6);

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
  KEY idx_worker_plans_worker (worker_user_id),
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
  CONSTRAINT fk_worker_credit_wallet_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_credit_transactions (
  id int NOT NULL AUTO_INCREMENT,
  worker_user_id int NOT NULL,
  amount int NOT NULL,
  balance_after int NOT NULL,
  reason varchar(140) NOT NULL,
  admin_user_id int NULL,
  metadata_json json NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_worker_credit_transactions_worker (worker_user_id),
  KEY idx_worker_credit_transactions_admin (admin_user_id),
  CONSTRAINT fk_worker_credit_transactions_worker FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_worker_credit_transactions_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO repair_categories (category_key, label, active, sort_order)
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
  active = VALUES(active),
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

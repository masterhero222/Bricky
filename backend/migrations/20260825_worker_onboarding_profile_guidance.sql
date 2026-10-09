-- Worker onboarding and profile guidance fields.
-- Additive, preserves legacy workers, and is safe to re-run on MySQL 8.

SET @worker_onboarding_columns = CONCAT_WS(', ',
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'primary_category_key'), NULL, 'ADD COLUMN primary_category_key varchar(80) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'preferred_contact_method'), NULL, 'ADD COLUMN preferred_contact_method varchar(30) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'contact_accuracy_confirmed'), NULL, 'ADD COLUMN contact_accuracy_confirmed tinyint(1) NOT NULL DEFAULT 0'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'work_type'), NULL, 'ADD COLUMN work_type varchar(30) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'experience_range'), NULL, 'ADD COLUMN experience_range varchar(30) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'availability_status'), NULL, 'ADD COLUMN availability_status varchar(30) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'acquisition_source_self_reported'), NULL, 'ADD COLUMN acquisition_source_self_reported varchar(60) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'acquisition_source_detail'), NULL, 'ADD COLUMN acquisition_source_detail varchar(180) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'project_photos_readiness'), NULL, 'ADD COLUMN project_photos_readiness varchar(30) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'service_description_readiness'), NULL, 'ADD COLUMN service_description_readiness varchar(20) NULL'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'onboarding_step'), NULL, 'ADD COLUMN onboarding_step tinyint NOT NULL DEFAULT 1'),
  IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'onboarding_completed_at'), NULL, 'ADD COLUMN onboarding_completed_at datetime NULL')
);

SET @worker_onboarding_alter = IF(
  @worker_onboarding_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE worker_profiles ', @worker_onboarding_columns)
);
PREPARE worker_onboarding_stmt FROM @worker_onboarding_alter;
EXECUTE worker_onboarding_stmt;
DEALLOCATE PREPARE worker_onboarding_stmt;

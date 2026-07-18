-- Worker self-service profile banner preference.
-- Safe additive migration: no legacy table cleanup and no moderation workflow.

ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS profile_banner_key varchar(64) NOT NULL DEFAULT 'blueprint_general_v1';

UPDATE worker_profiles
SET profile_banner_key = 'blueprint_general_v1'
WHERE profile_banner_key IS NULL OR profile_banner_key = '';

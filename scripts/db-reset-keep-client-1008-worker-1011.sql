-- Bricky DB reset script for a clean test dataset.
--
-- Keeps only:
--   - client user: users.id = 1008
--   - worker user: users.id = 1011
--   - worker profile linked to userId = 1011
--
-- Deletes all operational/test data:
--   - requests
--   - reviews
--   - notifications
--   - worker gallery images
--   - worker profiles not linked to userId 1011
--   - users except ids 1008 and 1011
--
-- IMPORTANT:
-- 1. Run a backup before this script.
-- 2. Run the preview SELECT statements first and confirm the database is correct.
-- 3. This script does not delete uploaded files from disk. It only clears DB rows.
-- 4. Do not expose MySQL port 3306 publicly.

USE bricky;

SET @keep_client_user_id := 1008;
SET @keep_worker_user_id := 1011;

-- Backup command to run from the VPS shell before executing this SQL:
-- mkdir -p /var/www/Bricky/backups/db
-- mysqldump -u root -p bricky > /var/www/Bricky/backups/db/bricky_before_reset_$(date +%F_%H-%M).sql

-- Preview the accounts that will be kept.
SELECT
  'KEEP USERS' AS section,
  id,
  name,
  email,
  role
FROM users
WHERE id IN (@keep_client_user_id, @keep_worker_user_id)
ORDER BY id;

SELECT
  'KEEP WORKER PROFILE' AS section,
  id,
  userId,
  fullName,
  email,
  city,
  isApproved
FROM worker
WHERE userId = @keep_worker_user_id;

-- Preview current row counts before delete.
SELECT 'users_before' AS table_name, COUNT(*) AS rows_count FROM users
UNION ALL SELECT 'worker_before', COUNT(*) FROM worker
UNION ALL SELECT 'requests_before', COUNT(*) FROM requests
UNION ALL SELECT 'reviews_before', COUNT(*) FROM reviews
UNION ALL SELECT 'notifications_before', COUNT(*) FROM notifications
UNION ALL SELECT 'worker_gallery_images_before', COUNT(*) FROM worker_gallery_images;

START TRANSACTION;

-- The reset is intentionally strict: keep only the two account rows and the
-- worker profile for userId 1011. All request/test history is removed.
DELETE FROM reviews;
DELETE FROM notifications;
DELETE FROM worker_gallery_images;
DELETE FROM requests;

DELETE FROM worker
WHERE userId <> @keep_worker_user_id;

DELETE FROM users
WHERE id NOT IN (@keep_client_user_id, @keep_worker_user_id);

-- Normalize roles so login/menu routing remains predictable after cleanup.
UPDATE users
SET role = 'client'
WHERE id = @keep_client_user_id;

UPDATE users
SET role = 'worker'
WHERE id = @keep_worker_user_id;

-- Keep the preserved worker usable in public grid/profile tests.
UPDATE worker
SET isApproved = 1
WHERE userId = @keep_worker_user_id;

-- Preview final row counts before COMMIT.
SELECT 'users_after' AS table_name, COUNT(*) AS rows_count FROM users
UNION ALL SELECT 'worker_after', COUNT(*) FROM worker
UNION ALL SELECT 'requests_after', COUNT(*) FROM requests
UNION ALL SELECT 'reviews_after', COUNT(*) FROM reviews
UNION ALL SELECT 'notifications_after', COUNT(*) FROM notifications
UNION ALL SELECT 'worker_gallery_images_after', COUNT(*) FROM worker_gallery_images;

SELECT
  'FINAL USERS' AS section,
  id,
  name,
  email,
  role
FROM users
ORDER BY id;

SELECT
  'FINAL WORKER PROFILE' AS section,
  id,
  userId,
  fullName,
  email,
  city,
  isApproved
FROM worker
ORDER BY userId;

-- If the preview above is correct, keep COMMIT.
-- If anything looks wrong before commit, replace COMMIT with ROLLBACK.
COMMIT;

-- Optional: these tables are empty after the reset, so their next ids can start clean.
ALTER TABLE requests AUTO_INCREMENT = 1;
ALTER TABLE reviews AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE worker_gallery_images AUTO_INCREMENT = 1;

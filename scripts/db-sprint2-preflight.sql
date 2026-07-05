-- Bricky Sprint 2 read-only database preflight.
-- Run against a restored/staging database before writing migrations.
-- This script does not modify schema or data.

SET @schema_name = DATABASE();

SELECT @schema_name AS active_schema;

SELECT
  table_name,
  table_rows,
  engine,
  table_collation
FROM information_schema.tables
WHERE table_schema = @schema_name
ORDER BY table_name;

SELECT
  table_name,
  column_name,
  column_type,
  is_nullable,
  column_default,
  column_key,
  extra
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name IN (
    'users',
    'worker',
    'worker_gallery_images',
    'requests',
    'request_applications',
    'request_images',
    'reviews',
    'notifications',
    'repair_categories'
  )
ORDER BY table_name, ordinal_position;

SELECT
  table_name,
  index_name,
  non_unique,
  GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
FROM information_schema.statistics
WHERE table_schema = @schema_name
GROUP BY table_name, index_name, non_unique
ORDER BY table_name, index_name;

SELECT
  table_name,
  constraint_name,
  referenced_table_name,
  GROUP_CONCAT(column_name ORDER BY ordinal_position) AS columns,
  GROUP_CONCAT(referenced_column_name ORDER BY ordinal_position) AS referenced_columns
FROM information_schema.key_column_usage
WHERE table_schema = @schema_name
  AND referenced_table_name IS NOT NULL
GROUP BY table_name, constraint_name, referenced_table_name
ORDER BY table_name, constraint_name;

-- Row counts. Add/remove UNION branches only after checking table existence.
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'worker', COUNT(*) FROM worker
UNION ALL SELECT 'worker_gallery_images', COUNT(*) FROM worker_gallery_images
UNION ALL SELECT 'requests', COUNT(*) FROM requests
UNION ALL SELECT 'request_applications', COUNT(*) FROM request_applications
UNION ALL SELECT 'request_images', COUNT(*) FROM request_images
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'repair_categories', COUNT(*) FROM repair_categories;

-- Identity and ownership integrity.
SELECT 'worker_without_user' AS check_name, COUNT(*) AS problem_count
FROM worker w
LEFT JOIN users u ON u.id = w.userId
WHERE u.id IS NULL
UNION ALL
SELECT 'duplicate_worker_profile', COUNT(*)
FROM (
  SELECT userId
  FROM worker
  GROUP BY userId
  HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'request_without_client', COUNT(*)
FROM requests r
LEFT JOIN users u ON u.id = r.clientId
WHERE r.clientId IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'request_assigned_to_missing_user', COUNT(*)
FROM requests r
LEFT JOIN users u ON u.id = r.assignedWorkerId
WHERE r.assignedWorkerId IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'request_completed_by_missing_user', COUNT(*)
FROM requests r
LEFT JOIN users u ON u.id = r.completedByWorkerId
WHERE r.completedByWorkerId IS NOT NULL AND u.id IS NULL;

-- Normalized request relation integrity.
SELECT 'application_without_request' AS check_name, COUNT(*) AS problem_count
FROM request_applications a
LEFT JOIN requests r ON r.id = a.requestId
WHERE r.id IS NULL
UNION ALL
SELECT 'application_without_worker_user', COUNT(*)
FROM request_applications a
LEFT JOIN users u ON u.id = a.workerUserId
WHERE u.id IS NULL
UNION ALL
SELECT 'duplicate_application', COUNT(*)
FROM (
  SELECT requestId, workerUserId
  FROM request_applications
  GROUP BY requestId, workerUserId
  HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'request_image_without_request', COUNT(*)
FROM request_images i
LEFT JOIN requests r ON r.id = i.requestId
WHERE r.id IS NULL
UNION ALL
SELECT 'request_image_without_uploader', COUNT(*)
FROM request_images i
LEFT JOIN users u ON u.id = i.uploaderUserId
WHERE i.uploaderUserId IS NOT NULL AND u.id IS NULL;

-- Review and notification integrity.
SELECT 'review_without_request' AS check_name, COUNT(*) AS problem_count
FROM reviews v
LEFT JOIN requests r ON r.id = v.requestId
WHERE r.id IS NULL
UNION ALL
SELECT 'review_without_client', COUNT(*)
FROM reviews v
LEFT JOIN users u ON u.id = v.clientUserId
WHERE u.id IS NULL
UNION ALL
SELECT 'review_without_worker', COUNT(*)
FROM reviews v
LEFT JOIN users u ON u.id = v.workerUserId
WHERE u.id IS NULL
UNION ALL
SELECT 'invalid_review_rating', COUNT(*)
FROM reviews
WHERE rating < 1 OR rating > 5
UNION ALL
SELECT 'notification_without_user', COUNT(*)
FROM notifications n
LEFT JOIN users u ON u.id = n.userId
WHERE u.id IS NULL
UNION ALL
SELECT 'notification_without_request', COUNT(*)
FROM notifications n
LEFT JOIN requests r ON r.id = n.requestId
WHERE n.requestId IS NOT NULL AND r.id IS NULL;

-- Current values that need mapping to stable machine constants.
SELECT status, COUNT(*) AS requests
FROM requests
GROUP BY status
ORDER BY requests DESC, status;

SELECT categoryKey, category, COUNT(*) AS requests
FROM requests
GROUP BY categoryKey, category
ORDER BY requests DESC, categoryKey, category;

SELECT role, COUNT(*) AS users
FROM users
GROUP BY role
ORDER BY users DESC, role;

-- Compatibility payload inventory.
SELECT
  SUM(CASE WHEN appliedWorkers IS NOT NULL AND appliedWorkers <> '' THEN 1 ELSE 0 END) AS requests_with_legacy_applications,
  SUM(CASE WHEN photos IS NOT NULL THEN 1 ELSE 0 END) AS requests_with_legacy_photos,
  SUM(CASE WHEN beforePhotos IS NOT NULL THEN 1 ELSE 0 END) AS requests_with_legacy_before_photos,
  SUM(CASE WHEN afterPhotos IS NOT NULL THEN 1 ELSE 0 END) AS requests_with_legacy_after_photos,
  SUM(CASE WHEN estimateMin IS NOT NULL OR estimateMax IS NOT NULL THEN 1 ELSE 0 END) AS requests_with_summary_estimate
FROM requests;

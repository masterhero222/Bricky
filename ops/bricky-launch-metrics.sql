-- Aggregated launch metrics only. No names, emails, phones or addresses.
SET @from_date = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY);

SELECT role, COUNT(*) AS registrations
FROM users
WHERE created_at >= @from_date
GROUP BY role
ORDER BY role;

SELECT approval_status, COUNT(*) AS workers
FROM worker_profiles
WHERE created_at >= @from_date
GROUP BY approval_status
ORDER BY approval_status;

SELECT status, COUNT(*) AS requests
FROM repair_requests
WHERE created_at >= @from_date
GROUP BY status
ORDER BY status;

SELECT event_type, COUNT(*) AS events
FROM repair_request_events
WHERE created_at >= @from_date
GROUP BY event_type
ORDER BY events DESC;

SELECT moderation_status, kind, COUNT(*) AS media_count
FROM media_assets
WHERE created_at >= @from_date
GROUP BY moderation_status, kind
ORDER BY kind, moderation_status;

SELECT COUNT(*) AS reviews,
       ROUND(AVG(rating), 2) AS average_rating
FROM repair_request_reviews
WHERE created_at >= @from_date;

SELECT action, COUNT(*) AS admin_actions
FROM admin_action_audit_logs
WHERE created_at >= @from_date
GROUP BY action
ORDER BY admin_actions DESC;

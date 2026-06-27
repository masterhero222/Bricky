-- Bricky request images/applications migration
-- Purpose:
-- - Move request candidates out of requests.appliedWorkers JSON.
-- - Move request before/after/gallery images out of requests JSON blobs.
--
-- Safety:
-- - Run a backup before this script.
-- - This script creates new tables only; it does not delete existing JSON data.
-- - Existing frontend/backend compatibility fields can remain during the transition.

CREATE TABLE IF NOT EXISTS request_applications (
  id INT NOT NULL AUTO_INCREMENT,
  requestId INT NOT NULL,
  workerUserId INT NOT NULL,
  status ENUM('applied', 'assigned', 'withdrawn', 'rejected') NOT NULL DEFAULT 'applied',
  offerMin DECIMAL(10, 2) NULL,
  offerMax DECIMAL(10, 2) NULL,
  message TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_applications_request_worker (requestId, workerUserId),
  KEY idx_request_applications_request (requestId),
  KEY idx_request_applications_worker (workerUserId),
  KEY idx_request_applications_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_images (
  id INT NOT NULL AUTO_INCREMENT,
  requestId INT NOT NULL,
  uploaderUserId INT NULL,
  kind ENUM('general', 'before', 'after') NOT NULL DEFAULT 'general',
  name VARCHAR(180) NULL,
  url LONGTEXT NOT NULL,
  storageKey VARCHAR(255) NULL,
  mimeType VARCHAR(120) NULL,
  sizeBytes INT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  isApproved TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_request_images_request (requestId),
  KEY idx_request_images_uploader (uploaderUserId),
  KEY idx_request_images_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backup example before running:
-- mysqldump -u <MYSQL_USER> -p --single-transaction --routines --triggers <DATABASE_NAME> > bricky-before-request-images-applications.sql

-- Rollback:
-- DROP TABLE IF EXISTS request_images;
-- DROP TABLE IF EXISTS request_applications;

-- Notes:
-- - Existing rows in requests.photos, requests.beforePhotos, requests.afterPhotos are not backfilled here.
-- - Backfill should be done with an application script after inspecting production JSON shape.

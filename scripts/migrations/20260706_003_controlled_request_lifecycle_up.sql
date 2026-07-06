ALTER TABLE requests MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'approved';

UPDATE requests SET status = CASE
  WHEN completedAt IS NOT NULL OR LOWER(status) IN ('completed', 'завършена') THEN 'completed'
  WHEN LOWER(status) IN ('canceled', 'cancelled', 'отказана') THEN 'canceled'
  WHEN assignedWorkerId IS NOT NULL THEN 'assigned'
  ELSE 'approved'
END;

ALTER TABLE requests
  ADD COLUMN workerArrivedAt DATETIME NULL AFTER status,
  ADD COLUMN workStartedAt DATETIME NULL AFTER workerArrivedAt,
  ADD COLUMN workReadyAt DATETIME NULL AFTER workStartedAt,
  ADD COLUMN clientConfirmedAt DATETIME NULL AFTER workReadyAt,
  ADD COLUMN disputedAt DATETIME NULL AFTER clientConfirmedAt,
  ADD COLUMN disputeReason TEXT NULL AFTER disputedAt;

ALTER TABLE request_images
  ADD COLUMN thumbnailUrl LONGTEXT NULL AFTER url,
  ADD COLUMN thumbnailStorageKey VARCHAR(255) NULL AFTER storageKey;

ALTER TABLE worker_gallery_images
  ADD COLUMN thumbnailUrl VARCHAR(255) NULL AFTER url,
  ADD COLUMN storageKey VARCHAR(255) NULL AFTER thumbnailUrl,
  ADD COLUMN thumbnailStorageKey VARCHAR(255) NULL AFTER storageKey;

ALTER TABLE workers ADD COLUMN avatarThumbnailUrl VARCHAR(255) NULL AFTER avatarUrl;

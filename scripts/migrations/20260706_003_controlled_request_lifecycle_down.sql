ALTER TABLE request_images DROP COLUMN thumbnailStorageKey, DROP COLUMN thumbnailUrl;
ALTER TABLE worker_gallery_images DROP COLUMN thumbnailStorageKey, DROP COLUMN storageKey, DROP COLUMN thumbnailUrl;
ALTER TABLE workers DROP COLUMN avatarThumbnailUrl;
ALTER TABLE requests
  DROP COLUMN disputeReason,
  DROP COLUMN disputedAt,
  DROP COLUMN clientConfirmedAt,
  DROP COLUMN workReadyAt,
  DROP COLUMN workStartedAt,
  DROP COLUMN workerArrivedAt;

ALTER TABLE repair_requests
  ADD COLUMN client_confirmed_at datetime NULL AFTER completed_at,
  ADD COLUMN archived_at datetime NULL AFTER client_confirmed_at,
  ADD COLUMN archive_reason varchar(40) NULL AFTER archived_at,
  ADD COLUMN archive_source varchar(40) NULL AFTER archive_reason,
  ADD COLUMN archived_by_user_id int NULL AFTER archive_source;

CREATE INDEX idx_repair_requests_client_archive_completed
  ON repair_requests (client_user_id, archived_at, completed_at);

CREATE INDEX idx_repair_requests_worker_archive_completed
  ON repair_requests (assigned_worker_user_id, archived_at, completed_at);

CREATE INDEX idx_repair_requests_status_archive_completed
  ON repair_requests (status, archived_at, completed_at);

ALTER TABLE repair_requests
  ADD CONSTRAINT fk_repair_requests_archived_by_user
  FOREIGN KEY (archived_by_user_id) REFERENCES users(id)
  ON DELETE SET NULL;

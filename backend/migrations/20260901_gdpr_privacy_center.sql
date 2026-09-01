CREATE TABLE IF NOT EXISTS user_legal_acceptances (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  document_type VARCHAR(20) NOT NULL,
  document_version VARCHAR(40) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'registration',
  ip_hash CHAR(64) NULL,
  user_agent_hash CHAR(64) NULL,
  accepted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_legal_acceptance (user_id, document_type, document_version),
  CONSTRAINT fk_legal_acceptance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS privacy_preferences (
  user_id INT NOT NULL PRIMARY KEY,
  analytics_consent TINYINT(1) NOT NULL DEFAULT 0,
  marketing_consent TINYINT(1) NOT NULL DEFAULT 0,
  consent_version VARCHAR(40) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_privacy_preference_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  request_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  details TEXT NOT NULL,
  response_notes TEXT NULL,
  due_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  requested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_privacy_request_user (user_id),
  INDEX idx_privacy_request_type (request_type),
  INDEX idx_privacy_request_status (status),
  CONSTRAINT fk_data_subject_request_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

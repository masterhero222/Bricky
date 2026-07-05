-- Minimal production-like legacy schema for Sprint 2 migration rehearsal.

CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE requests (
  id INT NOT NULL AUTO_INCREMENT,
  clientId INT NULL,
  clientName VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NULL,
  category VARCHAR(100) NULL,
  categoryKey VARCHAR(80) NULL,
  description TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  locationSource VARCHAR(50) NULL,
  estimateMin DECIMAL(10,2) NULL,
  estimateMax DECIMAL(10,2) NULL,
  estimateCurrency VARCHAR(30) NULL,
  photos JSON NULL,
  beforePhotos JSON NULL,
  afterPhotos JSON NULL,
  status ENUM('нова', 'кандидатствана', 'назначена', 'в процес', 'завършена', 'отказана') NOT NULL DEFAULT 'нова',
  appliedWorkers TEXT NULL,
  assignedWorkerId INT NULL,
  completedAt DATETIME NULL,
  completedByWorkerId INT NULL,
  durationDays INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_requests_client (clientId),
  CONSTRAINT fk_requests_client FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE request_images (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, requestId INT NOT NULL, uploaderUserId INT NULL,
  kind ENUM('general','before','after') NOT NULL DEFAULT 'general', name VARCHAR(180) NULL,
  url LONGTEXT NOT NULL, storageKey VARCHAR(255) NULL, mimeType VARCHAR(120) NULL,
  sizeBytes INT NULL, sortOrder INT NOT NULL DEFAULT 0, isApproved TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE worker_gallery_images (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL, url VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (id, name, email, password, role) VALUES
  (1008, 'Sprint Client', 'client@example.test', 'not-a-real-password', 'client'),
  (1011, 'Sprint Worker', 'worker@example.test', 'not-a-real-password', 'worker');

INSERT INTO requests (
  id, clientId, clientName, email, phone, address, category, categoryKey,
  description, estimateMin, estimateMax, estimateCurrency, status,
  appliedWorkers, assignedWorkerId, created_at
) VALUES
  (1, 1008, 'Sprint Client', 'client@example.test', '0000000000', 'Test address 1', 'ВиК ремонти', 'vik',
   'Legacy new request', 45, 95, 'EUR', 'нова', NULL, NULL, CURRENT_TIMESTAMP(6)),
  (2, 1008, 'Sprint Client', 'client@example.test', '0000000000', 'Test address 2', 'Плочки / теракот / гранитогрес', 'tiles',
   'Legacy assigned request', 520, 880, 'EUR', 'в процес', '1011', 1011, CURRENT_TIMESTAMP(6));

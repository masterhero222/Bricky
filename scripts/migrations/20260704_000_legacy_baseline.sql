-- Bricky versioned legacy baseline for a fresh database.
-- Existing installations may run this safely because every table uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'client',
  PRIMARY KEY (id), UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS requests (
  id INT NOT NULL AUTO_INCREMENT, clientId INT NULL, clientName VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL, phone VARCHAR(20) NOT NULL, address VARCHAR(255) NULL,
  category VARCHAR(100) NULL, categoryKey VARCHAR(80) NULL, description TEXT NULL,
  latitude DECIMAL(10,7) NULL, longitude DECIMAL(10,7) NULL, locationSource VARCHAR(50) NULL,
  estimateMin DECIMAL(10,2) NULL, estimateMax DECIMAL(10,2) NULL, estimateCurrency VARCHAR(30) NULL,
  photos JSON NULL, beforePhotos JSON NULL, afterPhotos JSON NULL,
  status ENUM('нова','кандидатствана','назначена','в процес','завършена','отказана') NOT NULL DEFAULT 'нова',
  appliedWorkers TEXT NULL, assignedWorkerId INT NULL, completedAt DATETIME NULL,
  completedByWorkerId INT NULL, durationDays INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id), KEY idx_requests_client (clientId),
  CONSTRAINT fk_requests_client FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_images (
  id INT NOT NULL AUTO_INCREMENT, requestId INT NOT NULL, uploaderUserId INT NULL,
  kind ENUM('general','before','after') NOT NULL DEFAULT 'general', name VARCHAR(180) NULL,
  url LONGTEXT NOT NULL, storageKey VARCHAR(255) NULL, mimeType VARCHAR(120) NULL,
  sizeBytes INT NULL, sortOrder INT NOT NULL DEFAULT 0, isApproved TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id),
  KEY idx_request_images_request (requestId), KEY idx_request_images_uploader (uploaderUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_applications (
  id INT NOT NULL AUTO_INCREMENT, requestId INT NOT NULL, workerUserId INT NOT NULL,
  status ENUM('applied','assigned','withdrawn','rejected') NOT NULL DEFAULT 'applied',
  offerMin DECIMAL(10,2) NULL, offerMax DECIMAL(10,2) NULL, message TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id), UNIQUE KEY uq_request_application (requestId, workerUserId),
  KEY idx_request_applications_request (requestId), KEY idx_request_applications_worker (workerUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_gallery_images (
  id INT NOT NULL AUTO_INCREMENT, userId INT NOT NULL, url VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id),
  KEY idx_worker_gallery_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker (
  id INT NOT NULL AUTO_INCREMENT, userId INT NOT NULL, fullName VARCHAR(255) NULL,
  email VARCHAR(255) NULL, password VARCHAR(255) NULL, phone VARCHAR(255) NULL,
  city VARCHAR(255) NULL, skills TEXT NULL, description TEXT NULL, experience TEXT NULL,
  equipment TEXT NULL, avatarUrl VARCHAR(255) NULL, isApproved TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id),
  UNIQUE KEY uq_worker_user (userId), UNIQUE KEY uq_worker_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id INT NOT NULL AUTO_INCREMENT, requestId INT NOT NULL, workerUserId INT NOT NULL,
  clientUserId INT NOT NULL, rating INT NOT NULL, comment TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), completedAt DATETIME NULL,
  completedByWorkerId INT NULL, PRIMARY KEY (id),
  UNIQUE KEY uq_review_request_client (requestId, clientUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT, userId INT NOT NULL, type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL, requestId INT NULL, isRead TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id),
  KEY idx_notifications_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

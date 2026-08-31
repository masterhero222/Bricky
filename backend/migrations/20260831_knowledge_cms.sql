-- Additive CMS migration. Import existing editorial content separately with import-knowledge.mjs.
CREATE TABLE IF NOT EXISTS knowledge_rubrics (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(240) NOT NULL,
  excerpt TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  content_type VARCHAR(30) NOT NULL DEFAULT 'ARTICLE',
  rubric_id INT NOT NULL,
  repair_category_id INT NULL,
  tags JSON NOT NULL,
  keywords JSON NOT NULL,
  blocks JSON NOT NULL,
  hero_image JSON NULL,
  seo_title VARCHAR(240) NOT NULL DEFAULT '',
  seo_description VARCHAR(400) NOT NULL DEFAULT '',
  author VARCHAR(140) NOT NULL DEFAULT '',
  calculator_category VARCHAR(80) NULL,
  related_articles JSON NOT NULL,
  featured TINYINT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  published_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_knowledge_public (status, deleted_at, rubric_id),
  CONSTRAINT fk_knowledge_rubric FOREIGN KEY (rubric_id) REFERENCES knowledge_rubrics(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO knowledge_rubrics (slug, label, description, sort_order) VALUES
('repairs', 'Ремонти', 'Ремонтни дейности, решения и чести проблеми.', 10),
('prices', 'Цени', 'Колко струва ремонтът и какво влиза в бюджета.', 20),
('workers', 'Майстори', 'Избор на професионалист и сравняване на оферти.', 30),
('projects', 'Реални обекти', 'Ремонтът преди, по време и след изпълнение.', 40),
('red-flags', 'Червени флагове', 'Сигнали, за които си струва да попитате.', 50),
('guides', 'Ръководства', 'От планирането до приемането на ремонта.', 60),
('how-bricky-works', 'Как работи Bricky', 'Калкулатор, заявки, профили и отзиви.', 70)
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

-- Bricky repair categories seed aligned with backend/src/requests/repair-catalog.ts.
-- Idempotent and safe to rerun after a database backup.

CREATE TABLE IF NOT EXISTS repair_categories (
  id INT NOT NULL AUTO_INCREMENT,
  category_key VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  category_group VARCHAR(80) NOT NULL,
  description TEXT NULL,
  pricing_unit VARCHAR(30) NULL,
  material_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  labor_min DECIMAL(10,2) NOT NULL DEFAULT 0,
  labor_max DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_categories_key (category_key),
  KEY idx_repair_categories_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO repair_categories
  (category_key, label, category_group, description, pricing_unit, material_price, labor_min, labor_max, sort_order, is_active)
VALUES
  ('vik', 'ВиК ремонти', 'Инсталации', 'Течове, смяна на смесител, сифон, тоалетно казанче, монтаж мивка, душ, бойлер, отпушване, смяна на тръби.', 'точка', 55, 45, 80, 10, 1),
  ('electro', 'Електро ремонти', 'Инсталации', 'Контакти, ключове, осветление, бушони, ел. табло, дефектни кръгове, нови точки, диагностика.', 'точка', 35, 35, 70, 20, 1),
  ('painting', 'Боядисване', 'Вътрешни ремонти', 'Боядисване на стаи, освежаване след наематели, боядисване след ремонт.', 'кв.м', 10, 8, 18, 30, 1),
  ('plaster', 'Шпакловка и мазилки', 'Вътрешни ремонти', 'Изправяне на стени, фина шпакловка, ремонт на напукани стени, подготовка за боядисване.', 'кв.м', 18, 18, 30, 40, 1),
  ('tiles', 'Плочки / теракот / гранитогрес', 'Вътрешни ремонти', 'Лепене на плочки, смяна на счупени плочки, фугиране, тераси, кухни, коридори.', 'кв.м', 40, 35, 65, 50, 1),
  ('bathroom_renovation', 'Ремонт на баня', 'Вътрешни ремонти', 'Цялостна баня, ВиК, плочки, санитария и хидроизолация.', 'кв.м', 180, 140, 260, 60, 1),
  ('drywall', 'Гипсокартон', 'Вътрешни ремонти', 'Предстенни обшивки, окачени тавани, преградни стени, скриване на тръби и кабели.', 'кв.м', 35, 28, 55, 70, 1),
  ('flooring', 'Подови настилки', 'Вътрешни ремонти', 'Ламинат, паркет, винил, первази, замазка и саморазливна замазка.', 'кв.м', 45, 20, 45, 80, 1),
  ('heating_cooling', 'Климатици / отопление', 'Инсталации', 'Монтаж, демонтаж, профилактика, ремонт и преместване на климатик.', 'бр.', 90, 70, 160, 90, 1),
  ('windows_doors', 'Врати и дограма', 'Монтажи', 'Монтаж и ремонт на интериорни и входни врати, регулиране, силикон и обков.', 'бр.', 80, 60, 140, 100, 1),
  ('furniture_mounting', 'Мебели и монтажи', 'Монтажи', 'Сглобяване на мебели, монтаж на кухни, шкафове, рафтове, корнизи и телевизори.', 'бр.', 20, 35, 90, 110, 1),
  ('roof_waterproofing', 'Покриви и хидроизолация', 'Външни ремонти', 'Течове от покрив, улуци, керемиди, тераси и хидроизолация.', 'кв.м', 85, 60, 130, 120, 1),
  ('demolition_cleanup', 'Къртене, чистене, извозване', 'Подготовка', 'Демонтаж, къртене на плочки и извозване на строителни отпадъци.', 'кв.м', 5, 20, 55, 130, 1),
  ('full_renovation', 'Цялостен ремонт', 'Проект', 'Ремонт на апартамент или къща до ключ, довършителни работи и организация на бригади.', 'кв.м', 220, 180, 360, 140, 1),
  ('small_repairs', 'Дребни домашни ремонти', 'Домашни ремонти', 'Малки поправки, монтажи, настройки, дребни аварии и задачи около дома.', 'бр.', 15, 25, 70, 150, 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  category_group = VALUES(category_group),
  description = VALUES(description),
  pricing_unit = VALUES(pricing_unit),
  material_price = VALUES(material_price),
  labor_min = VALUES(labor_min),
  labor_max = VALUES(labor_max),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

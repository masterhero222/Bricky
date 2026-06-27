-- Bricky repair categories seed.
--
-- Purpose:
--   Store the repair types used by request forms, map filters, worker skills,
--   pricing estimates, and future moderation rules in the database.
--
-- Run after a backup and before rebuilding the request model.

USE bricky;

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
);

INSERT INTO repair_categories
  (category_key, label, category_group, description, pricing_unit, material_price, labor_min, labor_max, sort_order, is_active)
VALUES
  ('vik', 'ВиК', 'Инсталации', 'Течове, сифони, смесители, бойлери, мивки и тръби.', 'точка', 55, 45, 80, 10, 1),
  ('electro', 'Електро', 'Инсталации', 'Контакти, ключове, лампи, табла и аварийни електро ремонти.', 'точка', 35, 35, 70, 20, 1),
  ('electrical_installation', 'Електро инсталация', 'Инсталации', 'Нова или частична електро инсталация, кабели, табла и точки.', 'точка', 55, 60, 110, 30, 1),
  ('bathroom_renovation', 'Ремонт на бани', 'Вътрешни ремонти', 'Цялостен или частичен ремонт на баня, ВиК, плочки и санитария.', 'кв.м', 180, 140, 260, 40, 1),
  ('tiles', 'Плочки', 'Вътрешни ремонти', 'Лепене на плочки, фаянс, теракот, гранитогрес и фугиране.', 'кв.м', 40, 35, 65, 50, 1),
  ('plaster_paint', 'Шпакловка и боя', 'Вътрешни ремонти', 'Шпакловане, изправяне на стени, тавани и боядисване.', 'кв.м', 18, 18, 30, 60, 1),
  ('repainting', 'Пребоядисване', 'Вътрешни ремонти', 'Бързо освежаване и пребоядисване на стени и тавани.', 'кв.м', 10, 8, 18, 70, 1),
  ('refresh_renovation', 'Освежителен ремонт', 'Вътрешни ремонти', 'Лек ремонт с освежаване, дребни поправки и довършителни дейности.', 'кв.м', 22, 18, 35, 80, 1),
  ('major_renovation', 'Основен ремонт', 'Вътрешни ремонти', 'Цялостен ремонт на жилище или помещение с няколко вида дейности.', 'кв.м', 220, 180, 360, 90, 1),
  ('roof_repair', 'Ремонт на покриви', 'Външни ремонти', 'Керемиди, улуци, течове, хидроизолация и конструктивни поправки.', 'кв.м', 85, 60, 130, 100, 1),
  ('drywall', 'Гипсокартон', 'Вътрешни ремонти', 'Преградни стени, предстенни обшивки, окачени тавани и ниши.', 'кв.м', 35, 28, 55, 110, 1),
  ('flooring', 'Подови настилки', 'Вътрешни ремонти', 'Ламинат, паркет, винил, первази и подготвяне на основа.', 'кв.м', 45, 20, 45, 120, 1),
  ('masonry_plaster', 'Зидария и мазилки', 'Груб строеж', 'Зидане, измазване, корекции по стени и груби строителни работи.', 'кв.м', 35, 35, 75, 130, 1),
  ('insulation', 'Изолация', 'Външни ремонти', 'Топлоизолация, хидроизолация и частични изолационни ремонти.', 'кв.м', 65, 45, 90, 140, 1),
  ('windows_doors', 'Дограма и врати', 'Монтажи', 'Монтаж, регулиране и ремонт на дограма, врати и обков.', 'бр.', 80, 60, 140, 150, 1),
  ('heating_cooling', 'Отопление и климатици', 'Инсталации', 'Радиатори, термостати, климатици и отоплителни тела.', 'бр.', 90, 70, 160, 160, 1),
  ('demolition_cleanup', 'Къртене и извозване', 'Подготовка', 'Къртене, демонтаж, изнасяне и извозване на строителни отпадъци.', 'кв.м', 5, 20, 55, 170, 1),
  ('other', 'Друг ремонт', 'Други', 'Ремонтна дейност, която не попада в основните категории.', NULL, 0, 0, 0, 999, 1)
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

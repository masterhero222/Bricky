export const REPAIR_CATEGORIES = [
  {
    key: 'vik',
    label: 'ВиК ремонти',
    group: 'Инсталации',
    description:
      'Течове, смяна на смесител, сифон, тоалетно казанче, монтаж мивка, душ, бойлер, отпушване, смяна на тръби.',
    unit: 'точка',
    material: 55,
    laborMin: 45,
    laborMax: 80,
  },
  {
    key: 'electro',
    label: 'Електро ремонти',
    group: 'Инсталации',
    description:
      'Контакти, ключове, осветление, бушони, ел. табло, дефектни кръгове, нови точки, диагностика.',
    unit: 'точка',
    material: 35,
    laborMin: 35,
    laborMax: 70,
  },
  {
    key: 'painting',
    label: 'Боядисване',
    group: 'Вътрешни ремонти',
    description: 'Боядисване на стаи, освежаване след наематели, боядисване след ремонт.',
    unit: 'кв.м',
    material: 10,
    laborMin: 8,
    laborMax: 18,
  },
  {
    key: 'plaster',
    label: 'Шпакловка и мазилки',
    group: 'Вътрешни ремонти',
    description:
      'Изправяне на стени, фина шпакловка, ремонт на напукани стени, подготовка за боядисване.',
    unit: 'кв.м',
    material: 18,
    laborMin: 18,
    laborMax: 30,
  },
  {
    key: 'tiles',
    label: 'Плочки / теракот / гранитогрес',
    group: 'Вътрешни ремонти',
    description: 'Лепене на плочки, смяна на счупени плочки, фугиране, тераси, кухни, коридори.',
    unit: 'кв.м',
    material: 40,
    laborMin: 35,
    laborMax: 65,
  },
  {
    key: 'bathroom_renovation',
    label: 'Ремонт на баня',
    group: 'Вътрешни ремонти',
    description: 'Цялостна баня, ВиК, плочки, санитария и хидроизолация.',
    unit: 'кв.м',
    material: 180,
    laborMin: 140,
    laborMax: 260,
  },
  {
    key: 'drywall',
    label: 'Гипсокартон',
    group: 'Вътрешни ремонти',
    description: 'Предстенни обшивки, окачени тавани, преградни стени, скриване на тръби/кабели.',
    unit: 'кв.м',
    material: 35,
    laborMin: 28,
    laborMax: 55,
  },
  {
    key: 'flooring',
    label: 'Подови настилки',
    group: 'Вътрешни ремонти',
    description: 'Ламинат, паркет, винил, первази, замазка, саморазливна замазка.',
    unit: 'кв.м',
    material: 45,
    laborMin: 20,
    laborMax: 45,
  },
  {
    key: 'heating_cooling',
    label: 'Климатици / отопление',
    group: 'Инсталации',
    description: 'Монтаж, демонтаж, профилактика, ремонт, преместване на климатик.',
    unit: 'бр.',
    material: 90,
    laborMin: 70,
    laborMax: 160,
  },
  {
    key: 'windows_doors',
    label: 'Врати и дограма',
    group: 'Монтажи',
    description: 'Монтаж/ремонт на интериорни врати, входни врати, регулиране, силикон, обков.',
    unit: 'бр.',
    material: 80,
    laborMin: 60,
    laborMax: 140,
  },
  {
    key: 'furniture_mounting',
    label: 'Мебели и монтажи',
    group: 'Монтажи',
    description: 'Сглобяване на мебели, монтаж кухни, шкафове, рафтове, корнизи, телевизори.',
    unit: 'бр.',
    material: 20,
    laborMin: 35,
    laborMax: 90,
  },
  {
    key: 'roof_waterproofing',
    label: 'Покриви и хидроизолация',
    group: 'Външни ремонти',
    description: 'Течове от покрив, улуци, керемиди, тераси, хидроизолация.',
    unit: 'кв.м',
    material: 85,
    laborMin: 60,
    laborMax: 130,
  },
  {
    key: 'demolition_cleanup',
    label: 'Къртене, чистене, извозване',
    group: 'Подготовка',
    description: 'Демонтаж, къртене на плочки, извозване на строителни отпадъци.',
    unit: 'кв.м',
    material: 5,
    laborMin: 20,
    laborMax: 55,
  },
  {
    key: 'full_renovation',
    label: 'Цялостен ремонт',
    group: 'Проект',
    description:
      'Ремонт на апартамент/къща до ключ, довършителни работи, организация на бригади.',
    unit: 'кв.м',
    material: 220,
    laborMin: 180,
    laborMax: 360,
  },
  {
    key: 'small_repairs',
    label: 'Дребни домашни ремонти',
    group: 'Домашни ремонти',
    description: 'Малки поправки, монтажи, настройки, дребни аварии и задачи около дома.',
    unit: 'бр.',
    material: 15,
    laborMin: 25,
    laborMax: 70,
  },
] as const;

export type RepairCategoryKey = (typeof REPAIR_CATEGORIES)[number]['key'];

export const REPAIR_CATEGORY_LABELS = REPAIR_CATEGORIES.map((category) => category.label);
export const REPAIR_CATEGORY_KEYS = REPAIR_CATEGORIES.map((category) => category.key);

export const REPAIR_CATEGORY_BY_KEY = REPAIR_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.key] = category.label;
    return acc;
  },
  {} as Record<RepairCategoryKey, string>,
);

const LEGACY_CATEGORY_KEY_MAP: Record<string, RepairCategoryKey> = {
  electrical_installation: 'electro',
  plaster_paint: 'plaster',
  repainting: 'painting',
  refresh_renovation: 'painting',
  major_renovation: 'full_renovation',
  roof_repair: 'roof_waterproofing',
  masonry_plaster: 'plaster',
  insulation: 'roof_waterproofing',
  other: 'small_repairs',
};

export function normalizeRepairCategoryKey(value: any): RepairCategoryKey {
  const key = typeof value === 'string' ? value.trim() : '';
  if (REPAIR_CATEGORY_KEYS.includes(key as RepairCategoryKey)) return key as RepairCategoryKey;
  return LEGACY_CATEGORY_KEY_MAP[key] || 'small_repairs';
}

export function normalizeRepairCategoryLabel(value: any): string {
  const text = typeof value === 'string' ? value.trim() : '';
  const byLabel = REPAIR_CATEGORIES.find((category) => category.label === text);
  if (byLabel) return byLabel.label;

  const byKey = REPAIR_CATEGORIES.find((category) => category.key === text);
  if (byKey) return byKey.label;

  return REPAIR_CATEGORY_BY_KEY[normalizeRepairCategoryKey(text)];
}

export function getRepairCategoryByKey(value: any) {
  const key = normalizeRepairCategoryKey(value);
  return REPAIR_CATEGORIES.find((category) => category.key === key) || REPAIR_CATEGORIES[0];
}

export function getRepairCategoryByLabel(value: any) {
  const label = normalizeRepairCategoryLabel(value);
  return REPAIR_CATEGORIES.find((category) => category.label === label) || REPAIR_CATEGORIES[0];
}

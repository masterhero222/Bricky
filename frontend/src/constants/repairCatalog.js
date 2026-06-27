export const REPAIR_CATEGORY_OPTIONS = [
  {
    key: "vik",
    label: "ВиК ремонти",
    shortLabel: "ВиК",
    group: "Инсталации",
    icon: "droplets",
    description: "Течове, смяна на смесител, сифон, тоалетно казанче, монтаж мивка, душ, бойлер, отпушване, смяна на тръби.",
    unit: "точка",
    material: 55,
    laborMin: 45,
    laborMax: 80,
  },
  {
    key: "electro",
    label: "Електро ремонти",
    shortLabel: "Електро",
    group: "Инсталации",
    icon: "zap",
    description: "Контакти, ключове, осветление, бушони, ел. табло, дефектни кръгове, нови точки, диагностика.",
    unit: "точка",
    material: 35,
    laborMin: 35,
    laborMax: 70,
  },
  {
    key: "painting",
    label: "Боядисване",
    shortLabel: "Боядисване",
    group: "Вътрешни ремонти",
    icon: "paint-roller",
    description: "Боядисване на стаи, освежаване след наематели, боядисване след ремонт.",
    unit: "кв.м",
    material: 10,
    laborMin: 8,
    laborMax: 18,
  },
  {
    key: "plaster",
    label: "Шпакловка и мазилки",
    shortLabel: "Шпакловка",
    group: "Вътрешни ремонти",
    icon: "brush",
    description: "Изправяне на стени, фина шпакловка, ремонт на напукани стени, подготовка за боядисване.",
    unit: "кв.м",
    material: 18,
    laborMin: 18,
    laborMax: 30,
  },
  {
    key: "tiles",
    label: "Плочки / теракот / гранитогрес",
    shortLabel: "Плочки",
    group: "Вътрешни ремонти",
    icon: "grid",
    description: "Лепене на плочки, смяна на счупени плочки, фугиране, тераси, кухни, коридори.",
    unit: "кв.м",
    material: 40,
    laborMin: 35,
    laborMax: 65,
  },
  {
    key: "bathroom_renovation",
    label: "Ремонт на баня",
    shortLabel: "Баня",
    group: "Вътрешни ремонти",
    icon: "bath",
    description: "Цялостна баня, ВиК, плочки, санитария и хидроизолация.",
    unit: "кв.м",
    material: 180,
    laborMin: 140,
    laborMax: 260,
  },
  {
    key: "drywall",
    label: "Гипсокартон",
    shortLabel: "Гипсокартон",
    group: "Вътрешни ремонти",
    icon: "panels",
    description: "Предстенни обшивки, окачени тавани, преградни стени, скриване на тръби/кабели.",
    unit: "кв.м",
    material: 35,
    laborMin: 28,
    laborMax: 55,
  },
  {
    key: "flooring",
    label: "Подови настилки",
    shortLabel: "Подове",
    group: "Вътрешни ремонти",
    icon: "layers",
    description: "Ламинат, паркет, винил, первази, замазка, саморазливна замазка.",
    unit: "кв.м",
    material: 45,
    laborMin: 20,
    laborMax: 45,
  },
  {
    key: "heating_cooling",
    label: "Климатици / отопление",
    shortLabel: "Климатици",
    group: "Инсталации",
    icon: "thermometer",
    description: "Монтаж, демонтаж, профилактика, ремонт, преместване на климатик.",
    unit: "бр.",
    material: 90,
    laborMin: 70,
    laborMax: 160,
  },
  {
    key: "windows_doors",
    label: "Врати и дограма",
    shortLabel: "Дограма",
    group: "Монтажи",
    icon: "door",
    description: "Монтаж/ремонт на интериорни врати, входни врати, регулиране, силикон, обков.",
    unit: "бр.",
    material: 80,
    laborMin: 60,
    laborMax: 140,
  },
  {
    key: "furniture_mounting",
    label: "Мебели и монтажи",
    shortLabel: "Монтажи",
    group: "Монтажи",
    icon: "hammer",
    description: "Сглобяване на мебели, монтаж кухни, шкафове, рафтове, корнизи, телевизори.",
    unit: "бр.",
    material: 20,
    laborMin: 35,
    laborMax: 90,
  },
  {
    key: "roof_waterproofing",
    label: "Покриви и хидроизолация",
    shortLabel: "Покриви",
    group: "Външни ремонти",
    icon: "home",
    description: "Течове от покрив, улуци, керемиди, тераси, хидроизолация.",
    unit: "кв.м",
    material: 85,
    laborMin: 60,
    laborMax: 130,
  },
  {
    key: "demolition_cleanup",
    label: "Къртене, чистене, извозване",
    shortLabel: "Къртене",
    group: "Подготовка",
    icon: "trash",
    description: "Демонтаж, къртене на плочки, извозване на строителни отпадъци.",
    unit: "кв.м",
    material: 5,
    laborMin: 20,
    laborMax: 55,
  },
  {
    key: "full_renovation",
    label: "Цялостен ремонт",
    shortLabel: "Цялостен",
    group: "Проект",
    icon: "key",
    description: "Ремонт на апартамент/къща до ключ, довършителни работи, организация на бригади.",
    unit: "кв.м",
    material: 220,
    laborMin: 180,
    laborMax: 360,
  },
  {
    key: "small_repairs",
    label: "Дребни домашни ремонти",
    shortLabel: "Дребни",
    group: "Домашни ремонти",
    icon: "wrench",
    description: "Малки поправки, монтажи, настройки, дребни аварии и задачи около дома.",
    unit: "бр.",
    material: 15,
    laborMin: 25,
    laborMax: 70,
  },
];

export const REPAIR_CATEGORY_FLOW = {
  vik: {
    activities: ["Отстраняване на теч", "Смяна на смесител", "Сифон", "Тоалетно казанче", "Монтаж мивка", "Душ", "Бойлер", "Отпушване", "Смяна на тръби"],
    quantityOptions: ["1 точка", "2-3 точки", "4+ точки", "Не знам"],
  },
  electro: {
    activities: ["Контакти", "Ключове", "Осветление", "Бушони", "Ел. табло", "Дефектни кръгове", "Нови точки", "Диагностика"],
    quantityOptions: ["1 точка", "2-5 точки", "6+ точки", "Не знам"],
  },
  painting: {
    activities: ["Боядисване на стая", "Освежаване след наематели", "Боядисване след ремонт", "Таван", "Коридор", "Цял апартамент"],
    quantityOptions: ["1 стая", "2-3 стаи", "Цял апартамент", "Не знам"],
  },
  plaster: {
    activities: ["Изправяне на стени", "Фина шпакловка", "Напукани стени", "Подготовка за боядисване", "Мазилка", "Таван"],
    quantityOptions: ["до 20 кв.м", "21-50 кв.м", "51-100 кв.м", "100+ кв.м"],
  },
  tiles: {
    activities: ["Лепене на плочки", "Смяна на счупени плочки", "Фугиране", "Тераса", "Кухня", "Коридор"],
    quantityOptions: ["до 5 кв.м", "6-15 кв.м", "16-30 кв.м", "30+ кв.м"],
  },
  bathroom_renovation: {
    activities: ["Цялостна баня", "ВиК", "Плочки", "Санитария", "Хидроизолация", "Къртене"],
    quantityOptions: ["до 3 кв.м", "4-6 кв.м", "7-10 кв.м", "10+ кв.м"],
  },
  drywall: {
    activities: ["Предстенна обшивка", "Окачен таван", "Преградна стена", "Скриване на тръби", "Скриване на кабели", "Ниша"],
    quantityOptions: ["до 10 кв.м", "11-30 кв.м", "31-60 кв.м", "60+ кв.м"],
  },
  flooring: {
    activities: ["Ламинат", "Паркет", "Винил", "Первази", "Замазка", "Саморазливна замазка"],
    quantityOptions: ["до 15 кв.м", "16-40 кв.м", "41-80 кв.м", "80+ кв.м"],
  },
  heating_cooling: {
    activities: ["Монтаж", "Демонтаж", "Профилактика", "Ремонт", "Преместване на климатик", "Отопление"],
    quantityOptions: ["1 бр.", "2-3 бр.", "4+ бр.", "Не знам"],
  },
  windows_doors: {
    activities: ["Интериорна врата", "Входна врата", "Регулиране", "Силикон", "Обков", "Дограма"],
    quantityOptions: ["1 бр.", "2-3 бр.", "4+ бр.", "Не знам"],
  },
  furniture_mounting: {
    activities: ["Сглобяване на мебели", "Монтаж кухня", "Шкафове", "Рафтове", "Корнизи", "Телевизор"],
    quantityOptions: ["1 бр.", "2-5 бр.", "6+ бр.", "Не знам"],
  },
  roof_waterproofing: {
    activities: ["Теч от покрив", "Улуци", "Керемиди", "Тераса", "Хидроизолация", "Частичен ремонт"],
    quantityOptions: ["до 20 кв.м", "21-50 кв.м", "51-100 кв.м", "100+ кв.м"],
  },
  demolition_cleanup: {
    activities: ["Демонтаж", "Къртене на плочки", "Къртене", "Извозване", "Строителни отпадъци", "Почистване"],
    quantityOptions: ["малко количество", "до 2 куб.м", "3-6 куб.м", "6+ куб.м"],
  },
  full_renovation: {
    activities: ["Апартамент до ключ", "Къща до ключ", "Довършителни работи", "Организация на бригади", "Електро", "ВиК", "Баня", "Подове"],
    quantityOptions: ["до 40 кв.м", "41-70 кв.м", "71-100 кв.м", "100+ кв.м"],
  },
  small_repairs: {
    activities: ["Малки поправки", "Дребни монтажи", "Настройки", "Домашна авария", "Закачане/монтаж", "Друго"],
    quantityOptions: ["1 задача", "2-3 задачи", "4+ задачи", "Не знам"],
  },
};

export const REPAIR_CATEGORIES = REPAIR_CATEGORY_OPTIONS.map((category) => category.label);

export const REPAIR_PRICE_PRESETS = REPAIR_CATEGORY_OPTIONS.reduce((acc, category) => {
  acc[category.label] = {
    unit: category.unit,
    material: category.material,
    laborMin: category.laborMin,
    laborMax: category.laborMax,
  };
  return acc;
}, {});

export function getRepairCategoryByKey(key) {
  return REPAIR_CATEGORY_OPTIONS.find((category) => category.key === key) || null;
}

export function getRepairCategoryByLabel(label) {
  return REPAIR_CATEGORY_OPTIONS.find((category) => category.label === label) || null;
}

export function estimateRepairPrice(category, quantity) {
  const preset = REPAIR_PRICE_PRESETS[category];
  const qty = Number(quantity) || 0;
  if (!preset || qty <= 0) {
    return { materials: 0, laborMin: 0, laborMax: 0, totalMin: 0, totalMax: 0, unit: "" };
  }

  const materials = Math.round(qty * preset.material);
  const laborMin = Math.round(qty * preset.laborMin);
  const laborMax = Math.round(qty * preset.laborMax);

  return {
    materials,
    laborMin,
    laborMax,
    totalMin: materials + laborMin,
    totalMax: materials + laborMax,
    unit: preset.unit,
  };
}

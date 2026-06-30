const activity = (key, label, unitType, laborMin, laborMax, options = {}) => ({
  key,
  label,
  unitType,
  laborMin,
  laborMax,
  materialMin: null,
  materialMax: null,
  productIncludedByDefault: false,
  sharedVisitEligible: false,
  isBundle: false,
  includes: [],
  excludes: [],
  ...options,
});

const LOCKED_LABOR_ONLY = new Set([
  "electro.diagnostics",
  "heating_cooling.maintenance",
  "windows_doors.adjustment",
  "small_repairs.adjustments",
]);

const LOCKED_LABOR_PLUS_MATERIALS = new Set([
  "vik.siphon",
  "vik.cistern",
  "electro.sockets",
  "electro.switches",
  "electro.fuses",
  "furniture_mounting.shelves",
  "furniture_mounting.curtain_rods",
  "small_repairs.small_installations",
  "small_repairs.hanging_installation",
]);

const AREA_BASED_ACTIVITIES = new Set([
  "painting.room",
  "painting.rental_refresh",
  "painting.after_renovation",
  "painting.ceiling",
  "bathroom_renovation.bathroom_tiles",
  "bathroom_renovation.waterproofing",
  "roof_waterproofing.tiles",
  "roof_waterproofing.terrace",
  "roof_waterproofing.waterproofing",
  "full_renovation.floors",
]);

const INSPECTION_REQUIRED_ACTIVITIES = new Set([
  "vik.leak_repair",
  "demolition_cleanup.demolition",
]);

function getPricingModeBehavior(categoryKey, item) {
  const compoundKey = `${categoryKey}.${item.key}`;
  if (item.requiresInspection || INSPECTION_REQUIRED_ACTIVITIES.has(compoundKey)) return "inspection_required";
  if (LOCKED_LABOR_ONLY.has(compoundKey)) return "locked_labor_only";
  if (LOCKED_LABOR_PLUS_MATERIALS.has(compoundKey)) return "locked_labor_plus_materials";
  return "user_selectable";
}

export const REPAIR_PRICING_CONFIG = {
  currency: "EUR",
  pricingVersion: "2026-v0.2",
  rounding: "ceil_to_5",
  materialPricingStatus: "research_pending",
  sourceNote: "Initial owner-supplied market research; validate with 3-5 active workers before production use.",
  categories: {
    vik: {
      label: "ВиК ремонти",
      defaultEstimate: { laborMin: 45, laborMax: 150 },
      activities: [
        activity("leak_repair", "Отстраняване на теч", "task", 45, 95, { minimumVisitPrice: 60, sharedVisitEligible: true }),
        activity("faucet", "Смяна на смесител", "item", 35, 65, { minimumVisitPrice: 50, sharedVisitEligible: true }),
        activity("siphon", "Сифон", "item", 20, 50, { minimumVisitPrice: 45, sharedVisitEligible: true }),
        activity("cistern", "Тоалетно казанче", "item", 30, 65, { minimumVisitPrice: 50, sharedVisitEligible: true }),
        activity("sink", "Монтаж мивка", "item", 45, 85, { minimumVisitPrice: 55, sharedVisitEligible: true }),
        activity("shower", "Душ", "item", 35, 60, { minimumVisitPrice: 50, sharedVisitEligible: true }),
        activity("boiler", "Бойлер", "item", 55, 105, { minimumVisitPrice: 65 }),
        activity("unblocking", "Отпушване", "task", 50, 95, { minimumVisitPrice: 60, sharedVisitEligible: true }),
        activity("pipe_replacement", "Смяна на тръби", "project", 65, 250, { requiresInspection: true }),
      ],
    },
    electro: {
      label: "Електро ремонти",
      defaultEstimate: { laborMin: 30, laborMax: 140 },
      activities: [
        activity("sockets", "Контакти", "item", 25, 45, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("switches", "Ключове", "item", 25, 45, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("lighting", "Осветление", "item", 25, 60, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("fuses", "Бушони", "item", 25, 55, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("panel", "Ел. табло", "project", 80, 180, { requiresInspection: true, safetyWarning: true }),
        activity("faulty_circuit", "Дефектни кръгове", "task", 50, 140, { requiresInspection: true, safetyWarning: true }),
        activity("new_points", "Нови точки", "item", 50, 120, { minimumVisitPrice: 60 }),
        activity("diagnostics", "Диагностика", "task", 30, 60, { minimumVisitPrice: 40, safetyWarning: true }),
      ],
    },
    painting: {
      label: "Боядисване",
      defaultEstimate: { laborMin: 90, laborMax: 250 },
      activities: [
        activity("room", "Боядисване на стая", "room", 120, 250),
        activity("rental_refresh", "Освежаване след наематели", "room", 90, 180),
        activity("after_renovation", "Боядисване след ремонт", "room", 180, 350),
        activity("ceiling", "Таван", "room", 50, 110),
        activity("corridor", "Коридор", "task", 80, 180),
        activity("apartment", "Цял апартамент", "project", 700, 1600, { isBundle: true }),
      ],
    },
    plaster: {
      label: "Шпакловка и мазилки",
      defaultEstimate: { laborMin: 100, laborMax: 500 },
      activities: [
        activity("wall_leveling", "Изправяне на стени", "m2", 10, 15),
        activity("fine_putty", "Фина шпакловка", "m2", 7, 10),
        activity("cracked_walls", "Напукани стени", "m2", 8, 15),
        activity("paint_preparation", "Подготовка за боядисване", "m2", 5, 10),
        activity("plaster", "Мазилка", "m2", 15, 25),
        activity("ceiling", "Таван", "m2", 10, 15),
      ],
    },
    tiles: {
      label: "Плочки / теракот / гранитогрес",
      defaultEstimate: { laborMin: 175, laborMax: 825 },
      activities: [
        activity("tile_laying", "Лепене на плочки", "m2", 35, 55),
        activity("broken_tiles", "Смяна на счупени плочки", "task", 50, 90, { minimumVisitPrice: 50 }),
        activity("grouting", "Фугиране", "m2", 10, 15),
        activity("terrace", "Тераса", "m2", 45, 70),
        activity("kitchen", "Кухня", "m2", 40, 60),
        activity("corridor", "Коридор", "m2", 35, 55),
      ],
    },
    bathroom_renovation: {
      label: "Ремонт на баня",
      defaultEstimate: { laborMin: 1200, laborMax: 2500 },
      activities: [
        activity("full_bathroom", "Цялостна баня", "project", 1200, 2500, {
          isBundle: true,
          includes: ["bathroom_plumbing", "bathroom_tiles", "sanitary", "waterproofing", "demolition"],
          requiresInspection: true,
        }),
        activity("bathroom_plumbing", "ВиК", "package", 300, 700),
        activity("bathroom_tiles", "Плочки", "package", 800, 1400),
        activity("sanitary", "Санитария", "package", 250, 700),
        activity("waterproofing", "Хидроизолация", "package", 120, 300),
        activity("demolition", "Къртене", "package", 200, 500),
      ],
    },
    drywall: {
      label: "Гипсокартон",
      defaultEstimate: { laborMin: 200, laborMax: 900 },
      activities: [
        activity("wall_lining", "Предстенна обшивка", "m2", 20, 30),
        activity("suspended_ceiling", "Окачен таван", "m2", 25, 45),
        activity("partition_wall", "Преградна стена", "m2", 30, 50),
        activity("hide_pipes", "Скриване на тръби", "task", 80, 200, { minimumVisitPrice: 80 }),
        activity("hide_cables", "Скриване на кабели", "task", 70, 180, { minimumVisitPrice: 70 }),
        activity("niche", "Ниша", "item", 120, 350, { minimumVisitPrice: 120 }),
      ],
    },
    flooring: {
      label: "Подови настилки",
      defaultEstimate: { laborMin: 150, laborMax: 700 },
      activities: [
        activity("laminate", "Ламинат", "m2", 10, 15),
        activity("parquet", "Паркет", "m2", 15, 30),
        activity("vinyl", "Винил", "m2", 10, 20),
        activity("skirting", "Первази", "linear_meter", 5, 10),
        activity("screed", "Замазка", "m2", 20, 35),
        activity("self_leveling", "Саморазливна замазка", "m2", 20, 30),
      ],
    },
    heating_cooling: {
      label: "Климатици / отопление",
      defaultEstimate: { laborMin: 40, laborMax: 280 },
      activities: [
        activity("installation", "Монтаж", "item", 180, 280),
        activity("removal", "Демонтаж", "item", 45, 80, { sharedVisitEligible: true }),
        activity("maintenance", "Профилактика", "item", 40, 70, { minimumVisitPrice: 50, sharedVisitEligible: true }),
        activity("repair", "Ремонт", "task", 60, 220, { requiresInspection: true }),
        activity("relocation", "Преместване на климатик", "package", 180, 400, {
          isBundle: true,
          includes: ["installation", "removal"],
        }),
        activity("heating", "Отопление", "task", 60, 220, { requiresInspection: true }),
      ],
    },
    windows_doors: {
      label: "Врати и дограма",
      defaultEstimate: { laborMin: 40, laborMax: 180 },
      activities: [
        activity("interior_door", "Интериорна врата", "item", 60, 90),
        activity("entrance_door", "Входна врата", "item", 90, 170),
        activity("adjustment", "Регулиране", "item", 30, 60, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("silicone", "Силикон", "task", 30, 70, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("hardware", "Обков", "item", 40, 120, { minimumVisitPrice: 50, sharedVisitEligible: true }),
        activity("joinery", "Дограма", "project", 60, 180, { requiresInspection: true }),
      ],
    },
    furniture_mounting: {
      label: "Мебели и монтажи",
      defaultEstimate: { laborMin: 35, laborMax: 120 },
      activities: [
        activity("furniture_assembly", "Сглобяване на мебели", "item", 35, 90, { minimumVisitPrice: 45, sharedVisitEligible: true }),
        activity("kitchen_installation", "Монтаж кухня", "project", 250, 700, { isBundle: true }),
        activity("cabinets", "Шкафове", "item", 40, 120, { minimumVisitPrice: 50, sharedVisitEligible: true }),
        activity("shelves", "Рафтове", "item", 30, 80, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("curtain_rods", "Корнизи", "item", 30, 70, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("television", "Телевизор", "item", 40, 90, { minimumVisitPrice: 50, sharedVisitEligible: true }),
      ],
    },
    roof_waterproofing: {
      label: "Покриви и хидроизолация",
      defaultEstimate: { laborMin: 150, laborMax: 600 },
      activities: [
        activity("roof_leak", "Теч от покрив", "package", 150, 450, { minimumVisitPrice: 150, requiresInspection: true }),
        activity("gutters", "Улуци", "package", 100, 350, { minimumVisitPrice: 100 }),
        activity("tiles", "Керемиди", "package", 250, 600, { minimumVisitPrice: 250 }),
        activity("terrace", "Тераса", "package", 250, 600, { minimumVisitPrice: 250 }),
        activity("waterproofing", "Хидроизолация", "package", 250, 550, { minimumVisitPrice: 250 }),
        activity("partial_repair", "Частичен ремонт", "package", 200, 600, { minimumVisitPrice: 200, requiresInspection: true }),
      ],
    },
    demolition_cleanup: {
      label: "Къртене, чистене, извозване",
      defaultEstimate: { laborMin: 60, laborMax: 250 },
      activities: [
        activity("dismantling", "Демонтаж", "task", 50, 120, { minimumVisitPrice: 60, sharedVisitEligible: true }),
        activity("tile_demolition", "Къртене на плочки", "task", 60, 150, { minimumVisitPrice: 60 }),
        activity("demolition", "Къртене", "task", 80, 250, { minimumVisitPrice: 80 }),
        activity("transport", "Извозване", "task", 60, 180, { minimumVisitPrice: 60, sharedVisitEligible: true }),
        activity("construction_waste", "Строителни отпадъци", "task", 80, 220, { minimumVisitPrice: 80 }),
        activity("cleaning", "Почистване", "task", 50, 120, { minimumVisitPrice: 60, sharedVisitEligible: true }),
      ],
    },
    full_renovation: {
      label: "Цялостен ремонт",
      defaultEstimate: { laborMin: 4800, laborMax: 12000 },
      activities: [
        activity("apartment_turnkey", "Апартамент до ключ", "m2", 120, 300, {
          isBundle: true,
          includes: ["finishing", "electrical", "plumbing", "bathroom", "floors"],
          requiresInspection: true,
        }),
        activity("house_turnkey", "Къща до ключ", "m2", 150, 350, {
          isBundle: true,
          includes: ["finishing", "electrical", "plumbing", "bathroom", "floors"],
          requiresInspection: true,
        }),
        activity("finishing", "Довършителни работи", "m2", 60, 140, { requiresInspection: true }),
        activity("crew_management", "Организация на бригади", "project", 500, 2000, { minimumVisitPrice: 500, requiresInspection: true }),
        activity("electrical", "Електро", "package", 800, 2500, { requiresInspection: true, safetyWarning: true }),
        activity("plumbing", "ВиК", "package", 700, 2000, { requiresInspection: true }),
        activity("bathroom", "Баня", "package", 1200, 2500, { requiresInspection: true }),
        activity("floors", "Подове", "package", 500, 2000, { requiresInspection: true }),
      ],
    },
    small_repairs: {
      label: "Дребни домашни ремонти",
      defaultEstimate: { laborMin: 40, laborMax: 120 },
      activities: [
        activity("small_fixes", "Малки поправки", "task", 40, 90, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("small_installations", "Дребни монтажи", "task", 45, 100, { minimumVisitPrice: 45, sharedVisitEligible: true }),
        activity("adjustments", "Настройки", "task", 35, 80, { minimumVisitPrice: 40, sharedVisitEligible: true }),
        activity("home_emergency", "Домашна авария", "task", 70, 160, { minimumVisitPrice: 70, requiresInspection: true }),
        activity("hanging_installation", "Закачане/монтаж", "task", 45, 100, { minimumVisitPrice: 45, sharedVisitEligible: true }),
        activity("other", "Друго", "task", 40, 120, { minimumVisitPrice: 40, requiresInspection: true }),
      ],
    },
  },
};

for (const [categoryKey, category] of Object.entries(REPAIR_PRICING_CONFIG.categories)) {
  category.activities = category.activities.map((item) => {
    const pricingModeBehavior = getPricingModeBehavior(categoryKey, item);
    return {
      ...item,
      pricingModeBehavior,
      defaultPricingMode:
        pricingModeBehavior === "user_selectable" || pricingModeBehavior === "locked_labor_plus_materials"
          ? "labor_plus_materials"
          : "labor_only",
      materialConfidence: item.requiresInspection ? "inspection_required" : "medium",
      materialNote: item.requiresInspection
        ? "Материалите и частите се уточняват след снимки или оглед."
        : "Материалите са ориентировъчни и зависят от избрания продукт и реалния обхват.",
      areaBased: item.unitType === "m2" || AREA_BASED_ACTIVITIES.has(`${categoryKey}.${item.key}`),
      standardAreaM2:
        categoryKey === "painting" && ["room", "rental_refresh", "after_renovation", "ceiling"].includes(item.key)
          ? 20
          : 1,
    };
  });
}

export function getPricingCategory(categoryKey) {
  return REPAIR_PRICING_CONFIG.categories[categoryKey] || null;
}

export function getPricingActivity(categoryKey, activityLabelOrKey) {
  const category = getPricingCategory(categoryKey);
  if (!category) return null;
  return category.activities.find(
    (item) => item.key === activityLabelOrKey || item.label === activityLabelOrKey
  ) || null;
}

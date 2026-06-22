export const REPAIR_CATEGORIES = [
  "ВиК",
  "Електро",
  "Шпакловка и боя",
  "Плочки",
  "Ремонт на покриви",
  "Ремонт на бани",
  "Основен ремонт",
  "Електро инсталация",
  "Пребоядисване",
  "Освежителен ремонт",
];

export const REPAIR_PRICE_PRESETS = {
  "ВиК": { unit: "точка", material: 55, laborMin: 45, laborMax: 80 },
  "Електро": { unit: "точка", material: 35, laborMin: 35, laborMax: 70 },
  "Електро инсталация": { unit: "точка", material: 55, laborMin: 60, laborMax: 110 },
  "Шпакловка и боя": { unit: "кв.м", material: 18, laborMin: 18, laborMax: 30 },
  "Пребоядисване": { unit: "кв.м", material: 10, laborMin: 8, laborMax: 18 },
  "Освежителен ремонт": { unit: "кв.м", material: 22, laborMin: 18, laborMax: 35 },
  "Плочки": { unit: "кв.м", material: 40, laborMin: 35, laborMax: 65 },
  "Ремонт на бани": { unit: "кв.м", material: 180, laborMin: 140, laborMax: 260 },
  "Ремонт на покриви": { unit: "кв.м", material: 85, laborMin: 60, laborMax: 130 },
  "Основен ремонт": { unit: "кв.м", material: 220, laborMin: 180, laborMax: 360 },
};

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

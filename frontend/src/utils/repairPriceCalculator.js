import {
  REPAIR_PRICING_CONFIG,
  getPricingActivity,
  getPricingCategory,
} from "../constants/repairPricingConfig.js";

const URGENCY_MULTIPLIERS = { normal: 1, urgent: 1.2, emergency: 1.5 };
const COMPLEXITY_MULTIPLIERS = { simple: 0.9, normal: 1, complex: 1.25, very_complex: 1.5 };
const LOCATION_MULTIPLIERS = { default: 1, sofia_center: 1.1, sofia_regular: 1, outside_sofia: 1 };
const ACCESS_MULTIPLIERS = { normal: 1, difficult: 1.15, very_difficult: 1.3 };

const SCALABLE_UNITS = new Set(["item", "m2", "linear_meter", "room"]);

export function roundUpToFive(value) {
  const safe = Math.max(0, Number(value) || 0);
  return Math.ceil(safe / 5) * 5;
}

export function parseScopeOption(sizeOption) {
  const text = String(sizeOption || "").trim().toLowerCase();
  if (!text || text.includes("не знам")) return { min: 1, max: 1, uncertain: true };
  if (text.includes("цял апартамент")) return { min: 4, max: 6, uncertain: true };
  if (text.includes("малко количество")) return { min: 1, max: 1, uncertain: true };

  const range = text.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]), uncertain: false };

  const upTo = text.match(/до\s*(\d+)/);
  if (upTo) {
    const max = Number(upTo[1]);
    return { min: Math.max(1, Math.ceil(max / 2)), max, uncertain: true };
  }

  const plus = text.match(/(\d+)\s*\+/);
  if (plus) {
    const min = Number(plus[1]);
    return { min, max: Math.ceil(min * 1.25), uncertain: true };
  }

  const exact = text.match(/(\d+)/);
  if (exact) {
    const value = Number(exact[1]);
    return { min: value, max: value, uncertain: false };
  }

  return { min: 1, max: 1, uncertain: true };
}

function multiplier(table, key) {
  return table[key] || 1;
}

function removeBundleDuplicates(activities) {
  const includedKeys = new Set(
    activities.filter((item) => item.isBundle).flatMap((item) => item.includes || [])
  );
  return activities.filter((item) => item.isBundle || !includedKeys.has(item.key));
}

function laborDiscount(activity, sharedVisitIndex) {
  if (!activity.sharedVisitEligible) return 1;
  if (sharedVisitIndex === 0) return 1;
  if (sharedVisitIndex === 1) return 0.7;
  return 0.6;
}

export function calculateRepairEstimate({
  categoryKey,
  selectedActivities = [],
  sizeOption = "",
  pricingMode = "labor_only",
  urgency = "normal",
  complexity = "normal",
  location = "default",
  access = "normal",
} = {}) {
  const category = getPricingCategory(categoryKey);
  const warnings = [];
  const notes = [];

  if (!category) {
    return {
      currency: REPAIR_PRICING_CONFIG.currency,
      pricingVersion: REPAIR_PRICING_CONFIG.pricingVersion,
      pricingMode,
      laborMin: 0,
      laborMax: 0,
      materialMin: 0,
      materialMax: 0,
      totalMin: 0,
      totalMax: 0,
      warnings: ["Няма ценова конфигурация за избраната категория."],
      notes,
      isCategoryEstimate: false,
      materialPricingPending: true,
      calculatedActivities: [],
    };
  }

  const resolved = selectedActivities
    .map((item) => getPricingActivity(categoryKey, item))
    .filter(Boolean);

  if (!resolved.length) {
    warnings.push("Избери поне една дейност за по-точен ориентир.");
    return {
      currency: REPAIR_PRICING_CONFIG.currency,
      pricingVersion: REPAIR_PRICING_CONFIG.pricingVersion,
      pricingMode,
      laborMin: roundUpToFive(category.defaultEstimate.laborMin),
      laborMax: roundUpToFive(category.defaultEstimate.laborMax),
      materialMin: 0,
      materialMax: 0,
      totalMin: roundUpToFive(category.defaultEstimate.laborMin),
      totalMax: roundUpToFive(category.defaultEstimate.laborMax),
      warnings,
      notes: ["Това е груб ориентир за категорията, а не изчислена оферта."],
      isCategoryEstimate: true,
      materialPricingPending: true,
      calculatedActivities: [],
    };
  }

  const activities = removeBundleDuplicates(resolved);
  if (activities.length < resolved.length) {
    notes.push("Включените в пакетната услуга дейности не са начислени повторно.");
  }

  const scope = parseScopeOption(sizeOption);
  if (scope.uncertain) warnings.push("Размерът е приблизителен и разширява ценовия диапазон.");

  let laborMin = 0;
  let laborMax = 0;
  let sharedVisitIndex = 0;
  let minimumVisitPrice = 0;

  for (const item of activities) {
    const scaleMin = SCALABLE_UNITS.has(item.unitType) ? scope.min : 1;
    const scaleMax = SCALABLE_UNITS.has(item.unitType) ? scope.max : 1;
    const discount = laborDiscount(item, sharedVisitIndex);

    laborMin += item.laborMin * scaleMin * discount;
    laborMax += item.laborMax * scaleMax * discount;
    minimumVisitPrice = Math.max(minimumVisitPrice, Number(item.minimumVisitPrice) || 0);

    if (item.sharedVisitEligible) sharedVisitIndex += 1;
    if (item.requiresInspection) warnings.push(`${item.label}: крайната цена изисква оглед.`);
    if (item.safetyWarning) warnings.push(`${item.label}: необходима е проверка от квалифициран специалист.`);
  }

  laborMin = Math.max(laborMin, minimumVisitPrice);
  laborMax = Math.max(laborMax, minimumVisitPrice);

  const laborMultiplier =
    multiplier(URGENCY_MULTIPLIERS, urgency) *
    multiplier(COMPLEXITY_MULTIPLIERS, complexity) *
    multiplier(LOCATION_MULTIPLIERS, location) *
    multiplier(ACCESS_MULTIPLIERS, access);

  laborMin *= laborMultiplier;
  laborMax *= laborMultiplier;

  let materialMin = 0;
  let materialMax = 0;
  const includeMaterials = pricingMode !== "labor_only";
  if (includeMaterials) {
    warnings.push("Цените за материали още се проучват и не са включени в този ориентир.");
  }

  laborMin = roundUpToFive(laborMin);
  laborMax = roundUpToFive(laborMax);
  materialMin = roundUpToFive(materialMin);
  materialMax = roundUpToFive(materialMax);

  return {
    currency: REPAIR_PRICING_CONFIG.currency,
    pricingVersion: REPAIR_PRICING_CONFIG.pricingVersion,
    pricingMode,
    laborMin,
    laborMax,
    materialMin,
    materialMax,
    totalMin: roundUpToFive(laborMin + materialMin),
    totalMax: roundUpToFive(laborMax + materialMax),
    warnings: [...new Set(warnings)],
    notes,
    isCategoryEstimate: false,
    materialPricingPending: true,
    calculatedActivities: activities.map((item) => item.key),
  };
}

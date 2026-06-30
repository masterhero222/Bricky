import {
  REPAIR_PRICING_CONFIG,
  getPricingActivity,
  getPricingCategory,
} from "../constants/repairPricingConfig.js";
import {
  MATERIAL_QUANTITY_RULES_VERSION,
  getMaterialQuantityRule,
} from "../constants/materialQuantityRules.js";
import {
  MATERIAL_PRICE_INDEX_VERSION,
  getMaterialPriceItems,
} from "../constants/materialPriceIndex.js";

const URGENCY_MULTIPLIERS = { normal: 1, urgent: 1.2, emergency: 1.5 };
const COMPLEXITY_MULTIPLIERS = { simple: 0.9, normal: 1, complex: 1.25, very_complex: 1.5 };
const LOCATION_MULTIPLIERS = { default: 1, sofia_center: 1.1, sofia_regular: 1, outside_sofia: 1 };
const ACCESS_MULTIPLIERS = { normal: 1, difficult: 1.15, very_difficult: 1.3 };
const MATERIAL_QUALITY_MULTIPLIERS = { budget: 0.8, standard: 1, premium: 1.35 };
export const MAX_EXACT_AREA_M2 = 2000;
export const VALID_PRICING_MODES = new Set(["labor_only", "labor_plus_materials"]);

const SCALABLE_UNITS = new Set(["item", "m2", "linear_meter", "room"]);

const CATEGORY_VARIATION_REASONS = {
  vik: "Цената зависи от мястото на проблема, достъпа до тръбите, нужните части и дали има къртене.",
  electro: "Цената зависи от броя точки, състоянието на инсталацията, таблото и дали има скрит дефект.",
  painting: "Цената зависи от площта, броя слоеве, състоянието на стените и качеството на боята.",
  plaster: "Цената зависи от състоянието и кривините на стените, пукнатините, броя слоеве и нуждата от мрежа или грунд.",
  tiles: "Цената зависи от площта, основата, размера и рязането на плочките и нуждата от хидроизолация.",
  bathroom_renovation: "Цената зависи от състоянието на банята, ВиК точките, плочките, хидроизолацията, санитарията и къртенето.",
  drywall: "Цената зависи от площта, конструкцията, броя нива, изолацията и допълнителните детайли.",
  flooring: "Цената зависи от площта, вида настилка, основата, замазката, первазите и преходните лайсни.",
  heating_cooling: "Цената зависи от мощността, тръбния път, достъпа, етажа, частите и вида ремонт или монтаж.",
  windows_doors: "Цената зависи от вида врата или дограма, отвора, обкова, монтажа и нуждата от корекции.",
  furniture_mounting: "Цената зависи от размера, стената, крепежите, сложността и броя монтажи.",
  roof_waterproofing: "Цената зависи от вида покрив, мястото на теча, достъпа, наклона и скритите щети.",
  demolition_cleanup: "Цената зависи от отпадъка, етажа, асансьора, достъпа за бус и нуждата от контейнер.",
  full_renovation: "Цената зависи от обхвата, състоянието, материалите, помещенията, инсталациите и довършителните работи.",
  small_repairs: "Цената зависи от броя задачи, нужните части, достъпа и спешността.",
};

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

export function normalizeExactAreaM2(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, MAX_EXACT_AREA_M2);
}

export function isRangeTooWide(min, max) {
  return Number(max) / Math.max(Number(min) || 0, 1) > 2.5;
}

export function clampExpectedRange(expectedMin, expectedMax) {
  const safeMin = roundUpToFive(expectedMin);
  const safeMax = roundUpToFive(Math.max(expectedMax, safeMin));
  return {
    expectedMin: safeMin,
    expectedMax: Math.min(safeMax, roundUpToFive(safeMin * 2.5)),
  };
}

export function buildDisplayEstimate(rawEstimate, { categoryKey, confidence = "medium" } = {}) {
  const possibleMin = roundUpToFive(rawEstimate.totalMin);
  const possibleMax = roundUpToFive(Math.max(rawEstimate.totalMax, possibleMin));
  const variationReason = CATEGORY_VARIATION_REASONS[categoryKey] ||
    "Цената зависи от състоянието, достъпа, материалите и сложността.";

  if (confidence === "inspection_required") {
    const expected = clampExpectedRange(rawEstimate.laborMin, rawEstimate.laborMax);
    return {
      displayMode: "inspection_required",
      ...expected,
      possibleMin,
      possibleMax,
      confidence,
      variationReason,
      primaryLabel: "Ориентир за труда преди оглед",
      secondaryLabel: "Възможен диапазон",
      showPossibleRange: true,
      rangeTooWide: isRangeTooWide(possibleMin, possibleMax),
      needsPhotos: true,
      needsInspection: true,
    };
  }

  const rangeTooWide = isRangeTooWide(possibleMin, possibleMax);
  if (rangeTooWide) {
    const spread = possibleMax - possibleMin;
    const expected = clampExpectedRange(
      possibleMin + spread * 0.2,
      possibleMin + spread * 0.45
    );
    return {
      displayMode: "expected_range",
      ...expected,
      possibleMin,
      possibleMax,
      confidence,
      variationReason,
      primaryLabel: "Най-вероятно",
      secondaryLabel: "Възможен диапазон",
      showPossibleRange: true,
      rangeTooWide: true,
      needsPhotos: true,
      needsInspection: false,
    };
  }

  const expected = clampExpectedRange(possibleMin, possibleMax);
  return {
    displayMode: "expected_range",
    ...expected,
    possibleMin,
    possibleMax,
    confidence,
    variationReason,
    primaryLabel: "Най-вероятно",
    secondaryLabel: "Възможен диапазон",
    showPossibleRange: false,
    rangeTooWide: false,
    needsPhotos: confidence === "low",
    needsInspection: false,
  };
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

function materialScale(rule, activity, scope, areaScope) {
  const shouldScale =
    rule.scaleWithScope ||
    ["area_formula", "linear_formula", "item_formula"].includes(rule.mode) ||
    (rule.mode === "fixed_kit" && activity.unitType === "item") ||
    (rule.categoryKey === "small_repairs" && rule.mode === "fixed_kit");

  if (!shouldScale) return { min: 1, max: 1 };
  const selectedScope = rule.mode === "area_formula" || activity.unitType === "m2" ? areaScope : scope;
  const standard = Math.max(1, Number(rule.standardQuantity) || 1);
  return {
    min: Math.max(1, selectedScope.min / standard),
    max: Math.max(1, selectedScope.max / standard),
  };
}

function materialRangeForMode(rule, pricingMode) {
  if (pricingMode === "labor_only") return { min: 0, max: 0, available: true };
  return {
    min: rule.materialMin,
    max: rule.materialMax,
    available: Number.isFinite(rule.materialMin) && Number.isFinite(rule.materialMax),
  };
}

export function resolvePricingModeBehavior(activities) {
  const behaviors = new Set(activities.map((item) => item.pricingModeBehavior));
  if (behaviors.has("inspection_required")) return "inspection_required";
  if (behaviors.has("user_selectable") || behaviors.size > 1) return "user_selectable";
  if (behaviors.has("locked_labor_plus_materials")) return "locked_labor_plus_materials";
  return "locked_labor_only";
}

function resolvePricingMode(behavior, requestedMode, activities) {
  if (behavior === "locked_labor_plus_materials") return "labor_plus_materials";
  if (behavior === "locked_labor_only" || behavior === "inspection_required") return "labor_only";
  if (VALID_PRICING_MODES.has(requestedMode)) return requestedMode;
  return activities.some((item) => item.defaultPricingMode === "labor_plus_materials")
    ? "labor_plus_materials"
    : "labor_only";
}

function combinedConfidence(confidences) {
  if (confidences.includes("inspection_required")) return "inspection_required";
  if (confidences.includes("low")) return "low";
  if (confidences.includes("medium")) return "medium";
  return confidences.length ? "high" : null;
}

export function calculateRepairEstimate({
  categoryKey,
  selectedActivities = [],
  sizeOption = "",
  exactAreaM2 = null,
  pricingMode = "labor_plus_materials",
  urgency = "normal",
  complexity = "normal",
  location = "default",
  access = "normal",
  materialQuality = "standard",
} = {}) {
  const category = getPricingCategory(categoryKey);
  const warnings = [];
  const notes = [];

  if (!category) {
    return {
      currency: REPAIR_PRICING_CONFIG.currency,
      pricingVersion: REPAIR_PRICING_CONFIG.pricingVersion,
      materialPricingVersion: MATERIAL_QUANTITY_RULES_VERSION,
      materialPriceIndexVersion: MATERIAL_PRICE_INDEX_VERSION,
      pricingMode,
      laborMin: 0,
      laborMax: 0,
      materialMin: 0,
      materialMax: 0,
      totalMin: 0,
      totalMax: 0,
      expectedMin: 0,
      expectedMax: 0,
      possibleMin: 0,
      possibleMax: 0,
      confidence: "low",
      displayMode: "expected_range",
      variationReason: "Липсва достатъчно информация за надежден ориентир.",
      warnings: ["Няма ценова конфигурация за избраната категория."],
      notes,
      isCategoryEstimate: false,
      materialPricingPending: true,
      materialConfidence: null,
      includedMaterialKeys: [],
      excludedMaterialKeys: [],
      calculatedActivities: [],
    };
  }

  const resolved = selectedActivities
    .map((item) => getPricingActivity(categoryKey, item))
    .filter(Boolean);

  if (!resolved.length) {
    warnings.push("Избери поне една дейност за по-точен ориентир.");
    const totalMin = roundUpToFive(category.defaultEstimate.laborMin);
    const totalMax = roundUpToFive(category.defaultEstimate.laborMax);
    return {
      currency: REPAIR_PRICING_CONFIG.currency,
      pricingVersion: REPAIR_PRICING_CONFIG.pricingVersion,
      materialPricingVersion: MATERIAL_QUANTITY_RULES_VERSION,
      materialPriceIndexVersion: MATERIAL_PRICE_INDEX_VERSION,
      pricingMode,
      laborMin: totalMin,
      laborMax: totalMax,
      materialMin: 0,
      materialMax: 0,
      totalMin,
      totalMax,
      ...buildDisplayEstimate(
        { laborMin: totalMin, laborMax: totalMax, totalMin, totalMax },
        { categoryKey, confidence: "low" }
      ),
      warnings,
      notes: ["Това е груб ориентир за категорията, а не изчислена оферта."],
      isCategoryEstimate: true,
      materialPricingPending: true,
      materialConfidence: null,
      includedMaterialKeys: [],
      excludedMaterialKeys: [],
      calculatedActivities: [],
    };
  }

  const activities = removeBundleDuplicates(resolved);
  if (activities.length < resolved.length) {
    notes.push("Включените в пакетната услуга дейности не са начислени повторно.");
  }
  const pricingModeBehavior = resolvePricingModeBehavior(activities);
  const effectivePricingMode = resolvePricingMode(pricingModeBehavior, pricingMode, activities);

  const scope = parseScopeOption(sizeOption);
  const normalizedAreaM2 = normalizeExactAreaM2(exactAreaM2);
  const areaScope = normalizedAreaM2
    ? { min: normalizedAreaM2, max: normalizedAreaM2, uncertain: false }
    : scope;
  if (scope.uncertain && !normalizedAreaM2) {
    warnings.push("Размерът е приблизителен и разширява ценовия диапазон.");
  }

  let laborMin = 0;
  let laborMax = 0;
  let sharedVisitIndex = 0;
  let minimumVisitPrice = 0;

  for (const item of activities) {
    const laborScope = item.unitType === "m2"
      ? areaScope
      : item.unitType === "room" && normalizedAreaM2
        ? {
            min: Math.max(0.5, normalizedAreaM2 / Math.max(1, item.standardAreaM2 || 20)),
            max: Math.max(0.5, normalizedAreaM2 / Math.max(1, item.standardAreaM2 || 20)),
          }
        : scope;
    const scaleMin = SCALABLE_UNITS.has(item.unitType) ? laborScope.min : 1;
    const scaleMax = SCALABLE_UNITS.has(item.unitType) ? laborScope.max : 1;
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
  let materialPricingPending = false;
  const materialConfidences = [];
  const includedMaterialKeys = new Set();
  const excludedMaterialKeys = new Set();
  const materialNotes = [];

  if (effectivePricingMode !== "labor_only" || pricingModeBehavior === "inspection_required") {
    for (const item of activities) {
      const rule = getMaterialQuantityRule(categoryKey, item.key);
      if (!rule) {
        materialPricingPending = true;
        warnings.push(`${item.label}: липсва правило за материалите.`);
        continue;
      }

      const range = materialRangeForMode(rule, "labor_plus_materials");
      if (!range.available) {
        materialPricingPending = true;
        warnings.push(`${item.label}: няма надежден диапазон за избрания материален режим.`);
        continue;
      }

      const scale = materialScale(rule, item, scope, areaScope);
      materialMin += Number(range.min) * scale.min;
      materialMax += Number(range.max) * scale.max;
      materialConfidences.push(rule.confidence);
      rule.includedMaterialKeys.forEach((key) => includedMaterialKeys.add(key));
      rule.excludedMaterialKeys.forEach((key) => excludedMaterialKeys.add(key));

      if (rule.uiNote) materialNotes.push(rule.uiNote);
      if (rule.confidence === "inspection_required") {
        warnings.push(`${item.label}: материалите се уточняват след оглед.`);
      }
      if (!rule.materialIncludesProduct && rule.excludedMaterialKeys.length) {
        materialNotes.push(`${item.label}: скъпият основен продукт не е включен автоматично.`);
      }
    }
  }

  const materialMultiplier = multiplier(MATERIAL_QUALITY_MULTIPLIERS, materialQuality);
  materialMin *= materialMultiplier;
  materialMax *= materialMultiplier;

  laborMin = roundUpToFive(laborMin);
  laborMax = roundUpToFive(laborMax);
  materialMin = roundUpToFive(materialMin);
  materialMax = roundUpToFive(materialMax);

  const confidence = activities.some((item) => item.requiresInspection) || materialConfidences.includes("inspection_required")
    ? "inspection_required"
    : scope.uncertain && !normalizedAreaM2
      ? "medium"
      : combinedConfidence(materialConfidences) || "high";
  const totals = {
    totalMin: roundUpToFive(laborMin + materialMin),
    totalMax: roundUpToFive(laborMax + materialMax),
  };

  return {
    currency: REPAIR_PRICING_CONFIG.currency,
    pricingVersion: REPAIR_PRICING_CONFIG.pricingVersion,
    materialPricingVersion: MATERIAL_QUANTITY_RULES_VERSION,
    materialPriceIndexVersion: MATERIAL_PRICE_INDEX_VERSION,
    pricingMode: effectivePricingMode,
    pricingModeBehavior,
    laborMin,
    laborMax,
    materialMin,
    materialMax,
    ...totals,
    ...buildDisplayEstimate({ laborMin, laborMax, ...totals }, { categoryKey, confidence }),
    exactAreaM2: normalizedAreaM2,
    warnings: [...new Set(warnings)],
    notes: [...new Set([...notes, ...materialNotes])],
    isCategoryEstimate: false,
    materialPricingPending,
    materialConfidence: combinedConfidence(materialConfidences),
    includedMaterialKeys: [...includedMaterialKeys],
    includedMaterials: getMaterialPriceItems([...includedMaterialKeys]).map((item) => item.label),
    excludedMaterialKeys: [...excludedMaterialKeys],
    calculatedActivities: activities.map((item) => item.key),
    selectedActivityLabels: activities.map((item) => item.label),
  };
}

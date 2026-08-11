import { getPricingActivity, getPricingCategory } from "../constants/repairPricingConfig.js";

const SCALABLE_UNITS = new Set(["m2", "linear_meter", "item", "room", "hour"]);

function roundPrice(value) {
  return Math.ceil(Math.max(0, Number(value) || 0));
}

function numericScope(value) {
  const matches = String(value || "").match(/\d+(?:[.,]\d+)?/g) || [];
  if (!matches.length) return 1;
  return Math.max(...matches.map((item) => Number(item.replace(",", ".")) || 0), 1);
}

export function pricingQuantity(unitType, quantity, exactAreaM2) {
  if (unitType === "m2" && Number(exactAreaM2) > 0) return Number(exactAreaM2);
  return SCALABLE_UNITS.has(unitType) ? numericScope(quantity) : 1;
}

export function catalogCategory(catalog, categoryKey) {
  return catalog?.categories?.find(
    (category) => category.categoryKey === categoryKey && category.isActive !== false,
  ) || null;
}

export function catalogActivities(catalog, categoryKey) {
  const live = catalogCategory(catalog, categoryKey)?.activities?.filter(
    (activity) => activity.isActive !== false,
  ) || [];
  return live.length ? live : getPricingCategory(categoryKey)?.activities || [];
}

export function calculateCatalogEstimate({
  catalog,
  categoryKey,
  selectedActivities,
  quantity,
  exactAreaM2,
  pricingMode,
  fallbackEstimate,
}) {
  if (!fallbackEstimate || !Array.isArray(selectedActivities) || !selectedActivities.length) {
    return fallbackEstimate;
  }

  const resolved = selectedActivities.map((selection) => {
    const staticActivity = getPricingActivity(categoryKey, selection);
    const activityKey = staticActivity?.key || selection;
    const activity = catalogCategory(catalog, categoryKey)?.activities?.find(
      (item) => item.activityKey === activityKey && item.isActive !== false,
    );
    const rule = catalog?.pricingRules?.find(
      (item) => item.categoryKey === categoryKey
        && item.activityKey === activityKey
        && item.isActive !== false,
    );
    return { activityKey, activity, rule };
  });

  if (resolved.some(({ activity, rule }) => !activity || !rule)) {
    return { ...fallbackEstimate, source: "fallback" };
  }

  const currencies = new Set(resolved.map(({ rule }) => rule.currency || "EUR"));
  if (currencies.size !== 1) return { ...fallbackEstimate, source: "fallback" };

  const totals = resolved.reduce(
    (sum, { activity, rule }) => {
      const scale = pricingQuantity(activity.unitType || "item", quantity, exactAreaM2);
      sum.laborMin += roundPrice(Number(rule.laborMin) * scale);
      sum.laborMax += roundPrice(Number(rule.laborMax) * scale);
      if (pricingMode === "labor_plus_materials") {
        sum.materialMin += roundPrice(Number(rule.materialMin) * scale);
        sum.materialMax += roundPrice(Number(rule.materialMax) * scale);
      }
      return sum;
    },
    { laborMin: 0, laborMax: 0, materialMin: 0, materialMax: 0 },
  );

  const versions = [...new Set(resolved.map(({ rule }) => rule.version).filter(Boolean))];
  const totalMin = totals.laborMin + totals.materialMin;
  const totalMax = totals.laborMax + totals.materialMax;

  return {
    ...fallbackEstimate,
    ...totals,
    totalMin,
    totalMax,
    expectedMin: totalMin,
    expectedMax: totalMax,
    possibleMin: totalMin,
    possibleMax: totalMax,
    currency: [...currencies][0],
    pricingVersion: versions.length === 1 ? versions[0] : versions.join(" + "),
    pricingMode,
    calculatedActivities: resolved.map(({ activityKey }) => activityKey),
    source: "live",
  };
}

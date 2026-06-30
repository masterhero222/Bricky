import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MATERIAL_PRICE_INDEX } from "../src/constants/materialPriceIndex.js";
import { MATERIAL_QUANTITY_RULES } from "../src/constants/materialQuantityRules.js";
import { getPricingActivity, REPAIR_PRICING_CONFIG } from "../src/constants/repairPricingConfig.js";
import {
  buildDisplayEstimate,
  calculateRepairEstimate,
  MAX_EXACT_AREA_M2,
  VALID_PRICING_MODES,
} from "../src/utils/repairPriceCalculator.js";
import { cleanRequestDescription, formatRequestExpectedRange } from "../src/utils/requestPresentation.js";

const rules = new Map(MATERIAL_QUANTITY_RULES.map((rule) => [rule.key, rule]));
const materials = new Set(MATERIAL_PRICE_INDEX.map((item) => item.key));
const validBehaviors = new Set([
  "user_selectable",
  "locked_labor_only",
  "locked_labor_plus_materials",
  "inspection_required",
]);
const validQuantityModes = new Set([
  "fixed_kit",
  "area_formula",
  "linear_formula",
  "item_formula",
  "package_formula",
  "logistics_formula",
  "inspection_required",
]);

for (const [categoryKey, category] of Object.entries(REPAIR_PRICING_CONFIG.categories)) {
  for (const activity of category.activities) {
    const ruleKey = `${categoryKey}.${activity.key}`;
    const rule = rules.get(ruleKey);
    assert.ok(rule, `Missing material rule: ${ruleKey}`);
    assert.ok(validBehaviors.has(activity.pricingModeBehavior), `${ruleKey}: invalid pricingModeBehavior`);
    assert.ok(VALID_PRICING_MODES.has(activity.defaultPricingMode), `${ruleKey}: invalid defaultPricingMode`);
    assert.ok(validQuantityModes.has(rule.mode), `${ruleKey}: invalid material quantity mode`);
    assert.ok(Number.isFinite(rule.materialMin), `${ruleKey}: materialMin must be a number`);
    assert.ok(Number.isFinite(rule.materialMax), `${ruleKey}: materialMax must be a number`);
    assert.ok(rule.materialMin >= 0, `${ruleKey}: materialMin cannot be negative`);
    assert.ok(rule.materialMax >= rule.materialMin, `${ruleKey}: materialMax cannot be below materialMin`);
    assert.equal("consumablesMin" in rule, false, `${ruleKey}: consumablesMin is deprecated`);
    assert.equal("consumablesMax" in rule, false, `${ruleKey}: consumablesMax is deprecated`);
    assert.equal("materialsEstimateMin" in rule, false, `${ruleKey}: materialsEstimateMin is deprecated`);
    assert.equal("materialsEstimateMax" in rule, false, `${ruleKey}: materialsEstimateMax is deprecated`);

    for (const materialKey of rule.includedMaterialKeys) {
      assert.ok(materials.has(materialKey), `Missing material index item: ${ruleKey} -> ${materialKey}`);
    }

  }
}

assert.equal(rules.size, 97, "Unexpected material rule count");
assert.equal(Object.keys(REPAIR_PRICING_CONFIG.categories).length, 15, "Unexpected category count");

const painting = calculateRepairEstimate({
  categoryKey: "painting",
  selectedActivities: ["Боядисване на стая"],
  sizeOption: "1 стая",
  pricingMode: "labor_plus_materials",
});
assert.deepEqual(
  [painting.laborMin, painting.laborMax, painting.materialMin, painting.materialMax, painting.totalMin, painting.totalMax],
  [120, 250, 40, 120, 160, 370]
);

const bathroom = calculateRepairEstimate({
  categoryKey: "bathroom_renovation",
  selectedActivities: ["Цялостна баня", "ВиК", "Плочки"],
  sizeOption: "до 3 кв.м",
  pricingMode: "labor_plus_materials",
});
assert.equal(bathroom.calculatedActivities.length, 1, "Bathroom bundle must not double count included activities");
assert.equal(bathroom.pricingModeBehavior, "inspection_required");
assert.equal(bathroom.pricingMode, "labor_only");
assert.deepEqual([bathroom.materialMin, bathroom.materialMax], [900, 1800]);

const leak = calculateRepairEstimate({
  categoryKey: "vik",
  selectedActivities: ["Отстраняване на теч"],
  sizeOption: "1 точка",
  pricingMode: "labor_plus_materials",
});
assert.equal(leak.materialConfidence, "inspection_required");
assert.equal(leak.pricingModeBehavior, "inspection_required");
assert.equal(leak.pricingMode, "labor_only");
assert.equal(leak.needsInspection, true);

const laminateLaborOnly = calculateRepairEstimate({
  categoryKey: "flooring",
  selectedActivities: ["Ламинат"],
  sizeOption: "до 15 кв.м",
  pricingMode: "labor_only",
});
assert.deepEqual([laminateLaborOnly.materialMin, laminateLaborOnly.materialMax], [0, 0]);

const laminateEstimate = calculateRepairEstimate({
  categoryKey: "flooring",
  selectedActivities: ["Ламинат"],
  sizeOption: "до 15 кв.м",
  pricingMode: "labor_plus_materials",
});
assert.deepEqual([laminateEstimate.materialMin, laminateEstimate.materialMax], [200, 550]);
assert.equal(laminateEstimate.pricingModeBehavior, "user_selectable");

const lockedMaterials = calculateRepairEstimate({
  categoryKey: "vik",
  selectedActivities: ["Сифон"],
  sizeOption: "1 точка",
  pricingMode: "labor_only",
});
assert.equal(lockedMaterials.pricingModeBehavior, "locked_labor_plus_materials");
assert.equal(lockedMaterials.pricingMode, "labor_plus_materials");

const lockedLabor = calculateRepairEstimate({
  categoryKey: "electro",
  selectedActivities: ["Диагностика"],
  sizeOption: "1 точка",
  pricingMode: "labor_plus_materials",
});
assert.equal(lockedLabor.pricingModeBehavior, "locked_labor_only");
assert.equal(lockedLabor.pricingMode, "labor_only");

const exactPlasterArea = calculateRepairEstimate({
  categoryKey: "plaster",
  selectedActivities: ["Фина шпакловка"],
  sizeOption: "до 20 кв.м",
  exactAreaM2: 24,
  pricingMode: "labor_only",
});
assert.equal(exactPlasterArea.exactAreaM2, 24);
assert.deepEqual([exactPlasterArea.laborMin, exactPlasterArea.laborMax], [170, 240]);

const itemWithAreaContext = calculateRepairEstimate({
  categoryKey: "electro",
  selectedActivities: ["Контакти"],
  sizeOption: "1 точка",
  exactAreaM2: 500,
  pricingMode: "labor_only",
});
const itemWithoutAreaContext = calculateRepairEstimate({
  categoryKey: "electro",
  selectedActivities: ["Контакти"],
  sizeOption: "1 точка",
  pricingMode: "labor_only",
});
assert.deepEqual(
  [itemWithAreaContext.laborMin, itemWithAreaContext.laborMax],
  [itemWithoutAreaContext.laborMin, itemWithoutAreaContext.laborMax],
  "Area must not multiply item-based activities"
);

const cappedArea = calculateRepairEstimate({
  categoryKey: "plaster",
  selectedActivities: ["Фина шпакловка"],
  exactAreaM2: MAX_EXACT_AREA_M2 + 500,
  pricingMode: "labor_only",
});
assert.equal(cappedArea.exactAreaM2, MAX_EXACT_AREA_M2);

const wideRange = buildDisplayEstimate(
  { laborMin: 100, laborMax: 790, totalMin: 100, totalMax: 790 },
  { categoryKey: "vik", confidence: "medium" }
);
assert.deepEqual(
  [wideRange.expectedMin, wideRange.expectedMax, wideRange.possibleMin, wideRange.possibleMax],
  [240, 415, 100, 790]
);
assert.equal(wideRange.displayMode, "expected_range");
assert.equal(wideRange.rangeTooWide, true);
assert.equal(wideRange.showPossibleRange, true);
assert.ok(wideRange.expectedMax / wideRange.expectedMin <= 2.5);
assert.ok(wideRange.possibleMax / wideRange.possibleMin > 2.5);

assert.equal(getPricingActivity("vik", "Отстраняване на теч")?.key, "leak_repair");
assert.equal(getPricingActivity("vik", "leak_repair")?.label, "Отстраняване на теч");

const requestSource = readFileSync(new URL("../src/pages/Requests.jsx", import.meta.url), "utf8");
const engineSource = readFileSync(new URL("../src/utils/repairPriceCalculator.js", import.meta.url), "utf8");
for (const deprecatedMode of ["labor_plus_consumables", "labor_plus_materials_estimate"]) {
  assert.equal(requestSource.includes(deprecatedMode), false, `Request flow still uses ${deprecatedMode}`);
  assert.equal(engineSource.includes(deprecatedMode), false, `Calculator engine still uses ${deprecatedMode}`);
}
assert.equal(requestSource.includes("estimateRepairPrice"), false, "Request flow uses deprecated category estimator");

const oldDescription = [
  "Тип ремонт: Плочки",
  "Ориентировъчен труд: 420-660 EUR",
  "Най-вероятен ориентир: 520-880 EUR",
  "Възможен технически диапазон: 520-880 EUR",
  "Описание: Смяна на плочки в кухнята",
].join("\n");
assert.equal(
  cleanRequestDescription(oldDescription),
  "Тип ремонт: Плочки\nОписание: Смяна на плочки в кухнята"
);
assert.equal(
  formatRequestExpectedRange({ estimateMin: 520, estimateMax: 880, estimateCurrency: "EUR" }),
  "520-880 EUR"
);

console.log(`Pricing config verified: ${rules.size} activities, ${materials.size} material items.`);

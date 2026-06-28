import assert from "node:assert/strict";
import { MATERIAL_PRICE_INDEX } from "../src/constants/materialPriceIndex.js";
import { MATERIAL_QUANTITY_RULES } from "../src/constants/materialQuantityRules.js";
import { REPAIR_PRICING_CONFIG } from "../src/constants/repairPricingConfig.js";
import {
  buildDisplayEstimate,
  calculateRepairEstimate,
  MAX_EXACT_AREA_M2,
} from "../src/utils/repairPriceCalculator.js";
import { cleanRequestDescription, formatRequestExpectedRange } from "../src/utils/requestPresentation.js";

const rules = new Map(MATERIAL_QUANTITY_RULES.map((rule) => [rule.key, rule]));
const materials = new Set(MATERIAL_PRICE_INDEX.map((item) => item.key));

for (const [categoryKey, category] of Object.entries(REPAIR_PRICING_CONFIG.categories)) {
  for (const activity of category.activities) {
    const ruleKey = `${categoryKey}.${activity.key}`;
    const rule = rules.get(ruleKey);
    assert.ok(rule, `Missing material rule: ${ruleKey}`);

    for (const materialKey of rule.includedMaterialKeys) {
      assert.ok(materials.has(materialKey), `Missing material index item: ${ruleKey} -> ${materialKey}`);
    }

    for (const [minKey, maxKey] of [
      ["consumablesMin", "consumablesMax"],
      ["materialsEstimateMin", "materialsEstimateMax"],
    ]) {
      const min = rule[minKey];
      const max = rule[maxKey];
      assert.equal(min == null, max == null, `${ruleKey}: incomplete ${minKey}/${maxKey} range`);
      if (min != null) {
        assert.ok(min >= 0, `${ruleKey}: ${minKey} cannot be negative`);
        assert.ok(max >= min, `${ruleKey}: ${maxKey} cannot be below ${minKey}`);
      }
    }
  }
}

assert.equal(rules.size, 97, "Unexpected material rule count");
assert.equal(Object.keys(REPAIR_PRICING_CONFIG.categories).length, 15, "Unexpected category count");

const painting = calculateRepairEstimate({
  categoryKey: "painting",
  selectedActivities: ["Боядисване на стая"],
  sizeOption: "1 стая",
  pricingMode: "labor_plus_consumables",
});
assert.deepEqual(
  [painting.laborMin, painting.laborMax, painting.materialMin, painting.materialMax, painting.totalMin, painting.totalMax],
  [120, 250, 40, 120, 160, 370]
);

const bathroom = calculateRepairEstimate({
  categoryKey: "bathroom_renovation",
  selectedActivities: ["Цялостна баня", "ВиК", "Плочки"],
  sizeOption: "до 3 кв.м",
  pricingMode: "labor_plus_consumables",
});
assert.equal(bathroom.calculatedActivities.length, 1, "Bathroom bundle must not double count included activities");
assert.deepEqual([bathroom.materialMin, bathroom.materialMax], [900, 1800]);

const leak = calculateRepairEstimate({
  categoryKey: "vik",
  selectedActivities: ["Отстраняване на теч"],
  sizeOption: "1 точка",
  pricingMode: "labor_plus_consumables",
});
assert.equal(leak.materialConfidence, "inspection_required");

const laminateConsumables = calculateRepairEstimate({
  categoryKey: "flooring",
  selectedActivities: ["Ламинат"],
  sizeOption: "до 15 кв.м",
  pricingMode: "labor_plus_consumables",
});
assert.equal(laminateConsumables.materialPricingPending, true);
assert.deepEqual([laminateConsumables.materialMin, laminateConsumables.materialMax], [0, 0]);

const laminateEstimate = calculateRepairEstimate({
  categoryKey: "flooring",
  selectedActivities: ["Ламинат"],
  sizeOption: "до 15 кв.м",
  pricingMode: "labor_plus_materials_estimate",
});
assert.deepEqual([laminateEstimate.materialMin, laminateEstimate.materialMax], [200, 550]);

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

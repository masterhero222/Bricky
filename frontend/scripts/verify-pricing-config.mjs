import assert from "node:assert/strict";
import { MATERIAL_PRICE_INDEX } from "../src/constants/materialPriceIndex.js";
import { MATERIAL_QUANTITY_RULES } from "../src/constants/materialQuantityRules.js";
import { REPAIR_PRICING_CONFIG } from "../src/constants/repairPricingConfig.js";
import { calculateRepairEstimate } from "../src/utils/repairPriceCalculator.js";

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

console.log(`Pricing config verified: ${rules.size} activities, ${materials.size} material items.`);

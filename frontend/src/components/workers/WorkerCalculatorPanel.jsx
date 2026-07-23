import { useMemo, useState } from "react";
import { Calculator, Check } from "lucide-react";
import { REPAIR_CATEGORY_OPTIONS } from "../../constants/repairCatalog";
import { getPricingCategory } from "../../constants/repairPricingConfig";
import { calculateRepairEstimate } from "../../utils/repairPriceCalculator";

const PRICING_MODES = [
  ["labor_only", "Труд"],
  ["labor_plus_materials", "Труд + материали"],
];

export default function WorkerCalculatorPanel() {
  const [categoryKey, setCategoryKey] = useState(REPAIR_CATEGORY_OPTIONS[0]?.key || "vik");
  const [activityKey, setActivityKey] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricingMode, setPricingMode] = useState("labor_plus_materials");

  const pricingCategory = useMemo(() => getPricingCategory(categoryKey), [categoryKey]);
  const activities = pricingCategory?.activities || [];
  const estimate = useMemo(
    () =>
      calculateRepairEstimate({
        categoryKey,
        selectedActivities: activityKey ? [activityKey] : [],
        sizeOption: quantity,
        pricingMode,
        location: "sofia_regular",
      }),
    [activityKey, categoryKey, pricingMode, quantity],
  );

  function changeCategory(nextCategoryKey) {
    setCategoryKey(nextCategoryKey);
    setActivityKey("");
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Calculator className="text-emerald-400" aria-hidden="true" />
        <h1 className="text-3xl font-bold">Bricky калкулатор</h1>
      </div>

      <div className="grid gap-6 rounded-lg border border-slate-700 bg-slate-900 p-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">Категория</span>
            <select
              value={categoryKey}
              onChange={(event) => changeCategory(event.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-950 p-3"
            >
              {REPAIR_CATEGORY_OPTIONS.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">Дейност</span>
            <select
              value={activityKey}
              onChange={(event) => setActivityKey(event.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-950 p-3"
            >
              <option value="">Общ ориентир за категорията</option>
              {activities.map((activity) => (
                <option key={activity.key} value={activity.key}>
                  {activity.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">Количество / обхват</span>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-950 p-3"
            />
          </label>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ценови режим">
            {PRICING_MODES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPricingMode(value)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 ${
                  pricingMode === value
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-600 bg-slate-950 text-slate-300"
                }`}
              >
                {pricingMode === value && <Check size={17} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-slate-700 bg-slate-950 p-5">
          <div>
            <p className="text-sm text-slate-400">Ориентировъчна цена</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {estimate.expectedMin}-{estimate.expectedMax} {estimate.currency}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Версия на цените: {estimate.pricingVersion}
            </p>
          </div>

          <div className="mt-6 space-y-2 border-t border-slate-700 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <span>Труд</span>
              <b>{estimate.laborMin}-{estimate.laborMax} {estimate.currency}</b>
            </div>
            <div className="flex justify-between gap-4">
              <span>Материали</span>
              <b>
                {estimate.pricingMode === "labor_only"
                  ? "не са включени"
                  : `${estimate.materialMin}-${estimate.materialMax} ${estimate.currency}`}
              </b>
            </div>
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Ориентирът не е оферта. Крайната цена се потвърждава след оглед.
          </p>
        </div>
      </div>
    </section>
  );
}

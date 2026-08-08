import { useEffect, useMemo, useState } from "react";
import { Calculator, Check, RefreshCw } from "lucide-react";
import { REPAIR_CATEGORY_OPTIONS } from "../../constants/repairCatalog";
import { getPricingCategory } from "../../constants/repairPricingConfig";
import { apiGet } from "../../services/api";
import { calculateRepairEstimate } from "../../utils/repairPriceCalculator";

const PRICING_MODES = [
  ["labor_only", "Само труд"],
  ["labor_plus_materials", "Труд и материали"],
];

const UNIT_LABELS = {
  m2: "Площ (кв. м)",
  linear_meter: "Дължина (м)",
  item: "Брой",
  room: "Брой помещения",
  hour: "Работни часове",
};

const SCALABLE_UNITS = new Set(Object.keys(UNIT_LABELS));

function roundPrice(value) {
  return Math.ceil(Math.max(0, Number(value) || 0));
}

export default function WorkerCalculatorPanel() {
  const [categoryKey, setCategoryKey] = useState(REPAIR_CATEGORY_OPTIONS[0]?.key || "vik");
  const [activityKey, setActivityKey] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricingMode, setPricingMode] = useState("labor_plus_materials");
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let active = true;
    apiGet("/catalog")
      .then((response) => active && setCatalog(response.data || null))
      .catch(() => active && setCatalogError("Цените от сървъра не са достъпни. Показваме резервния ориентир."));
    return () => { active = false; };
  }, []);

  const staticCategory = useMemo(() => getPricingCategory(categoryKey), [categoryKey]);
  const liveCategory = useMemo(
    () => catalog?.categories?.find((category) => category.categoryKey === categoryKey),
    [catalog, categoryKey],
  );
  const activities = liveCategory?.activities?.filter((activity) => activity.isActive) || staticCategory?.activities || [];
  const selectedActivity = activities.find((activity) => (activity.activityKey || activity.key) === activityKey);
  const unitType = selectedActivity?.unitType || selectedActivity?.unit_type || "item";
  const quantityLabel = UNIT_LABELS[unitType] || "Брой услуги";
  const numericQuantity = Math.max(0, Number(quantity) || 0);

  const liveRule = useMemo(
    () => catalog?.pricingRules?.find(
      (rule) => rule.categoryKey === categoryKey && rule.activityKey === activityKey && rule.isActive,
    ),
    [activityKey, catalog, categoryKey],
  );

  const estimate = useMemo(() => {
    if (!activityKey || numericQuantity <= 0) return null;
    if (liveRule) {
      const scale = SCALABLE_UNITS.has(unitType) ? numericQuantity : 1;
      const laborMin = roundPrice(Number(liveRule.laborMin) * scale);
      const laborMax = roundPrice(Number(liveRule.laborMax) * scale);
      const includeMaterials = pricingMode === "labor_plus_materials";
      const materialMin = includeMaterials && liveRule.materialMin != null
        ? roundPrice(Number(liveRule.materialMin) * scale)
        : 0;
      const materialMax = includeMaterials && liveRule.materialMax != null
        ? roundPrice(Number(liveRule.materialMax) * scale)
        : 0;
      return {
        expectedMin: laborMin + materialMin,
        expectedMax: laborMax + materialMax,
        laborMin,
        laborMax,
        materialMin,
        materialMax,
        currency: liveRule.currency || "EUR",
        pricingVersion: liveRule.version,
        pricingMode,
        source: "live",
      };
    }

    const fallbackEstimate = calculateRepairEstimate({
        categoryKey,
        selectedActivities: [activityKey],
        sizeOption: String(numericQuantity),
        exactAreaM2: unitType === "m2" ? numericQuantity : null,
        pricingMode,
        location: "sofia_regular",
      });

    return {
      ...fallbackEstimate,
      expectedMin: fallbackEstimate.totalMin,
      expectedMax: fallbackEstimate.totalMax,
      source: "fallback",
    };
  }, [activityKey, categoryKey, liveRule, numericQuantity, pricingMode, unitType]);

  function changeCategory(nextCategoryKey) {
    setCategoryKey(nextCategoryKey);
    setActivityKey("");
    setQuantity("1");
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Calculator className="text-emerald-400" aria-hidden="true" />
        <h1 className="text-3xl font-bold">Bricky калкулатор</h1>
      </div>

      {catalogError && <p className="mb-4 rounded-md border border-amber-400/30 bg-amber-950/30 p-3 text-sm text-amber-100">{catalogError}</p>}

      <div className="grid gap-6 rounded-lg border border-cyan-400/15 bg-[#0b2033] p-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <Field label="Категория">
            <select value={categoryKey} onChange={(event) => changeCategory(event.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 p-3">
              {REPAIR_CATEGORY_OPTIONS.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
            </select>
          </Field>

          <Field label="Конкретна дейност">
            <select value={activityKey} onChange={(event) => setActivityKey(event.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 p-3">
              <option value="">Избери дейност</option>
              {activities.map((activity) => (
                <option key={activity.activityKey || activity.key} value={activity.activityKey || activity.key}>{activity.label}</option>
              ))}
            </select>
          </Field>

          <Field label={quantityLabel} hint={unitType === "m2" ? "Въведи реалната приблизителна площ." : "Въведи колко единици ще се изпълнят."}>
            <input type="number" min="0.5" step="0.5" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 p-3" />
          </Field>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ценови режим">
            {PRICING_MODES.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setPricingMode(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 ${pricingMode === value ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-slate-600 bg-slate-950 text-slate-300"}`}>
                {pricingMode === value && <Check size={17} aria-hidden="true" />}{label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-slate-700 bg-slate-950 p-5">
          {!estimate ? (
            <div className="flex min-h-52 flex-col items-center justify-center text-center text-slate-400">
              <RefreshCw className="mb-3 text-cyan-400" size={28} aria-hidden="true" />
              Избери конкретна дейност и въведи размер, за да получиш ориентир.
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-slate-400">Ориентировъчна цена</p>
                <p className="mt-2 text-3xl font-bold text-emerald-300">{estimate.expectedMin}-{estimate.expectedMax} {estimate.currency}</p>
                <p className="mt-2 text-sm text-slate-400">Версия: {estimate.pricingVersion}</p>
              </div>
              <div className="mt-6 space-y-2 border-t border-slate-700 pt-4 text-sm">
                <PriceRow label="Труд" min={estimate.laborMin} max={estimate.laborMax} currency={estimate.currency} />
                <PriceRow label="Материали" min={estimate.materialMin} max={estimate.materialMax} currency={estimate.currency} empty={estimate.pricingMode === "labor_only"} />
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-500">Ориентирът не е оферта. Крайната цена се потвърждава след оглед.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-slate-300">{label}</span>{children}{hint && <span className="block text-xs text-slate-500">{hint}</span>}</label>;
}

function PriceRow({ label, min, max, currency, empty = false }) {
  return <div className="flex justify-between gap-4"><span>{label}</span><b>{empty ? "не са включени" : `${min}-${max} ${currency}`}</b></div>;
}

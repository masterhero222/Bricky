import { useState } from "react";

const PRICE_TABLE = {
  Баня: { material: 140 },
  "Шпакловка и боя": { material: 18 },
  Плочки: { material: 40 },
  ВиК: { material: 55 },
  Електро: { material: 35 },
};

const INITIAL_CALCULATION = {
  type: "",
  area: "",
  laborPerM2: "",
  materials: 0,
  labor: 0,
  total: 0,
};

export default function WorkerCalculatorPanel() {
  const [calculation, setCalculation] = useState(INITIAL_CALCULATION);

  function updateCalculation(field, value) {
    setCalculation((current) => {
      const next = { ...current, [field]: value };
      const area = Number(next.area) || 0;
      const laborPerM2 = Number(next.laborPerM2) || 0;
      const materialPerM2 = PRICE_TABLE[next.type]?.material || 0;

      next.materials = Math.round(area * materialPerM2);
      next.labor = Math.round(area * laborPerM2);
      next.total = next.materials + next.labor;
      return next;
    });
  }

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-3xl font-bold">Калкулатор</h1>

      <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h2 className="text-2xl font-bold">Bricky Калкулатор</h2>

        <select
          value={calculation.type}
          onChange={(event) => updateCalculation("type", event.target.value)}
          className="w-full rounded bg-gray-700 p-3"
        >
          <option value="">Тип ремонт</option>
          {Object.keys(PRICE_TABLE).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="number"
            value={calculation.area}
            onChange={(event) => updateCalculation("area", event.target.value)}
            placeholder="Площ (кв.м)"
            className="w-full rounded bg-gray-700 p-3"
          />
          <input
            type="number"
            value={calculation.laborPerM2}
            onChange={(event) => updateCalculation("laborPerM2", event.target.value)}
            placeholder="Цена за труд / кв.м"
            className="w-full rounded bg-gray-700 p-3"
          />
        </div>

        <div className="space-y-2 rounded-xl bg-gray-900 p-4">
          <div className="flex justify-between">
            <span>Материали:</span>
            <span>{calculation.materials} лв</span>
          </div>
          <div className="flex justify-between">
            <span>Труд:</span>
            <span>{calculation.labor} лв</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>Общо:</span>
            <span className="text-lg font-bold text-green-400">{calculation.total} лв</span>
          </div>
        </div>
      </div>
    </section>
  );
}

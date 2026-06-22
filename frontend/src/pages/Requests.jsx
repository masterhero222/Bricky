import { useState, useEffect } from "react";
import { apiPost } from "../services/api";
import { REPAIR_CATEGORIES, estimateRepairPrice } from "../constants/repairCatalog";
import { useAuthModal } from "../context/AuthModalContext";



export default function Requests() {
  const { showLogin } = useAuthModal();

  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    setIsLogged(Boolean(t));
  }, []);

  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    address: "",
    category: "",
    description: "",
  });

  const [status, setStatus] = useState(null);

  const [calc, setCalc] = useState({
    type: "",
    area: "",
    materials: 0,
    labor: 0,
    total: 0,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogged) {
      setStatus("Първо трябва да влезете в акаунта си.");
      showLogin();
      return;
    }

    try {
      const res = await apiPost("/requests", form);
      console.log("✅ Request created:", res.data);

      setStatus("Заявката е записана успешно!");

      setForm({
        clientName: "",
        email: "",
        phone: "",
        address: "",
        category: "",
        description: "",
      });

    } catch (err) {
      console.error("❌ Request error:", err);
      setStatus("Грешка при изпращане.");
    }
  };

  const updateCalc = (field, value) => {
    const next = { ...calc, [field]: value };
    const areaNum = parseFloat(next.area) || 0;
    const conf = PRICE_TABLE[next.type] || null;

    if (!conf || !areaNum) {
      next.materials = 0;
      next.labor = 0;
      next.total = 0;
    } else {
      next.materials = Math.round(areaNum * conf.material);
      next.labor = Math.round(areaNum * conf.labor);
      next.total = next.materials + next.labor;
    }

    setCalc(next);
  };

  return (
    <div className="px-6 py-24 bg-gray-900 text-white min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Изпрати заявка за ремонт
      </h1>

      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2">

        {/* FORM WRAPPER */}
        <div className="relative">

          {/* LOCKED OVERLAY */}
          {!isLogged && (
            <div className="absolute inset-0 bg-black bg-opacity-60 rounded-2xl z-20 flex items-center justify-center">
              <button
                onClick={showLogin}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-xl shadow-lg"
              >
                Login / Register
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 ${
              !isLogged ? "opacity-30 pointer-events-none" : ""
            }`}
          >
            <input
              type="text"
              name="clientName"
              placeholder="Име на клиента"
              value={form.clientName}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600"
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Имейл"
              value={form.email}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600"
              required
            />

            <input
              type="text"
              name="phone"
              placeholder="Телефон"
              value={form.phone}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600"
              required
            />

            <input
              type="text"
              name="address"
              placeholder="Адрес"
              value={form.address}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600"
            />

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600"
            >
              <option value="">Тип ремонт</option>
            {REPAIR_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

            <textarea
              name="description"
              placeholder="Описание"
              value={form.description}
              onChange={handleChange}
              className="w-full p-3 h-32 rounded bg-gray-700 border border-gray-600"
            />

            <button
              type="submit"
              disabled={!isLogged}
              className={`w-full p-3 rounded font-bold text-lg transition 
                ${isLogged ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 cursor-not-allowed"}`}
            >
              {isLogged ? "Изпрати заявка" : "Login / Register"}
            </button>

            {status && (
              <p className="mt-2 text-sm font-medium text-green-400">
                {status}
              </p>
            )}
          </form>
        </div>

        {/* CALCULATOR */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold">Bricky Калкулатор</h2>

          <select
            value={calc.type}
            onChange={(e) => updateCalc("type", e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
          >
            <option value="">Тип ремонт</option>
            {REPAIR_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="0.1"
            value={calc.quantity}
            onChange={(e) => updateCalc("quantity", e.target.value)}
            placeholder={`Количество (${calc.unit || "кв.м / точка"})`}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
          />

          <div className="bg-gray-900 p-4 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Материали:</span>
              <span className="font-semibold text-blue-300">
                {calc.materials} лв
              </span>
            </div>

            <div className="flex justify-between">
              <span>Труд:</span>
              <span className="font-semibold text-blue-300">
                {calc.labor} лв
              </span>
            </div>

            <div className="flex justify-between border-t border-gray-700 pt-2">
              <span className="font-semibold">Общо:</span>
              <span className="font-bold text-green-400">
                {calc.total} лв
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


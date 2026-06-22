// @ts-nocheck
import React, { useState } from "react";
import { apiPost } from "../services/api";
import { REPAIR_CATEGORIES } from "../constants/repairCatalog";

const CATEGORIES = REPAIR_CATEGORIES.map((category) => ({ value: category, label: category }));

export default function CreateRequest({ initialClient, onCreated }) {
  const [form, setForm] = useState({
    clientName: initialClient?.name || "",
    email: initialClient?.email || "",
    phone: initialClient?.phone || "",
    address: initialClient?.address || "",
    category: "",
    description: "",
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const generateDraft = async () => {
    try {
      setErr("");
      setAiLoading(true);
      setAiQuestions([]);

      if (!aiPrompt.trim()) {
        setErr("Опиши накратко проблема, за да помогне Bricky AI.");
        return;
      }

      const { data } = await apiPost("/requests/draft", {
        prompt: aiPrompt,
        address: form.address,
      });

      setForm((p) => ({
        ...p,
        category: data.category || p.category,
        description: data.description || p.description,
      }));
      setAiQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (e) {
      console.error(e);
      setErr("Bricky AI не успя да генерира чернова. Можеш да попълниш заявката ръчно.");
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async () => {
    try {
      setErr("");
      setLoading(true);

      if (!form.clientName || !form.email || !form.phone || !form.category) {
        setErr("Попълни име, имейл, телефон и категория.");
        return;
      }

      await apiPost("/requests", form);

      alert("Заявката е създадена!");
      onCreated?.();
    } catch (e) {
      console.error(e);
      setErr(
        "Не успях да създам заявка. Провери дали токенът се праща (Authorization: Bearer ...)."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-gray-800 border border-gray-700 rounded-xl p-6">
      <h1 className="text-2xl font-bold mb-4">Направи заявка</h1>

      {err && <p className="text-red-400 mb-3">{err}</p>}

      <div className="mb-6 rounded-lg border border-blue-500/40 bg-blue-950/30 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-blue-100">Bricky AI помощник</h2>
            <p className="mt-1 text-sm text-blue-100/70">
              Опиши проблема свободно, а AI ще предложи категория и по-ясно описание.
            </p>
          </div>
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-100">AI</span>
        </div>

        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Напр. Тече вода под мивката и шкафът се мокри..."
          className="mt-4 h-24 w-full rounded bg-gray-900 border border-gray-700 p-3"
        />

        <button
          type="button"
          onClick={generateDraft}
          disabled={aiLoading}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {aiLoading ? "Генерирам..." : "Генерирай с Bricky AI"}
        </button>

        {aiQuestions.length > 0 && (
          <div className="mt-4 text-sm text-blue-50/80">
            <p className="font-semibold text-blue-50">Уточняващи въпроси:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {aiQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <input
          name="clientName"
          value={form.clientName}
          onChange={handleChange}
          placeholder="Име"
          className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Телефон"
          className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
        />
      </div>

      <input
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Имейл"
        className="mt-4 p-3 rounded bg-gray-900 border border-gray-700 w-full"
      />

      <input
        name="address"
        value={form.address}
        onChange={handleChange}
        placeholder="Адрес (по желание)"
        className="mt-4 p-3 rounded bg-gray-900 border border-gray-700 w-full"
      />

      <select
        name="category"
        value={form.category}
        onChange={handleChange}
        className="mt-4 p-3 rounded bg-gray-900 border border-gray-700 w-full"
      >
        <option value="">Категория</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Описание"
        className="mt-4 p-3 rounded bg-gray-900 border border-gray-700 w-full h-32"
      />

      <button
        onClick={submit}
        disabled={loading}
        className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold disabled:opacity-60"
      >
        {loading ? "Пращам..." : "Създай заявка"}
      </button>
    </div>
  );
}




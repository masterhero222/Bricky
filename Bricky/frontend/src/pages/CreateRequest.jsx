// @ts-nocheck
import React, { useState } from "react";
import { apiPost } from "../services/api";

const CATEGORIES = ["ВиК", "Електро", "Шпакловка и боя", "Плочки"];

export default function CreateRequest({ initialClient, onCreated }) {
  const [form, setForm] = useState({
    clientName: initialClient?.name || "",
    email: initialClient?.email || "",
    phone: initialClient?.phone || "",
    address: initialClient?.address || "",
    category: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
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
          <option key={c} value={c}>
            {c}
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
        className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold"
      >
        {loading ? "Пращам..." : "Създай заявка"}
      </button>
    </div>
  );
}

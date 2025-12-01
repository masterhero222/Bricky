import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import requestService from "../services/requestService";

export default function CreateRequest() {
  const navigate = useNavigate();

  // Проверка за токен
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");   // ако е гост, OUT.
    }
  }, []);

  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    address: "",
    category: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestService.createRequest(form); // изпраща с токена вътре
      navigate("/requests");
    } catch (err) {
      setError(err?.response?.data?.message || "Грешка при изпращане");
    }

    setLoading(false);
  }

  return (
    <div className="p-6 max-w-xl mx-auto">

      <h1 className="text-2xl font-bold mb-4">Нова заявка</h1>

      {error && (
        <p className="bg-red-100 text-red-600 p-2 mb-3 rounded">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="grid gap-3">

        <input
          type="text"
          name="clientName"
          placeholder="Име"
          value={form.clientName}
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          type="email"
          name="email"
          placeholder="Имейл"
          value={form.email}
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          type="text"
          name="phone"
          placeholder="Телефон"
          value={form.phone}
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          type="text"
          name="address"
          placeholder="Адрес"
          value={form.address}
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="">Избери категория</option>
          <option value="ВиК">ВиК</option>
          <option value="Електро">Електро</option>
          <option value="Шпакловка и боя">Шпакловка и боя</option>
          <option value="Плочки">Плочки</option>
        </select>

        <textarea
          name="description"
          placeholder="Описание"
          value={form.description}
          onChange={handleChange}
          className="border p-2 rounded h-32"
        />

        <button
          disabled={loading}
          className="bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Изпращане..." : "Създай заявка"}
        </button>

      </form>
    </div>
  );
}

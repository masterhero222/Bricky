import { useState } from "react";
import axios from "axios";

export default function Requests() {
  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    address: "",
    category: "",
    description: "",
  });

  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/requests`, form);
;
      console.log("✅ Response:", res.data);
      setStatus("Заявката е записана успешно ✅");
      setForm({
        clientName: "",
        email: "",
        phone: "",
        address: "",
        category: "",
        description: "",
      });
    } catch (err) {
      console.error("❌ Error:", err);
      setStatus("Грешка при изпращане ❌");
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Изпрати заявка</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-6 rounded-2xl w-full max-w-2xl shadow-lg space-y-4"
      >
        <input
          type="text"
          name="clientName"
          placeholder="Име на клиента"
          value={form.clientName}
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Имейл"
          value={form.email}
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none"
          required
        />
        <input
          type="text"
          name="phone"
          placeholder="Телефон"
          value={form.phone}
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none"
          required
        />
        <input
          type="text"
          name="address"
          placeholder="Адрес"
          value={form.address}
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none"
        />
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none"
        >
          <option value="">Избери категория ремонт</option>
          <option value="ВиК">ВиК</option>
          <option value="Електро">Електро</option>
          <option value="Шпакловка и боя">Шпакловка и боя</option>
          <option value="Плочки">Плочки</option>
        </select>
        <textarea
          name="description"
          placeholder="Опиши какво трябва да се направи..."
          value={form.description}
          onChange={handleChange}
          className="w-full p-3 h-32 rounded bg-gray-700 border border-gray-600 focus:outline-none"
        ></textarea>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold text-lg transition"
        >
          Изпрати заявка
        </button>
      </form>
      {status && <p className="mt-6 text-lg font-medium text-green-400">{status}</p>}
    </div>
  );
}

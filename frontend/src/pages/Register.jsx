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

  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/requests`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Заявката е изпратена!");
    } catch (err) {
      console.error(err);
      alert("Грешка. Увери се, че си логнат.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-24 px-6">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-gray-800 p-8 rounded-xl space-y-4">
        <h2 className="text-2xl font-bold text-center">Създай заявка</h2>

        <input name="clientName" onChange={handleChange} placeholder="Име" className="w-full p-3 bg-gray-700 rounded" />
        <input name="email" onChange={handleChange} placeholder="Имейл" className="w-full p-3 bg-gray-700 rounded" />
        <input name="phone" onChange={handleChange} placeholder="Телефон" className="w-full p-3 bg-gray-700 rounded" />
        <input name="address" onChange={handleChange} placeholder="Адрес" className="w-full p-3 bg-gray-700 rounded" />

        <input name="category" onChange={handleChange} placeholder="Категория" className="w-full p-3 bg-gray-700 rounded" />

        <textarea
          name="description"
          onChange={handleChange}
          placeholder="Описание"
          className="w-full p-3 bg-gray-700 rounded"
        />

        <button className="w-full bg-blue-600 p-3 rounded font-bold">Изпрати</button>
      </form>
    </div>
  );
}

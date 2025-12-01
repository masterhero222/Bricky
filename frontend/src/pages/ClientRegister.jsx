// @ts-nocheck
import { useState } from "react";
import axios from "axios";

export default function ClientRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Паролите не съвпадат.");
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
  name: form.fullName,
  email: form.email,
  phone: form.phone,
  password: form.password,
});


      setSuccess("Успешна регистрация!");

      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Грешка при регистрацията.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <form className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-4" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-center">Регистрация</h1>

        <input
          type="text"
          name="name"
          placeholder="Име"
          onChange={handleChange}
          value={form.name}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Имейл"
          onChange={handleChange}
          value={form.email}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Парола"
          onChange={handleChange}
          value={form.password}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Потвърди паролата"
          onChange={handleChange}
          value={form.confirmPassword}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        {error && <p className="text-red-400 text-center">{error}</p>}
        {success && <p className="text-green-400 text-center">{success}</p>}

        <button className="w-full bg-blue-600 p-3 rounded font-bold">
          Регистрация
        </button>
      </form>
    </div>
  );
}

// @ts-nocheck
import { useState } from "react";
import axios from "axios";

export default function ClientLogin() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, form);


      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userName", res.data.user.name);

      window.location.href = "/requests";
    } catch (err) {
      console.error(err);
      setError("Грешен имейл или парола.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <form className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-4" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-center">Вход</h1>

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

        {error && <p className="text-red-400 text-center">{error}</p>}

        <button className="w-full bg-blue-600 p-3 rounded font-bold">
          Вход
        </button>
      </form>
    </div>
  );
}

import { useState } from "react";
import axios from "axios";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);

      if (res.data.user.role === "client") window.location.href = "/client/profile";
      else window.location.href = "/worker/profile";
    } catch (err) {
      // Network errors (connection refused, CORS, DNS, etc.)
      if (!err.response) {
        console.error("NETWORK ERROR:", err);
        setError("Няма връзка с бекенда (API). Провери VITE_API_URL и дали backend работи.");
        return;
      }

      const msg = err.response?.data?.message;
      console.error("LOGIN ERROR:", err.response?.data || err);

      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Грешен имейл или парола.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
      <form className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-4 shadow-lg" onSubmit={submit}>
        <h1 className="text-2xl font-bold text-center">Вход</h1>

        <input
          type="email"
          name="email"
          placeholder="Имейл"
          value={form.email}
          onChange={change}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Парола"
          value={form.password}
          onChange={change}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        {error && <p className="text-red-400 text-center">{error}</p>}

        <button className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold">Вход</button>
      </form>
    </div>
  );
}

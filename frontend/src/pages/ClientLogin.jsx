// @ts-nocheck
import { useState } from "react";
import { apiPost } from "../services/api";

export default function ClientLogin() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [devLoading, setDevLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const finishLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("userName", data.user.name || "");
    window.location.href = "/client/profile";
  };


  const finishDevLoginOffline = (role) => {
    finishLogin({
      token: `local-dev-token-${role}`,
      user: {
        id: role === "client" ? 1 : 2,
        role,
        name: role === "client" ? "Dev Client" : "Dev Worker",
        email: `${role}.dev@bricky.local`,
      },
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await apiPost("/auth/login", form);
      finishLogin(res.data);
    } catch (err) {
      console.error(err);
      setError("Грешен имейл или парола.");
    }
  };

  const devLogin = async () => {
    setError("");
    setDevLoading(true);

    try {
      const res = await apiPost("/auth/dev-login", { role: "client" });
      finishLogin(res.data);
    } catch (err) {
      console.error("Client dev login error:", err?.response?.data || err.message);
      finishDevLoginOffline("client");
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <form className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-4" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-center">Вход клиент</h1>

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

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={devLogin}
            disabled={devLoading}
            className="w-full rounded bg-emerald-700 p-3 font-bold hover:bg-emerald-600 disabled:opacity-60"
          >
            {devLoading ? "Влизам..." : "Dev: влез като клиент"}
          </button>
        )}
      </form>
    </div>
  );
}



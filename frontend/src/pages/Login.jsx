import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [devLoading, setDevLoading] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const finishLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("userName", data.user.name || "");

    const destination = {
      admin: "/admin",
      client: "/client/profile",
      worker: "/worker/profile",
    }[data.user.role] || "/auth";

    window.location.href = destination;
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
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setShowResend(false);

    try {
      const res = await apiPost("/auth/login", form);
      finishLogin(res.data);
    } catch (err) {
      if (!err.response) {
        console.error("NETWORK ERROR:", err);
        setError("Няма връзка с backend API. Провери дали backend работи на localhost:3000.");
        return;
      }

      const msg = err.response?.data?.message;
      console.error("LOGIN ERROR:", err.response?.data || err);
      const normalizedMessage = Array.isArray(msg) ? msg.join(", ") : msg || "Грешен имейл или парола.";
      setError(normalizedMessage);
      setShowResend(normalizedMessage.toLowerCase().includes("имейлът не е потвърден"));
    }
  };

  const resendVerification = async () => {
    setError("");
    setNotice("");

    try {
      const res = await apiPost("/auth/resend-verification", { email: form.email });
      setNotice(res.data?.message || "Ако има акаунт с този имейл, ще получиш инструкции.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Не успяхме да изпратим нов линк.");
    }
  };

  const devLogin = async (role) => {
    setError("");
    setDevLoading(role);

    try {
      const res = await apiPost("/auth/dev-login", { role });
      finishLogin(res.data);
    } catch (err) {
      console.error("DEV LOGIN ERROR:", err?.response?.data || err.message);
      finishDevLoginOffline(role);
    } finally {
      setDevLoading("");
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

        {error && <p className="rounded-lg bg-red-500/15 p-3 text-center text-red-200">{error}</p>}
        {notice && <p className="rounded-lg bg-emerald-500/15 p-3 text-center text-emerald-200">{notice}</p>}

        {showResend && (
          <button
            type="button"
            onClick={resendVerification}
            className="w-full rounded bg-slate-700 p-3 font-bold text-slate-100 hover:bg-slate-600"
          >
            Изпрати нов линк за потвърждение
          </button>
        )}

        <button className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold">Вход</button>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link className="text-blue-300 hover:text-blue-200" to="/auth/forgot-password">
            Забравена парола?
          </Link>
          <Link className="text-slate-300 hover:text-white" to="/auth/register">
            Нямаш акаунт? Регистрация
          </Link>
        </div>

        {import.meta.env.DEV && (
          <div className="border-t border-gray-700 pt-4 space-y-2">
            <p className="text-sm text-gray-300 text-center">Локално тестване</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => devLogin("client")}
                disabled={Boolean(devLoading)}
                className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60"
              >
                {devLoading === "client" ? "Влизам..." : "Като клиент"}
              </button>
              <button
                type="button"
                onClick={() => devLogin("worker")}
                disabled={Boolean(devLoading)}
                className="rounded bg-amber-700 px-3 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
              >
                {devLoading === "worker" ? "Влизам..." : "Като майстор"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}



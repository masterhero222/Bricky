import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPost } from "../services/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", code: "" });
  const [state, setState] = useState({ loading: true, message: "", error: "" });

  useEffect(() => {
    const token = params.get("token") || "";
    if (!token) {
      setState({ loading: false, message: "", error: "" });
      return;
    }

    apiPost("/auth/verify-email", { token })
      .then((res) => {
        setState({
          loading: false,
          message: res.data?.message || "Имейлът е потвърден успешно.",
          error: "",
        });
      })
      .catch((err) => {
        const msg = err.response?.data?.message;
        setState({
          loading: false,
          message: "",
          error: Array.isArray(msg) ? msg.join(", ") : msg || "Линкът е невалиден или е изтекъл.",
        });
      });
  }, [params]);

  const submitCode = async (event) => {
    event.preventDefault();
    setState({ loading: true, message: "", error: "" });
    try {
      const res = await apiPost("/auth/verify-email-code", {
        email: form.email,
        code: form.code,
      });
      setState({
        loading: false,
        message: res.data?.message || "Имейлът е потвърден успешно.",
        error: "",
      });
    } catch (err) {
      const msg = err.response?.data?.message;
      setState({
        loading: false,
        message: "",
        error: Array.isArray(msg) ? msg.join(", ") : msg || "Кодът е невалиден или е изтекъл.",
      });
    }
  };

  return (
    <AuthShell title="Потвърждение на имейл">
      {state.loading && <p className="text-slate-300">Проверяваме данните...</p>}
      {state.message && <p className="rounded-lg bg-emerald-500/15 p-4 text-emerald-200">{state.message}</p>}
      {state.error && <p className="rounded-lg bg-red-500/15 p-4 text-red-200">{state.error}</p>}

      {!params.get("token") && !state.message && (
        <form className="space-y-3" onSubmit={submitCode}>
          <p className="text-sm text-slate-300">
            Въведи имейла и 6-цифрения код, който получи след регистрация.
          </p>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
            placeholder="Имейл"
            required
            className="w-full rounded-lg bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-cyan-400"
          />
          <input
            value={form.code}
            onChange={(event) => setForm((value) => ({ ...value, code: event.target.value.replace(/\D/g, "").slice(0, 6) }))}
            placeholder="Код за потвърждение"
            inputMode="numeric"
            maxLength={6}
            required
            className="w-full rounded-lg bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-cyan-400"
          />
          <button className="w-full rounded-lg bg-blue-600 p-3 font-bold hover:bg-blue-700" disabled={state.loading}>
            Потвърди акаунта
          </button>
        </form>
      )}

      <Link className="block rounded-lg bg-slate-800 p-3 text-center font-bold hover:bg-slate-700" to="/auth/login">
        Към вход
      </Link>
    </AuthShell>
  );
}

function AuthShell({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-md space-y-5 rounded-xl bg-gray-900 p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

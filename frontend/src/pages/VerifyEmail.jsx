import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPost } from "../services/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, message: "", error: "" });

  useEffect(() => {
    const token = params.get("token") || "";
    if (!token) {
      setState({ loading: false, message: "", error: "Липсва token за потвърждение." });
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

  return (
    <AuthShell title="Потвърждение на имейл">
      {state.loading && <p className="text-slate-300">Проверяваме линка...</p>}
      {state.message && <p className="rounded-lg bg-emerald-500/15 p-4 text-emerald-200">{state.message}</p>}
      {state.error && <p className="rounded-lg bg-red-500/15 p-4 text-red-200">{state.error}</p>}
      <Link className="block rounded-lg bg-blue-600 p-3 text-center font-bold hover:bg-blue-700" to="/auth/login">
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

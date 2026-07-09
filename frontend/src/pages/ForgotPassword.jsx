import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await apiPost("/auth/request-password-reset", { email });
      setMessage(res.data?.message || "Ако има акаунт с този имейл, ще получиш инструкции.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Не успяхме да изпратим инструкции.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <form className="w-full max-w-md space-y-5 rounded-xl bg-gray-900 p-8 shadow-xl" onSubmit={submit}>
        <h1 className="text-center text-2xl font-bold">Забравена парола</h1>
        <p className="text-sm text-slate-300">
          Въведи имейла си и ще изпратим линк за смяна на паролата, ако има такъв акаунт.
        </p>
        <input
          className="w-full rounded bg-gray-800 p-3"
          type="email"
          placeholder="Имейл"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {message && <p className="rounded-lg bg-emerald-500/15 p-3 text-emerald-200">{message}</p>}
        {error && <p className="rounded-lg bg-red-500/15 p-3 text-red-200">{error}</p>}
        <button className="w-full rounded bg-blue-600 p-3 font-bold hover:bg-blue-700 disabled:opacity-60" disabled={loading}>
          {loading ? "Изпращане..." : "Изпрати линк"}
        </button>
        <Link className="block text-center text-sm text-blue-300 hover:text-blue-200" to="/auth/login">
          Обратно към вход
        </Link>
      </form>
    </div>
  );
}

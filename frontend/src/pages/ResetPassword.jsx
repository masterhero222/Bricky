import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPost } from "../services/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const token = params.get("token") || "";
    if (!token) {
      setError("Липсва token за смяна на парола.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Паролите не съвпадат.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/auth/reset-password", { token, password });
      setMessage(res.data?.message || "Паролата е сменена успешно.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Линкът е невалиден или е изтекъл.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <form className="w-full max-w-md space-y-5 rounded-xl bg-gray-900 p-8 shadow-xl" onSubmit={submit}>
        <h1 className="text-center text-2xl font-bold">Нова парола</h1>
        <input
          className="w-full rounded bg-gray-800 p-3"
          type="password"
          placeholder="Нова парола"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
        />
        <input
          className="w-full rounded bg-gray-800 p-3"
          type="password"
          placeholder="Потвърди новата парола"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={6}
        />
        {message && <p className="rounded-lg bg-emerald-500/15 p-3 text-emerald-200">{message}</p>}
        {error && <p className="rounded-lg bg-red-500/15 p-3 text-red-200">{error}</p>}
        <button className="w-full rounded bg-blue-600 p-3 font-bold hover:bg-blue-700 disabled:opacity-60" disabled={loading}>
          {loading ? "Запазване..." : "Смени паролата"}
        </button>
        <Link className="block text-center text-sm text-blue-300 hover:text-blue-200" to="/auth/login">
          Към вход
        </Link>
      </form>
    </div>
  );
}

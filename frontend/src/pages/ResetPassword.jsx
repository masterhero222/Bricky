import { useState } from "react";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPost } from "../services/api";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  passwordPolicyError,
} from "../utils/passwordPolicy";

function errorMessage(error, fallback) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  async function requestLink(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await apiPost("/auth/password-reset/request", { email });
      setMessage(response.data?.message || "Проверете входящата си поща.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Заявката не можа да бъде изпратена."));
    } finally {
      setLoading(false);
    }
  }

  async function confirmPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmation) {
      setError("Паролите не съвпадат.");
      return;
    }
    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    setLoading(true);
    try {
      await apiPost("/auth/password-reset/confirm", {
        token,
        newPassword: password,
      });
      setCompleted(true);
      setMessage("Паролата е сменена успешно.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Линкът е невалиден или е изтекъл."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-78px)] max-w-xl items-center px-5 py-12">
      <section className="bricky-card w-full rounded-2xl p-7 sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          {completed ? <CheckCircle2 /> : token ? <KeyRound /> : <Mail />}
        </div>
        <h1 className="mt-5 text-3xl font-extrabold">{token ? "Задаване на нова парола" : "Забравена парола"}</h1>
        <p className="mt-2 text-slate-400">
          {token
            ? "Въведете нова парола за профила си. Линкът може да бъде използван само веднъж."
            : "Ще изпратим еднократен защитен линк на регистрирания ви имейл."}
        </p>

        {(message || error) && (
          <div className={`mt-6 rounded-lg border px-4 py-3 text-sm font-bold ${error ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
            {error || message}
          </div>
        )}

        {completed ? (
          <Link to="/auth/login" className="bricky-button-primary mt-7 w-full justify-center">Към вход</Link>
        ) : token ? (
          <form onSubmit={confirmPassword} className="mt-7 space-y-5">
            <PasswordField label="Нова парола" value={password} onChange={setPassword} />
            <p className="text-sm text-slate-400">{PASSWORD_REQUIREMENTS}</p>
            <PasswordField label="Повтори паролата" value={confirmation} onChange={setConfirmation} />
            <button disabled={loading} className="bricky-button-primary w-full justify-center">
              <KeyRound size={18} /> {loading ? "Запазване..." : "Задай новата парола"}
            </button>
          </form>
        ) : (
          <form onSubmit={requestLink} className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-300">Регистриран имейл</span>
              <span className="flex items-center gap-3 rounded-lg border border-slate-400/20 bg-slate-950/35 px-4 focus-within:border-cyan-300/60">
                <Mail size={18} className="text-slate-500" />
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-slate-100 outline-none" />
              </span>
            </label>
            <button disabled={loading} className="bricky-button-primary w-full justify-center">
              <Mail size={18} /> {loading ? "Изпращане..." : "Изпрати защитен линк"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
      <span className="flex items-center gap-3 rounded-lg border border-slate-400/20 bg-slate-950/35 px-4 focus-within:border-cyan-300/60">
        <KeyRound size={18} className="text-slate-500" />
        <input required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} type="password" autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-slate-100 outline-none" />
      </span>
    </label>
  );
}

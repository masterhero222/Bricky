import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../../services/api";

export default function NewsPreferencesPanel() {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    apiGet("/auth/me/news-preferences")
      .then((res) => {
        if (mounted) setPreferences(res.data);
      })
      .catch(() => {
        if (mounted) setError("Не успяхме да заредим предпочитанията за новини.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const updatePreference = async (newsOptIn) => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await apiPut("/auth/me/news-preferences", {
        newsOptIn,
        source: "account_settings",
      });
      setPreferences(res.data?.preferences || null);
      setMessage(res.data?.message || "Предпочитанията са запазени.");
    } catch {
      setError("Не успяхме да запазим предпочитанията.");
    } finally {
      setSaving(false);
    }
  };

  const isEnabled = Boolean(preferences?.newsOptIn);

  return (
    <section className="bricky-card rounded-2xl p-6 text-left">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100">Новини от платформата</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Тук управляваш само доброволни новини и продуктови ъпдейти. Важните security и account имейли остават
            активни, за да пазим профила ти.
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${isEnabled ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-500/15 text-slate-300"}`}>
          {isEnabled ? "Включени" : "Изключени"}
        </span>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-400">Зареждане...</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving || isEnabled}
            onClick={() => updatePreference(true)}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Включи новини
          </button>
          <button
            type="button"
            disabled={saving || !isEnabled}
            onClick={() => updatePreference(false)}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Изключи новини
          </button>
        </div>
      )}

      {message && <p className="mt-4 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin, UserPlus } from "lucide-react";
import { apiGet } from "../../services/api";

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

function getApiBase() {
  return String(import.meta.env.VITE_API_URL || "http://94.72.143.22:3000").replace(/\/+$/, "");
}

function getAssetBase() {
  const explicit = import.meta.env.VITE_ASSET_BASE_URL;
  if (explicit) return String(explicit).replace(/\/+$/, "");

  const api = getApiBase();
  return api.replace(/\/api$/i, "");
}

function absUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (/^(data:|blob:)/i.test(url)) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return joinUrl(getAssetBase(), url);
}

export default function Workers() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    try {
      setLoading(true);
      setError("");

      const res = await apiGet("/workers");

      const data = Array.isArray(res?.data) ? res.data : [];
      setWorkers(data);

      console.log("WORKERS API RESPONSE:", res?.data);
    } catch (err) {
      console.error("Workers load error:", err?.response?.data || err);
      setError("Не успях да заредя майсторите.");
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(() => {
    return workers.map((w) => {
      const id = w.userId || w.id;
      const name = w.fullName || w.name || `Майстор #${id || "?"}`;
      const city = w.city || "—";
      const phone = w.phone || "—";
      const skill =
        Array.isArray(w.skills) && w.skills.length > 0 ? w.skills[0] : "Майстор";
      const description = w.description || "Няма описание.";
      const avatar = w.avatarUrl ? absUrl(w.avatarUrl) : "/media_files/Snejan.jpg";
      const completedJobs = Array.isArray(w.completedJobs) ? w.completedJobs : [];
      const jobTypes = Array.from(new Set(completedJobs.map((job) => job.category).filter(Boolean))).slice(0, 3);

      return {
        ...w,
        _id: id,
        _name: name,
        _city: city,
        _phone: phone,
        _skill: skill,
        _description: description,
        _avatar: avatar,
        _completedCount: completedJobs.length,
        _jobTypes: jobTypes,
      };
    });
  }, [workers]);

  return (
    <div className="min-h-screen pb-20 pt-20 text-white">
      <div className="bricky-container">
        <div className="mb-12 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <h1 className="bricky-page-title">Майстори</h1>
            <p className="bricky-page-subtitle">Доверени специалисти за вашия дом.</p>
          </div>

          <button
            onClick={() => navigate("/auth/register?role=worker")}
            className="bricky-button-primary self-start md:self-auto"
          >
            <UserPlus size={21} />
            Стани майстор
          </button>
        </div>

        {loading && (
          <div className="text-center text-gray-300">Зареждане...</div>
        )}

        {!loading && error && (
          <div className="bricky-card rounded-[20px] p-7 text-center text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && cards.length === 0 && (
          <div className="bricky-card rounded-[20px] p-9 text-center text-slate-300">
            Няма регистрирани майстори.
          </div>
        )}

        {!loading && !error && cards.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((w) => (
              <button
                key={w._id}
                onClick={() => navigate(`/worker-preview?userId=${w._id}`)}
                className="group bricky-card min-h-[390px] rounded-[20px] p-7 text-left transition duration-200 hover:-translate-y-1 hover:border-slate-300/30 hover:bg-[#16263e]/95"
              >
                <div className="flex items-center gap-5">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-[3px] border-white/90 bg-slate-700 shadow-xl shadow-black/30">
                      <img
                        src={w._avatar}
                        alt={w._name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/media_files/Snejan.jpg";
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xl font-extrabold leading-tight text-slate-50">{w._name}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-400">{w._skill}</div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5 text-xs font-bold text-green-300">
                        <BadgeCheck size={16} />
                        {w._completedCount} обекта през Bricky
                      </div>
                    </div>
                </div>

                <div className="my-7 h-px bg-slate-400/15" />

                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <MapPin size={18} className="text-slate-400" /> {w._city}
                </div>

                  {w._jobTypes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {w._jobTypes.map((type) => (
                        <span key={type} className="bricky-chip">
                          {type}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 line-clamp-3 min-h-[42px] text-sm leading-6 text-slate-400">
                    {w._description}
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-sm font-bold text-green-300 transition group-hover:gap-3 group-hover:text-green-200">
                    Виж профил <ArrowRight size={18} />
                  </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

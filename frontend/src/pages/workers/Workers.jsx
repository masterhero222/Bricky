import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-extrabold">Майстори</h1>

          <button
            onClick={() => navigate("/auth/register?role=worker")}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold"
          >
            Стани майстор
          </button>
        </div>

        {loading && (
          <div className="text-center text-gray-300">Зареждане...</div>
        )}

        {!loading && error && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && cards.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center text-gray-300">
            Няма регистрирани майстори.
          </div>
        )}

        {!loading && !error && cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((w) => (
              <button
                key={w._id}
                onClick={() => navigate(`/worker-preview?userId=${w._id}`)}
                className="text-left bg-white text-black rounded-2xl shadow-xl overflow-hidden hover:scale-[1.01] transition"
              >
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 px-5 pt-6 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 shrink-0 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-300">
                      <img
                        src={w._avatar}
                        alt={w._name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/media_files/Snejan.jpg";
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-lg font-extrabold leading-tight">{w._name}</div>
                      <div className="text-sm text-gray-600 mt-1">{w._skill}</div>
                      <div className="mt-3 inline-flex rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-bold">
                        {w._completedCount} обекта през Bricky
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5">

                  <div className="mt-4 text-sm text-gray-700 space-y-1">
                    <div><b>Град:</b> {w._city}</div>
                    <div><b>Профилна снимка:</b> {w.avatarUrl ? "качена" : "очаква се"}</div>
                  </div>

                  {w._jobTypes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {w._jobTypes.map((type) => (
                        <span key={type} className="rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-bold">
                          {type}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 text-sm text-gray-600 line-clamp-3">
                    {w._description}
                  </div>

                  <div className="mt-4 text-sm text-blue-600 font-bold">
                    Виж профил →
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

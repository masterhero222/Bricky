import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

function getApiBase() {
  return String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
}

function getAssetBase() {
  const explicit = import.meta.env.VITE_ASSET_BASE_URL;
  if (explicit) return String(explicit).replace(/\/+$/, "");

  const api = getApiBase();
  return api.replace(/\/api$/i, "");
}

function absUrl(url) {
  if (!url || typeof url !== "string") return "";
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

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        "";

      const res = await axios.get(`${getApiBase()}/workers`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

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
      const skill =
        Array.isArray(w.skills) && w.skills.length > 0 ? w.skills[0] : "Майстор";
      const description = w.description || "Няма описание.";
      const avatar = w.avatarUrl ? absUrl(w.avatarUrl) : "/media_files/Snejan.jpg";

      return {
        ...w,
        _id: id,
        _name: name,
        _city: city,
        _skill: skill,
        _description: description,
        _avatar: avatar,
      };
    });
  }, [workers]);

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-extrabold">Майстори</h1>


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
                onClick={() => navigate(`/workers/${w._id}`)}
                className="text-left bg-white text-black rounded-2xl shadow-xl overflow-hidden hover:scale-[1.01] transition"
              >
                <div className="h-48 bg-gray-200">
                  <img
                    src={w._avatar}
                    alt={w._name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/media_files/Snejan.jpg";
                    }}
                  />
                </div>

                <div className="p-5">
                  <div className="text-lg font-extrabold">{w._name}</div>
                  <div className="text-sm text-gray-600 mt-1">{w._skill}</div>

                  <div className="mt-4 text-sm text-gray-700 space-y-1">
                    <div><b>Град:</b> {w._city}</div>
                  </div>

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

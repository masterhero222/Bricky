// src/pages/Workers.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../services/api";


function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

function getAssetBase() {
  const explicit = import.meta.env.VITE_ASSET_BASE_URL;
  if (explicit) return String(explicit).replace(/\/+$/, "");

  const api = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  if (!api) return "";
  return api.replace(/\/api$/i, "");
}

function absUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = getAssetBase();
  if (!base) return "";

  return joinUrl(base, url);
}

export default function Workers() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const res = await apiGet("/workers");

      // ✅ ДЕБЪГ: виж какво реално връща
      console.log("GET /workers ->", res?.data);

      // ✅ Поддържаме различни форми на response
      const raw = res?.data;
      const list =
        Array.isArray(raw) ? raw :
        Array.isArray(raw?.data) ? raw.data :
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.results) ? raw.results :
        [];

      setWorkers(list);
    } catch (e) {
      console.error("Workers load error:", e?.response?.data || e);
      setErr(
        e?.response?.data?.message ||
        `Не успях да заредя майсторите. (${e?.response?.status || "no status"})`
      );
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(() => {
    return (Array.isArray(workers) ? workers : [])
      // ✅ махаме тотално счупени записи
      .filter((w) => (w?.userId || w?.id))
      .map((w) => {
        const name = w.fullName || w.name || `worker #${w.id || w.userId || "?"}`;
        const city = w.city || "—";
        const phone = w.phone || "—";
        const skill = Array.isArray(w.skills) && w.skills.length ? w.skills[0] : "Майстор";
        const avatar = w.avatarUrl ? absUrl(w.avatarUrl) : "/media_files/Snejan.jpg";

        // бекенда ти приема /workers/:userId (userId от users table), но има и legacy записи
        const id = w.userId || w.id;

        return { ...w, _name: name, _city: city, _phone: phone, _skill: skill, _avatar: avatar, _id: id };
      });
  }, [workers]);

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold">Майстори</h1>
          <button
            onClick={() => navigate("/auth/register?role=worker")}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold"
          >
            Стани майстор
          </button>
        </div>

        {loading && <div className="text-center text-gray-300">Зареждане...</div>}

        {!loading && err && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center text-red-300">
            {err}
          </div>
        )}

        {!loading && !err && cards.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center text-gray-300">
            Няма регистрирани майстори (или API-то връща друг формат, виж Console).
          </div>
        )}

        {!loading && !err && cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((w) => (
              <button
                key={String(w._id)}
                onClick={() => navigate(`/workers/${w._id}`)}
                className="text-left bg-white text-black rounded-2xl shadow-xl overflow-hidden hover:scale-[1.01] transition"
              >
                <div className="h-44 bg-gray-200">
                  <img
                    src={w._avatar}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/media_files/Snejan.jpg";
                    }}
                  />
                </div>

                <div className="p-5">
                  <div className="text-lg font-extrabold">{w._name}</div>
                  <div className="text-sm text-gray-600 mt-1">{w._skill}</div>

                  <div className="mt-4 text-sm">
                    <div>
                      <b>Град:</b> {w._city}
                    </div>
                    <div className="mt-1">
                      <b>Телефон:</b> {w._phone}
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-blue-600 font-bold">Виж профил →</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

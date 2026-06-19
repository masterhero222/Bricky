import React from "react";
import { PhoneCall, XCircle } from "lucide-react";

function apiBase() {
  return (import.meta.env.VITE_ASSET_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
}

function absUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${apiBase()}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function WorkerPreview({ worker, gallery = [], onReject }) {
  if (!worker) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Няма избран майстор.
      </div>
    );
  }

  const images = Array.isArray(gallery)
    ? gallery.map((img) => absUrl(img.url || img.imageUrl || img.path || "")).filter(Boolean)
    : [];

  const avatarSrc = worker.avatarUrl ? absUrl(worker.avatarUrl) : "/media_files/Snejan.jpg";
  const title = Array.isArray(worker.skills) && worker.skills.length ? worker.skills[0] : "Майстор";

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto bg-white text-black rounded-3xl shadow-xl p-10">
        <div className="flex flex-col items-center">
          <img
            src={avatarSrc}
            className="w-40 h-40 rounded-full object-cover border-4 border-red-500"
            alt={worker.fullName || "Майстор"}
            onError={(e) => {
              e.currentTarget.src = "/media_files/Snejan.jpg";
            }}
          />
          <h2 className="text-3xl font-extrabold mt-6">{title}</h2>
          <div className="text-gray-600 mt-1">Майстор</div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <div className="bg-red-500 text-white p-6 rounded-2xl">
            <div className="text-xl font-bold">{worker.fullName || `Майстор #${worker.userId || worker.id}`}</div>
            <div className="mt-3"><b>Град:</b> {worker.city || "—"}</div>
            <div className="mt-4 opacity-95"><b>Описание:</b> {worker.description || "—"}</div>
            <div className="mt-4 opacity-95"><b>Опит:</b> {worker.experience || "—"}</div>
          </div>

          <div className="bg-gray-100 p-6 rounded-2xl">
            <div className="text-xl font-bold text-red-600 text-center mb-3">Снимки от обекти</div>
            {images.length === 0 ? (
              <div className="text-gray-500 text-center">Няма качени снимки.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-gray-200 bg-white">
                    <img src={url} className="w-full h-28 object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-100 p-6 rounded-2xl md:col-span-2">
            <div className="text-xl font-bold text-red-600 mb-3">Оборудване / Срок</div>
            <div>{worker.equipment || "—"}</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-10">
          <button className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <PhoneCall size={20} />
            Приемам обаждане от майстора
          </button>

          {onReject && (
            <button onClick={onReject} className="md:w-56 bg-gray-200 hover:bg-gray-300 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
              <XCircle size={20} />
              Назад
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

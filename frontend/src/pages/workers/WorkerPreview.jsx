// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PhoneCall, CheckCircle, XCircle, Star, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiGet, apiPost } from "../../services/api";

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

// ✅ IMPORTANT:
// - VITE_API_URL често е https://bricky.bg/api (само за API)
// - uploads са на https://bricky.bg/uploads (без /api)
// Така че за изображения ползваме asset base (или API base без /api)
function getAssetBase() {
  const explicit = import.meta.env.VITE_ASSET_BASE_URL;
  if (explicit) return String(explicit).replace(/\/+$/, "");

  const api = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  if (!api) return "";

  // махаме /api ако е накрая
  return api.replace(/\/api$/i, "");
}

function absUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = getAssetBase();
  if (!base) return "";

  // url може да е "/uploads/.." или "uploads/.."
  return joinUrl(base, url);
}

function StarsRow({ value = 0 }) {
  const v = Number(value);
  const safe = Number.isFinite(v) ? v : 0;
  const filledCount = Math.max(0, Math.min(5, Math.round(safe)));

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={18}
          className={i <= filledCount ? "text-yellow-400" : "text-gray-300"}
          fill={i <= filledCount ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function GalleryModal({ open, images, startIndex = 0, onClose }) {
  const [viewIndex, setViewIndex] = useState(startIndex);
  const [mode, setMode] = useState("grid"); // "grid" | "view"

  useEffect(() => {
    if (!open) return;
    setViewIndex(startIndex);
    setMode("grid");
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (mode === "view" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        if (e.key === "ArrowLeft") setViewIndex((p) => (p - 1 + images.length) % images.length);
        if (e.key === "ArrowRight") setViewIndex((p) => (p + 1) % images.length);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, mode, images.length, onClose]);

  if (!open) return null;

  const safeImages = Array.isArray(images) ? images : [];
  const current = safeImages[viewIndex];

  const goPrev = () => setViewIndex((p) => (p - 1 + safeImages.length) % safeImages.length);
  const goNext = () => setViewIndex((p) => (p + 1) % safeImages.length);

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="font-bold text-gray-800">
            Галерия ({safeImages.length})
            <span className="ml-3 text-sm text-gray-500">
              {mode === "grid" ? "Избери снимка" : `${viewIndex + 1}/${safeImages.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {mode === "view" && (
              <button
                onClick={() => setMode("grid")}
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-bold"
              >
                Всички
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {mode === "grid" ? (
          <div className="p-4 max-h-[75vh] overflow-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {safeImages.map((img, idx) => (
                <button
                  key={img.id || img.url || idx}
                  className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-90"
                  onClick={() => {
                    setViewIndex(idx);
                    setMode("view");
                  }}
                  title="Отвори"
                >
                  <div className="aspect-square">
                    <img src={img.url} alt="gallery" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative bg-black">
            <div className="max-h-[75vh] flex items-center justify-center">
              {/* main image */}
              <img
                src={current?.url}
                alt="preview"
                className="max-h-[75vh] w-auto object-contain"
                draggable={false}
              />
            </div>

            {/* controls */}
            {safeImages.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2"
                  aria-label="Previous"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2"
                  aria-label="Next"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkerPreview() {
  const [sp] = useSearchParams();
  const requestId = Number(sp.get("requestId") || 0);
  const userId = Number(sp.get("userId") || 0);

  const [worker, setWorker] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [ratingInfo, setRatingInfo] = useState({ total: 0, average: 0 });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ modal state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, userId]);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      if (!userId) {
        setErr("Липсва userId в URL.");
        setWorker(null);
        setGallery([]);
        setRatingInfo({ total: 0, average: 0 });
        return;
      }

      const [wRes, gRes, rRes] = await Promise.all([
        apiGet(`/workers/${userId}`),
        apiGet(`/workers/${userId}/gallery`).catch(() => ({ data: [] })),
        apiGet(`/reviews/worker/${userId}`).catch(() => ({ data: { total: 0, average: 0 } })),
      ]);

      setWorker(wRes.data || null);

      const g = Array.isArray(gRes.data) ? gRes.data : [];

      const normalized = g
        .map((x) => {
          const raw = x?.url || x?.imageUrl || x?.path || x?.filePath || x?.filename || "";
          const finalUrl = absUrl(raw);
          return { ...x, url: finalUrl, _raw: raw };
        })
        .filter((x) => !!x.url);

      if (normalized.length === 0 && g.length > 0) {
        console.log("Gallery raw items:", g);
        console.log("Asset base:", getAssetBase());
      }

      setGallery(normalized);

      const info = rRes?.data || {};
      const total = Number(info.total);
      const average = Number(info.average);

      setRatingInfo({
        total: Number.isFinite(total) ? total : 0,
        average: Number.isFinite(average) ? average : 0,
      });
    } catch (e) {
      console.error(e);
      setErr("Не успях да заредя профила на майстора.");
      setWorker(null);
      setGallery([]);
      setRatingInfo({ total: 0, average: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function assign() {
    try {
      if (!requestId) return alert("Липсва requestId в URL.");
      if (!userId) return alert("Липсва userId в URL.");

      await apiPost(`/requests/${requestId}/assign`, { workerUserId: userId });

      alert(`Назначен майстор за заявка #${requestId} (workerUserId=${userId})`);
      window.location.href = "/client/profile";
    } catch (e) {
      console.error(e?.response?.data || e);
      alert(
        e?.response?.data?.message ||
          "Грешка при назначаване. Провери дали си логнат като client и дали майсторът е кандидатствал."
      );
    }
  }

  function cancel() {
    window.location.href = "/client/profile";
  }

  const avatarSrc = useMemo(() => {
    const url = worker?.avatarUrl ? absUrl(worker.avatarUrl) : "";
    return url || "/media_files/Snejan.jpg";
  }, [worker]);

  const avgText = useMemo(() => {
    const v = Number(ratingInfo.average);
    return Number.isFinite(v) ? v.toFixed(1) : "0.0";
  }, [ratingInfo.average]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Зареждане...
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-xl w-full text-center">
          <div className="text-red-400 font-bold">{err}</div>
          <button
            className="mt-6 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
            onClick={() => (window.location.href = "/client/profile")}
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Няма данни.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-20 px-6">
      {/* ✅ modal */}
      <GalleryModal
        open={galleryOpen}
        images={gallery}
        startIndex={startIndex}
        onClose={() => setGalleryOpen(false)}
      />

      <div className="max-w-5xl mx-auto bg-white text-black rounded-3xl shadow-xl p-10">
        <div className="flex flex-col items-center">
          <img
            src={avatarSrc}
            className="w-40 h-40 rounded-full object-cover border-4 border-red-500"
            alt="avatar"
          />

          <h2 className="text-3xl font-extrabold mt-6">{worker.skills?.[0] || "Специалност"}</h2>
          <div className="text-gray-600 mt-1">Майстор</div>

          <div className="mt-4 bg-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3">
            <StarsRow value={ratingInfo.average} />
            <div className="text-sm text-gray-700">
              <b>{avgText}</b>/5 • <b>{ratingInfo.total}</b> отзива
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <div className="bg-red-500 text-white p-6 rounded-2xl">
            <div className="text-xl font-bold">{worker.fullName || worker.name || `userId=${userId}`}</div>

            <div className="mt-3">
              <b>Град:</b> {worker.city || "—"}
            </div>
            <div className="mt-2">
              <b>Телефон:</b> {worker.phone || "—"}
            </div>

            <div className="mt-4 opacity-95">
              <b>Описание:</b> {worker.description || "—"}
            </div>
            <div className="mt-4 opacity-95">
              <b>Опит:</b> {worker.experience || "—"}
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-2xl">
            <div className="text-xl font-bold text-red-600 text-center mb-3">Снимки от обекти</div>

            {gallery.length === 0 ? (
              <div className="text-gray-500 text-center">(MVP) Няма качени снимки или URL-ите са грешни.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.slice(0, 6).map((img, idx) => (
                    <button
                      key={img.id || img.url}
                      className="block rounded-xl overflow-hidden border border-gray-200 bg-white"
                      title="Отвори"
                      onClick={() => {
                        setStartIndex(idx);
                        setGalleryOpen(true);
                      }}
                    >
                      <img
                        src={img.url}
                        alt="gallery"
                        className="w-full h-28 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.log("IMG ERROR:", img._raw, "->", img.url);
                          e.currentTarget.style.opacity = "0.3";
                        }}
                      />
                    </button>
                  ))}
                </div>

                {gallery.length > 6 && (
                  <div className="text-center mt-3">
                    <button
                      onClick={() => {
                        setStartIndex(0);
                        setGalleryOpen(true);
                      }}
                      className="text-sm font-bold text-gray-600 hover:text-gray-900 underline"
                    >
                      + още {gallery.length - 6} снимки
                    </button>
                  </div>
                )}
              </>
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

          <button
            onClick={cancel}
            className="md:w-56 bg-gray-200 hover:bg-gray-300 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <XCircle size={20} />
            Откажи
          </button>

          <button
            onClick={assign}
            className="md:w-56 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Избери
          </button>
        </div>

        <div className="mt-6 text-center text-gray-400 text-sm">
          Preview режим: клиентът разглежда профил и избира майстор за заявката.
        </div>
      </div>
    </div>
  );
}

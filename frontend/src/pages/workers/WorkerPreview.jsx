// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PhoneCall, CheckCircle, XCircle, Star } from "lucide-react";
import { apiGet, apiPost } from "../../services/api";
import { mediaUrl, photoMediaUrl } from "../../utils/mediaUrls";

function StarsRow({ value = 0 }) {
  const v = Number(value);
  const safe = Number.isFinite(v) ? v : 0;

  // simple MVP visual: round average to nearest star
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

export default function WorkerPreview() {
  const params = useParams();
  const [sp] = useSearchParams();
  const requestId = Number(sp.get("requestId") || 0);
  const userId = Number(params.id || params.userId || sp.get("userId") || 0);

  const [worker, setWorker] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [ratingInfo, setRatingInfo] = useState({ total: 0, average: 0 });
  const [albumViewer, setAlbumViewer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
        setCompletedJobs([]);
        setRatingInfo({ total: 0, average: 0 });
        return;
      }

      const [wRes, gRes, hRes, rRes] = await Promise.all([
        apiGet(`/workers/${userId}`),
        apiGet(`/workers/${userId}/gallery`).catch(() => ({ data: [] })),
        apiGet(`/workers/${userId}/history`).catch(() => ({ data: [] })),
        apiGet(`/reviews/worker/${userId}`).catch(() => ({ data: { total: 0, average: 0 } })),
      ]);

      setWorker(wRes.data || null);

      const g = Array.isArray(gRes.data) ? gRes.data : [];
      setGallery(
        g
          .map((x) => ({
            ...x,
            url: photoMediaUrl(x),
          }))
          .filter((x) => !!x.url)
      );

      setCompletedJobs(Array.isArray(hRes.data) ? hRes.data : []);

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
      setCompletedJobs([]);
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
    const url = worker?.avatarUrl ? mediaUrl(worker.avatarUrl) : "";
    return url || "/media_files/Snejan.jpg";
  }, [worker]);

  const avgText = useMemo(() => {
    const v = Number(ratingInfo.average);
    return Number.isFinite(v) ? v.toFixed(1) : "0.0";
  }, [ratingInfo.average]);

  const workerAlbums = useMemo(() => {
    const cleanPhotos = (items = []) =>
      (Array.isArray(items) ? items : [])
        .map((photo) => ({
          ...(typeof photo === "object" && photo ? photo : {}),
          url: photoMediaUrl(photo),
        }))
        .filter((photo) => !!photo.url);

    const jobAlbums = (Array.isArray(completedJobs) ? completedJobs : [])
      .map((job) => {
        const before = cleanPhotos(job.beforePhotos || job.photos);
        const after = cleanPhotos(job.afterPhotos);
        const photos = [...after, ...before];
        const id = job.requestId || job.id;

        return {
          id: `job-${id}`,
          type: "job",
          title: job.category || "Ремонт",
          subtitle: job.address || "Завършен обект през Bricky",
          meta: `${job.durationDays || 1} дни`,
          date: job.completedAt || job.created_at || job.createdAt,
          photos,
          cover: photos[0],
        };
      })
      .filter((album) => album.photos.length > 0);

    if (jobAlbums.length > 0) return jobAlbums;

    const loosePhotos = cleanPhotos(gallery);
    return loosePhotos.length
      ? [
          {
            id: "portfolio",
            type: "manual",
            title: "Портфолио снимки",
            subtitle: "Качени снимки от обекти",
            meta: `${loosePhotos.length} снимки`,
            date: loosePhotos[0]?.created_at || loosePhotos[0]?.createdAt,
            photos: loosePhotos,
            cover: loosePhotos[0],
          },
        ]
      : [];
  }, [completedJobs, gallery]);

  const activeAlbum =
    albumViewer && workerAlbums[albumViewer.albumIndex] ? workerAlbums[albumViewer.albumIndex] : null;
  const activePhoto =
    activeAlbum && activeAlbum.photos[albumViewer?.photoIndex || 0]
      ? activeAlbum.photos[albumViewer?.photoIndex || 0]
      : null;

  function openAlbum(albumIndex, photoIndex = 0) {
    setAlbumViewer({ albumIndex, photoIndex });
  }

  function closeAlbum() {
    setAlbumViewer(null);
  }

  function stepAlbumPhoto(delta) {
    setAlbumViewer((viewer) => {
      if (!viewer) return viewer;
      const album = workerAlbums[viewer.albumIndex];
      if (!album?.photos?.length) return viewer;
      return {
        ...viewer,
        photoIndex: (viewer.photoIndex + delta + album.photos.length) % album.photos.length,
      };
    });
  }

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
      <div className="max-w-5xl mx-auto bg-white text-black rounded-3xl shadow-xl p-10">
        <div className="flex flex-col items-center">
          <img
            src={avatarSrc}
            className="w-40 h-40 rounded-full object-cover border-4 border-red-500"
            alt="avatar"
            onError={(e) => {
              e.currentTarget.src = "/media_files/Snejan.jpg";
            }}
          />

          <h2 className="text-3xl font-extrabold mt-6">{worker.skills?.[0] || "Специалност"}</h2>
          <div className="text-gray-600 mt-1">Майстор</div>

          {/* ✅ RATING */}
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
            <div className="text-xl font-bold text-red-600 mb-3">Реални обекти през Bricky</div>

            {workerAlbums.length === 0 ? (
              <div className="text-gray-500">(MVP) Няма качени обекти.</div>
            ) : (
              <div className="space-y-3">
                {workerAlbums.map((album, albumIndex) => (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => openAlbum(albumIndex)}
                    className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-red-300 hover:shadow-md transition"
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-green-700">Завършен обект</div>
                        <div className="mt-1 text-lg font-extrabold text-gray-950">{album.title}</div>
                        <div className="mt-1 text-sm text-gray-600 line-clamp-1">{album.subtitle}</div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-gray-100 px-2 py-1 font-bold">{album.meta}</span>
                          <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-1 font-bold">{album.photos.length} снимки</span>
                        </div>
                        <div className="mt-3 text-sm font-bold text-red-600">Разгледай обекта →</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 w-36 h-24 shrink-0">
                        <div className="overflow-hidden rounded-lg bg-gray-200">
                          <img
                            src={album.cover.url}
                            alt={album.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                        <div className="relative overflow-hidden rounded-lg bg-gray-200">
                          <img
                            src={(album.photos[1] || album.cover).url}
                            alt={album.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          {album.photos.length > 2 && (
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white font-extrabold">
                              +{album.photos.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
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

      {activeAlbum && activePhoto && (
        <div className="fixed inset-0 z-[80] bg-black/85 px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-5xl">
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div>
                <div className="font-bold">{activeAlbum.title}</div>
                <div className="text-sm text-gray-300">
                  {(albumViewer?.photoIndex || 0) + 1} / {activeAlbum.photos.length} • {activeAlbum.subtitle}
                </div>
              </div>
              <button type="button" onClick={closeAlbum} className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 font-bold">
                Затвори
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
              <img
                src={activePhoto.url}
                alt={activePhoto.name || activeAlbum.title}
                className="max-h-[72vh] w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              {activeAlbum.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => stepAlbumPhoto(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-black px-4 py-3 text-2xl font-bold"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => stepAlbumPhoto(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-black px-4 py-3 text-2xl font-bold"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {activeAlbum.photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {activeAlbum.photos.map((photo, idx) => (
                  <button
                    key={photo.id || photo.url || idx}
                    type="button"
                    onClick={() => setAlbumViewer((viewer) => ({ ...viewer, photoIndex: idx }))}
                    className={
                      idx === albumViewer.photoIndex
                        ? "h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-red-500"
                        : "h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-700 opacity-70 hover:opacity-100"
                    }
                  >
                    <img
                      src={photo.url}
                      alt={photo.name || activeAlbum.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

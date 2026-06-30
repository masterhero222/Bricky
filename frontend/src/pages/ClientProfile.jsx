// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../services/api";
import { REPAIR_CATEGORIES } from "../constants/repairCatalog";
import LogoutButton from "../components/LogoutButton";
import { photoMediaUrl } from "../utils/mediaUrls";
import { cleanRequestDescription, formatRequestExpectedRange } from "../utils/requestPresentation";
import { RequestFlow } from "./Requests";
import {
  CalendarDays,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Tag,
  Users,
} from "lucide-react";
import RequestInfoRow from "../components/requests/RequestInfoRow";
import RequestPhotoCarousel from "../components/requests/RequestPhotoCarousel";

function formatBG(dateStr) {
  try {
    return new Date(dateStr).toLocaleString("bg-BG");
  } catch {
    return dateStr || "—";
  }
}

const CATEGORIES = REPAIR_CATEGORIES;

function uniqNums(arr) {
  const out = [];
  const set = new Set();
  (Array.isArray(arr) ? arr : []).forEach((x) => {
    const n = Number(x);
    if (Number.isFinite(n) && n > 0 && !set.has(n)) {
      set.add(n);
      out.push(n);
    }
  });
  return out;
}

function imageFileToDataUrl(file, maxSize = 520, quality = 0.58) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
      canvas.height = Math.max(1, Math.round((img.height || 1) * scale));

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Cannot read image"));
    };

    img.src = objectUrl;
  });
}

function filesToPhotos(files) {
  const images = Array.from(files || []).filter((file) => String(file.type || "").startsWith("image/"));
  return Promise.all(
    images.map(async (file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      url: await imageFileToDataUrl(file),
    }))
  );
}

function photoUrl(photo) {
  return photoMediaUrl(photo);
}

function safeRatingValue(x) {
  const n = Number(x);
  if (Number.isFinite(n) && n >= 1 && n <= 5) return n;
  return 5;
}

export default function ClientProfile() {
  const [activeTab, setActiveTab] = useState("requests");

  const [client, setClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // keyed by worker.userId (users.id)
  const [workersMap, setWorkersMap] = useState({});

  const [newReq, setNewReq] = useState({
    clientName: "",
    phone: "",
    email: "",
    address: "",
    category: "ВиК ремонти",
    description: "",
    photos: [],
    latitude: null,
    longitude: null,
    locationSource: "manual",
  });

  const [createError, setCreateError] = useState("");
  const [createOk, setCreateOk] = useState("");
  const [locationStatus, setLocationStatus] = useState("manual");
  const [locationMessage, setLocationMessage] = useState("Можеш да позволиш локация или да въведеш точния адрес ръчно.");
  const [actionMsg, setActionMsg] = useState("");
  const [assigningKey, setAssigningKey] = useState("");

  // ✅ reviews state (real, not session-fantasy)
  const [reviewDraft, setReviewDraft] = useState({}); // { [requestId]: { rating, comment } }
  const [reviewMsg, setReviewMsg] = useState({}); // { [requestId]: string }
  const [reviewSaving, setReviewSaving] = useState({}); // { [requestId]: boolean }
  const [myReviews, setMyReviews] = useState([]); // array
  const [reviewMap, setReviewMap] = useState({}); // { [requestId]: review }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setCreateError("");
    setCreateOk("");
    setActionMsg("");
    try {
      // optional client profile endpoint
      try {
        const clientRes = await apiGet("/client/me");
        setClient(clientRes.data || {});
        setNewReq((p) => ({
          ...p,
          clientName: clientRes.data?.name || p.clientName,
          email: clientRes.data?.email || p.email,
          phone: clientRes.data?.phone || p.phone,
          address: clientRes.data?.address || p.address,
        }));
      } catch {
        // ok - no endpoint
      }

      const reqRes = await apiGet("/requests/client");
      const reqs = Array.isArray(reqRes.data) ? reqRes.data : [];
      setRequests(reqs);

      // ✅ (optional) load my reviews so UI knows "already rated"
      // If endpoint missing, UI still works (backend prevents duplicates).
      try {
        const revRes = await apiGet("/reviews/client");
        const items = Array.isArray(revRes.data) ? revRes.data : [];
        setMyReviews(items);

        const map = {};
        items.forEach((x) => {
          if (x?.requestId) map[Number(x.requestId)] = x;
        });
        setReviewMap(map);
      } catch (e) {
        console.log("GET /reviews/client not available (ok for MVP):", e);
        setMyReviews([]);
        setReviewMap({});
      }

      await hydrateWorkers(reqs);

      // ✅ ensure drafts exist for completed + assigned requests
      setReviewDraft((prev) => {
        const next = { ...prev };
        reqs.forEach((r) => {
          const isCompleted = String(r.status || "").toLowerCase() === "завършена";
          const assignedUserId = Number(r.assignedWorkerId || 0) || null;
          if (!isCompleted || !assignedUserId) return;

          if (!next[r.id]) {
            next[r.id] = { rating: 5, comment: "" };
          } else {
            // normalize rating if some weird value got in
            next[r.id] = {
              rating: safeRatingValue(next[r.id]?.rating),
              comment: next[r.id]?.comment ?? "",
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error("LOAD ERROR:", err);
      setActionMsg("Грешка при зареждане. Виж конзолата.");
    } finally {
      setLoading(false);
    }
  }

  async function hydrateWorkers(reqs) {
    const needed = new Set();

    reqs.forEach((r) => {
      uniqNums(r.appliedWorkers || []).forEach((n) => needed.add(n));
      const assigned = Number(r.assignedWorkerId);
      if (Number.isFinite(assigned) && assigned > 0) needed.add(assigned);
    });

    const ids = Array.from(needed);
    if (ids.length === 0) return;

    // 1) try POST /workers/by-user-ids (if you implement it)
    try {
      const res = await apiPost("/workers/by-user-ids", { ids });
      const workers = Array.isArray(res.data) ? res.data : [];
      const map = {};
      workers.forEach((w) => {
        if (w?.userId) map[Number(w.userId)] = w;
      });
      setWorkersMap((prev) => ({ ...prev, ...map }));
      return;
    } catch {
      // ignore, fallback below
    }

    // 2) fallback: GET /workers and match by userId
    try {
      const allRes = await apiGet("/workers");
      const allWorkers = Array.isArray(allRes.data) ? allRes.data : [];
      const map = {};
      allWorkers.forEach((w) => {
        if (w?.userId) {
          const uid = Number(w.userId);
          if (ids.includes(uid)) map[uid] = w;
        }
      });
      setWorkersMap((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.log("hydrateWorkers fallback failed:", e);
    }
  }

  async function handleRequestPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const photos = await filesToPhotos(files);
      setNewReq((p) => ({ ...p, photos: [...(p.photos || []), ...photos] }));
    } catch (err) {
      console.error(err);
      setCreateError("Не успях да прочета избраните снимки.");
    } finally {
      e.target.value = "";
    }
  }

  function removeRequestPhoto(photoId) {
    setNewReq((p) => ({
      ...p,
      photos: (p.photos || []).filter((photo) => String(photo.id) !== String(photoId)),
    }));
  }

  function requestCurrentLocation() {
    setCreateError("");

    if (!navigator.geolocation) {
      setLocationStatus("denied");
      setLocationMessage("Браузърът не поддържа автоматична локация. Въведи точния адрес ръчно.");
      setNewReq((p) => ({ ...p, latitude: null, longitude: null, locationSource: "manual" }));
      return;
    }

    setLocationStatus("loading");
    setLocationMessage("Питам браузъра за достъп до локацията...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setNewReq((p) => ({
          ...p,
          latitude,
          longitude,
          locationSource: "gps",
        }));
        setLocationStatus("granted");
        setLocationMessage(`Локацията е добавена към заявката: ${latitude}, ${longitude}.`);
      },
      (err) => {
        console.warn("Geolocation denied/unavailable:", err);
        setLocationStatus("denied");
        setLocationMessage("Локацията е отказана или недостъпна. Въведи точния адрес ръчно, за да сложим заявката на картата.");
        setNewReq((p) => ({ ...p, latitude: null, longitude: null, locationSource: "manual" }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function createRequest() {
    setCreateError("");
    setCreateOk("");
    try {
      if (!String(newReq.address || "").trim() && !newReq.latitude && !newReq.longitude) {
        setCreateError("Добави текуща локация или въведи точен адрес за заявката.");
        return;
      }

      const res = await apiPost("/requests", {
        clientName: newReq.clientName,
        email: newReq.email,
        phone: newReq.phone,
        address: newReq.address,
        category: newReq.category,
        description: newReq.description,
        photos: newReq.photos || [],
        latitude: newReq.latitude,
        longitude: newReq.longitude,
        locationSource: newReq.locationSource || "manual",
      });

      setCreateOk(`Заявката е създадена! (#${res.data?.id ?? "?"})`);
      setNewReq((p) => ({ ...p, description: "", photos: [], latitude: null, longitude: null, locationSource: "manual" }));
      setLocationStatus("manual");
      setLocationMessage("Можеш да позволиш локация или да въведеш точния адрес ръчно.");
      setActiveTab("requests");
      await loadData();
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 401) setCreateError("401: Нямаш валиден токен.");
      else if (status === 403) setCreateError("403: Нямаш права (role).");
      else setCreateError(err?.response?.data?.message || "Не успях да създам заявка.");
    }
  }

  async function chooseWorker(requestId, workerUserId) {
    const key = `${requestId}:${workerUserId}`;
    try {
      setAssigningKey(key);
      setActionMsg("");

      await apiPost(`/requests/${requestId}/assign`, { workerUserId });

      setActionMsg(`Назначен майстор (userId=${workerUserId}) за заявка #${requestId}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 401) setActionMsg("401: Нямаш токен (логни се пак).");
      else if (status === 403) setActionMsg("403: Нямаш права (трябва client).");
      else setActionMsg(err?.response?.data?.message || "Грешка при назначаване.");
    } finally {
      setAssigningKey("");
    }
  }

  // ✅ Create review (request must be completed; backend checks ownership + status + duplicates)
  async function submitReview(requestId) {
    try {
      setReviewMsg((p) => ({ ...p, [requestId]: "" }));
      setReviewSaving((p) => ({ ...p, [requestId]: true }));

      const draft = reviewDraft[requestId] || {};
      const rating = safeRatingValue(draft.rating);

      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        setReviewMsg((p) => ({ ...p, [requestId]: "Избери рейтинг 1 до 5." }));
        return;
      }

      await apiPost("/reviews", {
        requestId,
        rating,
        comment: (draft.comment || "").trim(),
      });

      setReviewMsg((p) => ({ ...p, [requestId]: "Отзивът е записан ✅" }));
      await loadData(); // ✅ refresh reviewMap so UI flips to "Оценено"
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 401) setReviewMsg((p) => ({ ...p, [requestId]: "401: логни се пак." }));
      else if (status === 403) setReviewMsg((p) => ({ ...p, [requestId]: "403: трябва client." }));
      else {
        setReviewMsg((p) => ({
          ...p,
          [requestId]: err?.response?.data?.message || "Грешка при изпращане на отзив.",
        }));
      }
    } finally {
      setReviewSaving((p) => ({ ...p, [requestId]: false }));
    }
  }

  const requestsSorted = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [requests]);

  if (loading) {
    return <div className="text-white text-center pt-32">Зареждане...</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-78px)] text-white">
      <aside className="fixed bottom-0 top-[78px] z-30 hidden w-64 border-r border-slate-400/15 bg-[#0d1728]/92 pt-12 backdrop-blur-xl lg:block">
        <nav className="flex flex-col gap-2 px-5 text-sm">
          {[
            ["requests", "Моите заявки"],
            ["create", "Направи заявка"],
            ["profile", "Профил"],
            ["settings", "Настройки"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-xl px-4 py-3 text-left font-bold transition ${activeTab === key ? "border border-green-400/20 bg-green-400/10 text-green-300" : "text-slate-300 hover:bg-slate-400/10 hover:text-white"}`}
            >
              {label}
            </button>
          ))}

          <div className="mt-4">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-20 pt-12 sm:px-7 lg:ml-64 lg:px-10">
        <div className="mb-8 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
          {[["requests", "Моите заявки"], ["create", "Направи заявка"], ["profile", "Профил"], ["settings", "Настройки"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold ${activeTab === key ? "bg-green-500/15 text-green-300" : "bg-slate-800/70 text-slate-300"}`}>{label}</button>
          ))}
        </div>
        {activeTab === "requests" && (
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <h1 className="text-3xl font-extrabold sm:text-4xl">Моите заявки</h1>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab("create")}
                  className="bricky-button-primary"
                >
                  <Plus size={20} /> Направи заявка
                </button>

                <button
                  onClick={loadData}
                  className="bricky-button-secondary"
                >
                  <RefreshCw size={19} /> Обнови
                </button>
              </div>
            </div>

            {actionMsg && <div className="mb-4 text-yellow-300 font-bold">{actionMsg}</div>}

            {requestsSorted.length === 0 ? (
              <p className="text-gray-400">Нямате заявки.</p>
            ) : (
              <div className="space-y-6">
                {requestsSorted.map((r) => {
                  const appliedList = uniqNums(r.appliedWorkers || []);
                  const assignedUserId = Number(r.assignedWorkerId || 0) || null;

                  const isCompleted = String(r.status || "").toLowerCase() === "завършена";
                  const reviewedItem = reviewMap?.[Number(r.id)] || null;
                  const alreadyReviewed = !!reviewedItem;
                  const showReviewForm = isCompleted && assignedUserId && !alreadyReviewed;

                  const draft = reviewDraft[r.id] || { rating: 5, comment: "" };
                  const ratingValue = safeRatingValue(draft.rating);
                  const msg = reviewMsg[r.id] || "";
                  const saving = !!reviewSaving[r.id];

                  return (
                    <div key={r.id} className="bricky-card overflow-hidden rounded-[20px] p-5 sm:p-8">
                      <div className="flex flex-col justify-between gap-6 border-b border-slate-400/15 pb-7 md:flex-row md:items-start">
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="grid h-14 min-w-16 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/15 px-4 text-xl font-extrabold text-blue-100">#{r.id}</span>
                          <div className="min-w-0">
                            <h2 className="text-xl font-extrabold leading-tight text-slate-50 sm:text-2xl">{r.category}</h2>
                            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><CalendarDays size={17} /> Създадена: {formatBG(r.created_at)}</p>
                          </div>
                        </div>

                        <div className="md:text-right">
                          <div className="flex items-center gap-3 md:justify-end">
                            <span className="text-sm text-slate-400">Статус:</span>
                            <span className={`inline-flex min-h-9 items-center rounded-xl border px-4 text-sm font-extrabold ${isCompleted ? "border-green-400/20 bg-green-400/10 text-green-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"}`}>{r.status}</span>
                          </div>
                          <div className="mt-3 text-sm text-slate-400">
                            {assignedUserId ? <><span>Избран майстор: </span><span className="font-bold text-green-300">{workersMap[assignedUserId]?.fullName || `userId ${assignedUserId}`}</span></> : "Няма избран майстор"}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-8 py-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
                        <div className="space-y-4 xl:border-r xl:border-slate-400/15 xl:pr-8">
                          <RequestInfoRow icon={<MapPin size={19} />} label="Адрес:" value={r.address || "—"} />
                          <RequestInfoRow icon={<FileText size={19} />} label="Описание:" value={<span className="whitespace-pre-line">{cleanRequestDescription(r.description) || "—"}</span>} />
                          {formatRequestExpectedRange(r) && <RequestInfoRow icon={<Tag size={19} />} label="Ориентировъчна цена:" value={formatRequestExpectedRange(r)} accent />}
                        </div>

                        <div className="min-w-0">
                          <div className="mb-4 flex items-center gap-2 font-extrabold text-slate-100"><FileText size={19} className="text-slate-400" /> Снимки към заявката</div>
                          <RequestPhotoCarousel photos={r.photos || []} getUrl={photoUrl} />
                        </div>
                      </div>

                      {/* ✅ REVIEW SECTION */}
                      {isCompleted && assignedUserId && (
                        <div className="mt-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
                          <h3 className="font-bold text-lg">Отзив за майстора</h3>

                          {alreadyReviewed ? (
                            <div className="mt-2">
                              <div className="text-green-400 font-bold">
                                Оценено ✅ ({reviewedItem?.rating ?? "?"}/5)
                              </div>
                              {reviewedItem?.comment ? (
                                <div className="text-gray-300 mt-2">
                                  <strong>Коментар:</strong> {reviewedItem.comment}
                                </div>
                              ) : (
                                <div className="text-gray-400 mt-2">(без коментар)</div>
                              )}
                            </div>
                          ) : showReviewForm ? (
                            <>
                              <div className="mt-3 grid md:grid-cols-2 gap-3">
                                <select
                                  value={ratingValue}
                                  onChange={(e) =>
                                    setReviewDraft((p) => ({
                                      ...p,
                                      [r.id]: { ...(p[r.id] || {}), rating: Number(e.target.value) },
                                    }))
                                  }
                                  className="p-3 rounded bg-gray-800 border border-gray-700 w-full"
                                >
                                  {[5, 4, 3, 2, 1].map((n) => (
                                    <option key={n} value={n}>
                                      {n} ⭐
                                    </option>
                                  ))}
                                </select>

                                <button
                                  disabled={saving}
                                  onClick={() => submitReview(r.id)}
                                  className={
                                    saving
                                      ? "bg-gray-700 px-5 py-3 rounded-lg font-bold cursor-not-allowed"
                                      : "bg-green-600 hover:bg-green-700 px-5 py-3 rounded-lg font-bold"
                                  }
                                >
                                  {saving ? "Изпращам..." : "Изпрати отзив"}
                                </button>
                              </div>

                              <textarea
                                value={draft.comment || ""}
                                onChange={(e) =>
                                  setReviewDraft((p) => ({
                                    ...p,
                                    [r.id]: { ...(p[r.id] || {}), comment: e.target.value },
                                  }))
                                }
                                className="mt-3 p-3 rounded bg-gray-800 border border-gray-700 w-full h-24"
                                placeholder="Коментар (по желание)"
                              />

                              {msg && <div className="mt-2 text-yellow-300 font-bold">{msg}</div>}
                            </>
                          ) : (
                            <div className="text-gray-400 mt-2">Няма какво да оценяваш тук.</div>
                          )}
                        </div>
                      )}

                      <div className="mt-2 rounded-2xl border border-slate-400/15 bg-slate-950/25 p-5 sm:p-6">
                        <h3 className="flex items-center gap-3 text-lg font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-blue-300"><Users size={20} /></span>Кандидати ({appliedList.length})</h3>

                        {appliedList.length === 0 ? (
                          <p className="ml-[52px] mt-1 text-slate-400">Още няма кандидатствали майстори.</p>
                        ) : (
                          <div className="mt-3 grid md:grid-cols-2 gap-3">
                            {appliedList.map((workerUserId, idx) => {
                              const w = workersMap[workerUserId];
                              const key = `${r.id}:${workerUserId}`;
                              const isAssigned = assignedUserId === workerUserId;

                              return (
                                <div
                                  key={`${r.id}-${workerUserId}-${idx}`}
                                  className="rounded-xl border border-slate-400/15 bg-slate-800/50 p-4"
                                >
                                  <div className="font-bold">
                                    {w?.fullName ? w.fullName : `Майстор (userId=${workerUserId})`}
                                  </div>

                                  {w ? (
                                    <div className="text-sm text-gray-300 mt-2 space-y-1">
                                      <div>
                                        <strong>Град:</strong> {w.city || "—"}
                                      </div>
                                      <div>
                                        <strong>Телефон:</strong> {w.phone || "—"}
                                      </div>
                                      <div>
                                        <strong>Описание:</strong> {w.description || "—"}
                                      </div>

                                      <div className="text-xs text-gray-400 mt-2">
                                        (worker.userId={w.userId ?? "?"})
                                      </div>

                                      <div className="flex gap-2 mt-3">
                                        <a
                                          href={`/worker-preview?requestId=${r.id}&userId=${workerUserId}`}
                                          className="inline-block bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded font-bold"
                                        >
                                          Виж профил
                                        </a>

                                        {!assignedUserId && (
                                          <button
                                            onClick={() => chooseWorker(r.id, workerUserId)}
                                            disabled={assigningKey === key}
                                            className={
                                              assigningKey === key
                                                ? "bg-gray-700 px-3 py-2 rounded font-bold cursor-not-allowed"
                                                : "bg-green-600 hover:bg-green-700 px-3 py-2 rounded font-bold"
                                            }
                                          >
                                            {assigningKey === key ? "Назначавам..." : "Избери"}
                                          </button>
                                        )}

                                        {isAssigned && (
                                          <span className="text-green-400 font-bold self-center">Назначен</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-400 mt-2">
                                      Нямаме данни за този майстор (още). Ако /workers връща профили, hydrate ще го напълни.
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "create" && (
          <div className="max-w-6xl mx-auto">
            <RequestFlow embedded onCreated={() => {
              setActiveTab("requests");
              loadData();
            }} />
          </div>
        )}

        {activeTab === "profile" && (
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 text-3xl font-extrabold">Моят профил</h1>
            <div className="bricky-card grid gap-5 rounded-[20px] p-6 md:grid-cols-2 md:p-8">
              <ProfileField label="Име" value={client.name || newReq.clientName || "Не е добавено"} />
              <ProfileField label="Телефон" value={client.phone || newReq.phone || "Не е добавен"} />
              <ProfileField label="Имейл" value={client.email || newReq.email || "Не е добавен"} />
              <ProfileField label="Основен адрес" value={client.address || newReq.address || "Не е добавен"} />
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-3 text-3xl font-extrabold">Настройки</h1>
            <p className="mb-8 text-slate-400">Управлявай профила, адресите, известията и сигурността си.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <SettingsCard title="Профил" text="Име, телефон и имейл за връзка." />
              <SettingsCard title="Адреси" text="Запазени адреси и бележки за достъп." />
              <SettingsCard title="Известия" text="Оферти, съобщения и промени по заявките." />
              <SettingsCard title="Предпочитания за контакт" text="Чат, имейл и удобно време за връзка." />
              <SettingsCard title="Сигурност" text="Парола и управление на активните устройства." />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ProfileField({ label, value }) {
  return <div className="rounded-xl border border-slate-400/15 bg-slate-950/25 p-5"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-2 font-semibold text-slate-100">{value}</div></div>;
}

function SettingsCard({ title, text }) {
  return <button type="button" className="bricky-card rounded-2xl p-6 text-left transition hover:-translate-y-0.5 hover:border-slate-300/30"><div className="text-lg font-extrabold text-slate-100">{title}</div><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></button>;
}

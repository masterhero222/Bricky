// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { apiGet, apiPost } from "../../services/api";
import LogoutButton from "../../components/LogoutButton";

const PRICE_TABLE = {
  Баня: { material: 140 },
  "Шпакловка и боя": { material: 18 },
  Плочки: { material: 40 },
  ВиК: { material: 55 },
  Електро: { material: 35 },
};

function formatBG(dateStr) {
  try {
    return new Date(dateStr).toLocaleString("bg-BG");
  } catch {
    return dateStr || "—";
  }
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token") || "";
}

function absUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

function normalizeArr(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "string") {
    try {
      const parsed = JSON.parse(x);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return x
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export default function WorkerProfile() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [profile, setProfile] = useState({
    fullName: "",
    city: "",
    description: "",
    experience: "",
    equipment: "",
    avatar: null,
    avatarUrl: "",
  });

  // IMPORTANT: това е users.id на логнатия worker (userId)
  const [myUserId, setMyUserId] = useState(null);

  const [previewAvatar, setPreviewAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reqError, setReqError] = useState("");

  const [applyingId, setApplyingId] = useState(null);
  const [applyMsg, setApplyMsg] = useState("");

  // ✅ COMPLETE state
  const [completingId, setCompletingId] = useState(null);

  // ✅ REVIEWS state (worker rating)
  const [ratingInfo, setRatingInfo] = useState({ total: 0, average: 0, items: [] });
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const [calc, setCalc] = useState({
    type: "",
    area: "",
    laborPerM2: "",
    materials: 0,
    labor: 0,
    total: 0,
  });

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // =========================
  // ✅ GALLERY STATE
  // =========================
  const [gallery, setGallery] = useState([]); // [{ id, url, created_at }]
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [galleryMsg, setGalleryMsg] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]); // File[]
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadMeProfile();
    loadRequests();
    loadGallery();
  }, []);

  useEffect(() => {
    if (myUserId) loadMyReviews();
  }, [myUserId]);

  async function loadRequests() {
    try {
      setReqError("");
      setApplyMsg("");
      setLoadingRequests(true);

      const res = await apiGet("/requests/worker");
      const data = Array.isArray(res.data) ? res.data : [];
      setRequests(data);
    } catch (err) {
      console.error("Error loading requests:", err);
      setReqError("Грешка при зареждане на заявки.");
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadMyReviews() {
    try {
      setRatingError("");
      setRatingLoading(true);

      const res = await apiGet(`/reviews/worker/${myUserId}`);
      setRatingInfo(res.data || { total: 0, average: 0, items: [] });
    } catch (e) {
      console.error("loadMyReviews error:", e);
      setRatingError("Не успях да заредя рейтинга.");
      setRatingInfo({ total: 0, average: 0, items: [] });
    } finally {
      setRatingLoading(false);
    }
  }

  async function loadMeProfile() {
    try {
      const token = getToken();
      if (!token) return;

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/workers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const w = res.data || {};

      // ✅ myUserId е users.id, а /workers/me връща worker.userId (връзката към users)
      const uid = Number(w.userId || localStorage.getItem("userId") || 0) || null;
      setMyUserId(uid);

      setProfile((p) => ({
        ...p,
        fullName: w.fullName || "",
        city: w.city || "",
        description: w.description || "",
        experience: w.experience || "",
        equipment: w.equipment || "",
        avatarUrl: w.avatarUrl || "",
        avatar: null,
      }));

      if (w.avatarUrl) setPreviewAvatar(absUrl(w.avatarUrl));
    } catch (err) {
      console.error("Error loading worker profile:", err);
    }
  }

  function hasApplied(req) {
    const list = normalizeArr(req.appliedWorkers).map((x) => Number(x)).filter(Boolean);
    if (!myUserId) return false;
    return list.includes(Number(myUserId));
  }

  function isClosed(req) {
    const st = String(req.status || "").toLowerCase();
    return st.includes("завърш") || st.includes("отказ");
  }

  function isAssignedToMe(req) {
    if (!myUserId) return false;
    return Number(req?.assignedWorkerId) === Number(myUserId);
  }

  function canComplete(req) {
    const st = String(req.status || "").toLowerCase();
    return isAssignedToMe(req) && (st === "в процес" || st === "назначена");
  }

  async function completeRequest(requestId) {
    try {
      setApplyMsg("");
      setCompletingId(requestId);

      await apiPost(`/requests/${requestId}/complete`, {});

      setApplyMsg(`Заявка #${requestId} е затворена ✅`);
      await loadRequests();
    } catch (err) {
      console.error("completeRequest error:", err);
      const status = err?.response?.status;

      if (status === 401) setApplyMsg("401: Нямаш валиден токен. Логни се пак.");
      else if (status === 403) setApplyMsg("403: Нямаш права (трябва worker).");
      else setApplyMsg(err?.response?.data?.message || "Неуспешно затваряне. Виж конзолата.");
    } finally {
      setCompletingId(null);
    }
  }

  async function applyToRequest(requestId) {
    try {
      setApplyMsg("");
      setApplyingId(requestId);

      await apiPost(`/requests/${requestId}/apply`, {});

      setApplyMsg(`Кандидатства успешно по заявка #${requestId}.`);
      await loadRequests();
    } catch (err) {
      console.error("applyToRequest error:", err);
      const status = err?.response?.status;

      if (status === 401) setApplyMsg("401: Нямаш валиден токен. Логни се пак.");
      else if (status === 403) setApplyMsg("403: Нямаш права (role). Endpoint-ът е за worker.");
      else if (status === 404) setApplyMsg("404: Няма endpoint /requests/:id/apply (или не е деплойнат).");
      else setApplyMsg(err?.response?.data?.message || "Неуспешно кандидатстване. Виж конзолата.");
    } finally {
      setApplyingId(null);
    }
  }

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewAvatar(URL.createObjectURL(file));
    setProfile((p) => ({ ...p, avatar: file }));
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  async function uploadAvatarIfNeeded() {
    const token = getToken();
    if (!token) throw new Error("No token");
    if (!profile.avatar) return null;

    const fd = new FormData();
    fd.append("avatar", profile.avatar);

    const res = await axios.post(`${import.meta.env.VITE_API_URL}/workers/me/avatar`, fd, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    const updated = res.data || {};
    if (updated.avatarUrl) {
      setProfile((p) => ({ ...p, avatarUrl: updated.avatarUrl, avatar: null }));
      setPreviewAvatar(absUrl(updated.avatarUrl));
    } else {
      setProfile((p) => ({ ...p, avatar: null }));
    }

    return updated;
  }

  const saveProfile = async () => {
    try {
      setSaving(true);
      const token = getToken();
      if (!token) {
        alert("Няма токен. Логни се пак.");
        return;
      }

      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/workers/me`,
        {
          fullName: profile.fullName,
          city: profile.city,
          description: profile.description,
          experience: profile.experience,
          equipment: profile.equipment,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data || {};
      setProfile((p) => ({
        ...p,
        fullName: updated.fullName || p.fullName,
        city: updated.city || p.city,
        description: updated.description || p.description,
        experience: updated.experience || p.experience,
        equipment: updated.equipment || p.equipment,
        avatarUrl: updated.avatarUrl || p.avatarUrl,
      }));

      if (updated.avatarUrl && !profile.avatar) setPreviewAvatar(absUrl(updated.avatarUrl));
      if (profile.avatar) await uploadAvatarIfNeeded();

      alert("Профилът е обновен!");
    } catch (err) {
      console.error(err);
      alert("Грешка при запазването.");
    } finally {
      setSaving(false);
    }
  };

  const updateCalc = (field, value) => {
    const next = { ...calc, [field]: value };
    const areaNum = parseFloat(next.area) || 0;
    const laborNum = parseFloat(next.laborPerM2) || 0;
    const conf = PRICE_TABLE[next.type];

    if (!conf || !areaNum) {
      next.materials = 0;
      next.labor = 0;
      next.total = 0;
    } else {
      next.materials = Math.round(areaNum * conf.material);
      next.labor = Math.round(areaNum * laborNum);
      next.total = next.materials + next.labor;
    }

    setCalc(next);
  };

  // =========================
  // ✅ GALLERY FUNCTIONS
  // =========================
  async function loadGallery() {
    try {
      setGalleryError("");
      setGalleryMsg("");
      setGalleryLoading(true);

      const res = await apiGet("/workers/me/gallery");
      const data = Array.isArray(res.data) ? res.data : [];
      setGallery(
        data.map((x) => ({
          ...x,
          url: absUrl(x.url || x.imageUrl || x.path || ""),
        }))
      );
    } catch (err) {
      console.error("Error loading gallery:", err);
      setGalleryError("Грешка при зареждане на галерията.");
      setGallery([]);
    } finally {
      setGalleryLoading(false);
    }
  }

  function onPickGalleryFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const imgs = files.filter((f) => String(f.type || "").startsWith("image/"));
    setGalleryFiles(imgs);
  }

  async function uploadGallery() {
    try {
      setGalleryError("");
      setGalleryMsg("");

      if (!galleryFiles.length) {
        setGalleryMsg("Избери снимки първо.");
        return;
      }

      const token = getToken();
      if (!token) {
        setGalleryError("Няма токен. Логни се пак.");
        return;
      }

      setUploadingGallery(true);

      const fd = new FormData();
      galleryFiles.forEach((f) => fd.append("images", f));

      await axios.post(`${import.meta.env.VITE_API_URL}/workers/me/gallery`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setGalleryMsg("Снимките са качени.");
      setGalleryFiles([]);

      await loadGallery();
    } catch (err) {
      console.error("uploadGallery error:", err);
      const status = err?.response?.status;
      if (status === 401) setGalleryError("401: Нямаш валиден токен. Логни се пак.");
      else if (status === 403) setGalleryError("403: Нямаш права (role). Endpoint-ът е за worker.");
      else if (status === 404) setGalleryError("404: Няма endpoint /workers/me/gallery (или не е деплойнат).");
      else setGalleryError(err?.response?.data?.message || "Грешка при качване. Виж конзолата.");
    } finally {
      setUploadingGallery(false);
    }
  }

  async function deleteGalleryImage(imageId) {
    try {
      setGalleryError("");
      setGalleryMsg("");
      setDeletingId(imageId);

      await apiPost(`/workers/me/gallery/${imageId}/delete`, {});

      setGalleryMsg("Снимката е изтрита.");
      await loadGallery();
    } catch (err) {
      console.error("deleteGalleryImage error:", err);
      const status = err?.response?.status;
      if (status === 401) setGalleryError("401: Нямаш валиден токен. Логни се пак.");
      else if (status === 403) setGalleryError("403: Нямаш права (role).");
      else if (status === 404) setGalleryError("404: Няма endpoint за триене (или не е деплойнат).");
      else setGalleryError(err?.response?.data?.message || "Грешка при триене. Виж конзолата.");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    const total = requests.length;

    const byStatus = requests.reduce((acc, r) => {
      const s = (r.status || "—").toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const byCategory = requests.reduce((acc, r) => {
      const c = r.category || "—";
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});

    const newest = [...requests]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return { total, byStatus, byCategory, newest };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();

    return requests.filter((r) => {
      const catOk = categoryFilter === "all" ? true : r.category === categoryFilter;
      const st = (r.status || "").toLowerCase();
      const statusOk = statusFilter === "all" ? true : st === statusFilter;

      if (!catOk || !statusOk) return false;
      if (!q) return true;

      const hay = [r.clientName, r.phone, r.address, r.description, r.category, r.email, r.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [requests, query, categoryFilter, statusFilter]);

  const categories = useMemo(() => {
    const set = new Set(requests.map((r) => r.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [requests]);

  const statuses = useMemo(() => {
    const set = new Set(requests.map((r) => (r.status || "").toLowerCase()).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [requests]);

  const avatarSrc =
    previewAvatar || (profile.avatarUrl ? absUrl(profile.avatarUrl) : "") || "/media_files/Snejan.jpg";

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 pt-24 fixed h-full">
        <nav className="flex flex-col gap-4 px-6 text-sm">
          {[
            ["dashboard", "Контрол панел"],
            ["requests", "Заявки"],
            ["profile", "Профил"],
            ["gallery", "Галерия"],
            ["calculator", "Калкулатор"],
            ["settings", "Настройки"],
            ["subscription", "Абонамент"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={activeTab === key ? "text-red-400 font-bold" : "hover:text-red-300"}
            >
              {label}
            </button>
          ))}

          <div className="mt-6">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="flex-1 ml-64 pt-24 px-10 pb-20">
        {activeTab === "dashboard" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold">Контрол панел</h1>

              <button
                onClick={() => {
                  loadRequests();
                  loadMyReviews();
                }}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
              >
                Обнови
              </button>
            </div>

            {loadingRequests && <p className="text-gray-400">Зареждане на заявки...</p>}
            {reqError && <p className="text-red-400">{reqError}</p>}
            {applyMsg && <p className="text-yellow-300 mt-2">{applyMsg}</p>}

            <div className="grid md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <p className="text-gray-400 text-sm">Общо заявки</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <p className="text-gray-400 text-sm">Рейтинг</p>
                {ratingLoading ? (
                  <p className="text-gray-400 mt-2">Зареждане...</p>
                ) : ratingError ? (
                  <p className="text-red-400 mt-2">{ratingError}</p>
                ) : (
                  <div className="mt-2">
                    <div className="text-2xl font-bold">{ratingInfo.average} ⭐</div>
                    <div className="text-sm text-gray-400">{ratingInfo.total} отзива</div>
                  </div>
                )}
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <p className="text-gray-400 text-sm">По статус</p>
                <div className="mt-3 space-y-2 text-sm">
                  {Object.keys(stats.byStatus).length === 0 ? (
                    <p className="text-gray-500">—</p>
                  ) : (
                    Object.entries(stats.byStatus).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k}</span>
                        <span className="font-bold">{v}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <p className="text-gray-400 text-sm">По категория</p>
                <div className="mt-3 space-y-2 text-sm">
                  {Object.keys(stats.byCategory).length === 0 ? (
                    <p className="text-gray-500">—</p>
                  ) : (
                    Object.entries(stats.byCategory).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{k}</span>
                        <span className="font-bold">{v}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Последни заявки</h2>

              {stats.newest.length === 0 ? (
                <p className="text-gray-400">Няма заявки.</p>
              ) : (
                <div className="space-y-3">
                  {stats.newest.map((r) => {
                    const applied = hasApplied(r);
                    const closed = isClosed(r);
                    const hasAssigned = !!toNum(r.assignedWorkerId);
                    const assignedToMe = isAssignedToMe(r);

                    const disabledApply = applied || closed || hasAssigned || applyingId === r.id;
                    const showContact = assignedToMe;
                    const showComplete = canComplete(r);

                    return (
                      <div key={r.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-bold">
                            #{r.id} • {r.category} • {r.clientName}
                          </div>
                          <div className="text-sm text-red-400">{r.status}</div>
                        </div>

                        <div className="text-sm text-gray-400 mt-2">
                          {r.address || "—"} • {formatBG(r.created_at)}
                        </div>

                        {/* ✅ Когато е назначена на този майстор */}
                        {showContact && (
                          <div className="mt-3 bg-gray-800 border border-gray-700 rounded-xl p-3">
                            <div className="text-green-400 font-bold">Свържете се с клиента</div>
                            <div className="text-sm text-gray-200 mt-2">
                              <div>
                                <b>Име:</b> {r.clientName || "—"}
                              </div>
                              <div>
                                <b>Телефон:</b> {r.phone || "—"}
                              </div>
                              <div>
                                <b>Адрес:</b> {r.address || "—"}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-end gap-2">
                          {applied && <span className="text-green-400 text-sm font-bold">Кандидатствал</span>}

                          {hasAssigned && !assignedToMe && (
                            <span className="text-yellow-300 text-sm font-bold">Има избран майстор</span>
                          )}

                          {assignedToMe && (
                            <span className="text-green-400 text-sm font-bold">Назначен</span>
                          )}

                          {/* ✅ Complete button */}
                          {showComplete && (
                            <button
                              onClick={() => completeRequest(r.id)}
                              disabled={completingId === r.id}
                              className={
                                completingId === r.id
                                  ? "bg-gray-700 px-4 py-2 rounded-lg font-bold cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold"
                              }
                            >
                              {completingId === r.id ? "Затварям..." : "Затвори заявка"}
                            </button>
                          )}

                          {/* ✅ Apply button */}
                          <button
                            disabled={disabledApply || assignedToMe}
                            onClick={() => applyToRequest(r.id)}
                            className={
                              disabledApply || assignedToMe
                                ? "bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-bold cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-bold"
                            }
                          >
                            {assignedToMe
                              ? "Назначен"
                              : applied
                              ? "Кандидатствал"
                              : applyingId === r.id
                              ? "Кандидатствам..."
                              : "Кандидатствай"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold">Заявки</h1>
              <button
                onClick={loadRequests}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
              >
                Обнови
              </button>
            </div>

            {applyMsg && <div className="mb-3 text-yellow-300 font-bold">{applyMsg}</div>}

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 grid md:grid-cols-3 gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Търси по име, адрес, телефон..."
                className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "Всички категории" : c}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "Всички статуси" : s}
                  </option>
                ))}
              </select>
            </div>

            {loadingRequests ? (
              <p className="text-gray-400">Зареждане...</p>
            ) : reqError ? (
              <p className="text-red-400">{reqError}</p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-gray-400">Няма налични заявки.</p>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const applied = hasApplied(req);
                  const closed = isClosed(req);
                  const hasAssigned = !!toNum(req.assignedWorkerId);
                  const assignedToMe = isAssignedToMe(req);

                  const disabledApply = applied || closed || hasAssigned || applyingId === req.id;
                  const showContact = assignedToMe;
                  const showComplete = canComplete(req);

                  return (
                    <div key={req.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold">
                          #{req.id} • {req.category}
                        </h2>
                        <span className="text-red-400 font-bold">{req.status}</span>
                      </div>

                      <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                        <p className="text-gray-300">
                          <strong>Клиент:</strong> {req.clientName}
                        </p>
                        <p className="text-gray-300">
                          <strong>Телефон:</strong> {req.phone}
                        </p>
                        <p className="text-gray-300">
                          <strong>Имейл:</strong> {req.email}
                        </p>
                        <p className="text-gray-300">
                          <strong>Адрес:</strong> {req.address || "—"}
                        </p>
                      </div>

                      <p className="text-gray-400 mt-3">{req.description || "Няма описание."}</p>

                      <p className="text-gray-500 text-sm mt-3">Създадена: {formatBG(req.created_at)}</p>

                      {showContact && (
                        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl p-4">
                          <div className="text-green-400 font-bold">Свържете се с клиента</div>
                          <div className="grid md:grid-cols-3 gap-3 text-sm mt-3">
                            <div className="text-gray-200">
                              <b>Име:</b> {req.clientName || "—"}
                            </div>
                            <div className="text-gray-200">
                              <b>Телефон:</b> {req.phone || "—"}
                            </div>
                            <div className="text-gray-200 md:col-span-3">
                              <b>Адрес:</b> {req.address || "—"}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-sm">
                          {applied && <span className="text-green-400 font-bold">Кандидатствал</span>}

                          {hasAssigned && !assignedToMe && (
                            <span className="text-yellow-300 font-bold">Има избран майстор</span>
                          )}

                          {assignedToMe && <span className="text-green-400 font-bold">Назначен</span>}

                          {!applied && closed && <span className="text-gray-400 font-bold">Затворена</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          {showComplete && (
                            <button
                              onClick={() => completeRequest(req.id)}
                              disabled={completingId === req.id}
                              className={
                                completingId === req.id
                                  ? "bg-gray-700 text-gray-300 px-5 py-2 rounded-lg font-bold cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg font-bold"
                              }
                            >
                              {completingId === req.id ? "Затварям..." : "Затвори заявка"}
                            </button>
                          )}

                          <button
                            disabled={disabledApply || assignedToMe}
                            onClick={() => applyToRequest(req.id)}
                            className={
                              disabledApply || assignedToMe
                                ? "bg-gray-700 text-gray-300 px-5 py-2 rounded-lg font-bold cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-bold"
                            }
                          >
                            {assignedToMe
                              ? "Назначен"
                              : applied
                              ? "Кандидатствал"
                              : applyingId === req.id
                              ? "Кандидатствам..."
                              : "Кандидатствай"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold">Моят профил</h1>

              <button
                onClick={loadMyReviews}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
              >
                Обнови рейтинг
              </button>
            </div>

            {/* ✅ Rating panel */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">Рейтинг</div>
                  {ratingLoading ? (
                    <div className="text-gray-400 mt-2">Зареждане...</div>
                  ) : ratingError ? (
                    <div className="text-red-400 mt-2">{ratingError}</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold mt-1">{ratingInfo.average} ⭐</div>
                      <div className="text-sm text-gray-400">{ratingInfo.total} отзива</div>
                    </>
                  )}
                </div>
              </div>

              {!ratingLoading && !ratingError && (ratingInfo.items || []).length > 0 && (
                <div className="mt-4 space-y-2">
                  {(ratingInfo.items || []).slice(0, 5).map((it) => (
                    <div key={it.id} className="bg-gray-900 border border-gray-700 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{it.rating} ⭐</div>
                        <div className="text-xs text-gray-400">{formatBG(it.created_at)}</div>
                      </div>
                      {it.comment ? <div className="text-gray-200 mt-2">{it.comment}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold">Профилна снимка</h2>
              <div className="flex items-center gap-6 mt-4">
                <img src={avatarSrc} className="w-32 h-32 rounded-full border-4 border-red-500 object-cover" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <input
                name="fullName"
                value={profile.fullName}
                onChange={handleChange}
                placeholder="Трите имена / фирма"
                className="p-3 rounded bg-gray-800 w-full"
              />
              <input
                name="city"
                value={profile.city}
                onChange={handleChange}
                placeholder="Град"
                className="p-3 rounded bg-gray-800 w-full"
              />
            </div>

            <textarea
              name="description"
              value={profile.description}
              onChange={handleChange}
              placeholder="Кратко описание"
              className="w-full p-3 bg-gray-800 rounded h-28"
            />

            <textarea
              name="experience"
              value={profile.experience}
              onChange={handleChange}
              placeholder="Опит / специализации"
              className="mt-4 w-full p-3 bg-gray-800 rounded h-24"
            />

            <textarea
              name="equipment"
              value={profile.equipment}
              onChange={handleChange}
              placeholder="Оборудване и техника"
              className="mt-4 w-full p-3 bg-gray-800 rounded h-24"
            />

            <button
              onClick={saveProfile}
              disabled={saving}
              className="mt-6 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg text-lg font-bold"
            >
              {saving ? "Запазване..." : "Запази промените"}
            </button>
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold">Галерия</h1>

              <button
                onClick={loadGallery}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
              >
                Обнови
              </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-xl font-bold mb-3">Качи снимки от обекти</h2>

              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <input type="file" accept="image/*" multiple onChange={onPickGalleryFiles} className="block" />

                <button
                  onClick={uploadGallery}
                  disabled={uploadingGallery || !galleryFiles.length}
                  className={
                    uploadingGallery || !galleryFiles.length
                      ? "bg-gray-700 text-gray-300 px-5 py-2 rounded-lg font-bold cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-bold"
                  }
                >
                  {uploadingGallery ? "Качвам..." : "Качи"}
                </button>

                {galleryFiles.length > 0 && (
                  <span className="text-gray-300 text-sm">
                    Избрани: <strong>{galleryFiles.length}</strong>
                  </span>
                )}
              </div>

              {galleryError && <p className="text-red-400 mt-3">{galleryError}</p>}
              {galleryMsg && <p className="text-yellow-300 mt-3">{galleryMsg}</p>}
            </div>

            <div className="mt-6">
              {galleryLoading ? (
                <p className="text-gray-400">Зареждане...</p>
              ) : gallery.length === 0 ? (
                <p className="text-gray-400">Няма качени снимки.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.map((img) => (
                    <div key={img.id || img.url} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                      <div className="aspect-square overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                        <img src={img.url} alt="gallery" className="w-full h-full object-cover" loading="lazy" />
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3">
                        <span className="text-xs text-gray-400">{formatBG(img.created_at || img.createdAt)}</span>

                        <button
                          disabled={deletingId === img.id}
                          onClick={() => deleteGalleryImage(img.id)}
                          className={
                            deletingId === img.id
                              ? "bg-gray-700 text-gray-300 px-3 py-1 rounded font-bold cursor-not-allowed text-xs"
                              : "bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-bold text-xs"
                          }
                        >
                          {deletingId === img.id ? "Трия..." : "Изтрий"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h3 className="font-bold mb-2">Следваща стъпка (когато я вържем към заявки)</h3>
              <p className="text-gray-300 text-sm">
                Ще добавим <strong>requestId</strong> към качването и ще показваме галерията вътре в конкретна заявка.
              </p>
            </div>
          </div>
        )}

        {activeTab === "calculator" && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Калкулатор</h1>

            <div className="bg-gray-800 p-6 rounded-xl space-y-4 border border-gray-700">
              <h2 className="text-2xl font-bold">Bricky Калкулатор</h2>

              <select
                value={calc.type}
                onChange={(e) => updateCalc("type", e.target.value)}
                className="w-full p-3 rounded bg-gray-700"
              >
                <option value="">Тип ремонт</option>
                {Object.keys(PRICE_TABLE).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={calc.area}
                  onChange={(e) => updateCalc("area", e.target.value)}
                  placeholder="Площ (кв.м)"
                  className="w-full p-3 rounded bg-gray-700"
                />
                <input
                  type="number"
                  value={calc.laborPerM2}
                  onChange={(e) => updateCalc("laborPerM2", e.target.value)}
                  placeholder="Цена за труд / кв.м"
                  className="w-full p-3 rounded bg-gray-700"
                />
              </div>

              <div className="bg-gray-900 p-4 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span>Материали:</span>
                  <span>{calc.materials} лв</span>
                </div>
                <div className="flex justify-between">
                  <span>Труд:</span>
                  <span>{calc.labor} лв</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Общо:</span>
                  <span className="text-green-400 font-bold text-lg">{calc.total} лв</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="text-center mt-10">
            <h1 className="text-3xl font-bold mb-4">Настройки</h1>
            <p className="text-gray-400">(placeholder)</p>
          </div>
        )}

        {activeTab === "subscription" && (
          <div className="text-center mt-10">
            <h1 className="text-3xl font-bold mb-4">Абонамент</h1>
            <p className="text-gray-400">Bricky PRO — скоро.</p>
          </div>
        )}
      </main>
    </div>
  );
}

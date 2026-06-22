// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { apiGet, apiPost, apiPut } from "../../services/api";
import { isDevMockToken, saveDevWorkerProfile, uploadDevWorkerAvatar, uploadDevWorkerGallery } from "../../services/devMockApi";
import LogoutButton from "../../components/LogoutButton";
import { getApiBase, mediaUrl, photoMediaUrl } from "../../utils/mediaUrls";

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
  return mediaUrl(url);
}

function photoUrl(photo) {
  return photoMediaUrl(photo);
}

function requestPhotos(req) {
  const photos = Array.isArray(req?.photos)
    ? req.photos
    : Array.isArray(req?.beforePhotos)
    ? req.beforePhotos
    : [];

  return photos.filter((photo) => photoUrl(photo));
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

function imageFileToDataUrl(file, maxSize = 900, quality = 0.72) {
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
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      url: await imageFileToDataUrl(file),
    }))
  );
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
  const [completedRequests, setCompletedRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reqError, setReqError] = useState("");

  const [applyingId, setApplyingId] = useState(null);
  const [applyMsg, setApplyMsg] = useState("");

  // ✅ COMPLETE state
  const [completingId, setCompletingId] = useState(null);
  const [completionPhotos, setCompletionPhotos] = useState({});

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
  const [albumViewer, setAlbumViewer] = useState(null); // { albumIndex, photoIndex }

  useEffect(() => {
    loadMeProfile();
    loadRequests();
    loadCompletedRequests();
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

  async function loadCompletedRequests() {
    try {
      const [completedRes, historyRes] = await Promise.all([
        apiGet("/requests/worker/completed").catch(() => ({ data: [] })),
        apiGet("/workers/me/history").catch(() => ({ data: [] })),
      ]);
      const completed = Array.isArray(completedRes.data) ? completedRes.data : [];
      const history = Array.isArray(historyRes.data) ? historyRes.data : [];
      setCompletedRequests(history.length ? history : completed);
    } catch (err) {
      console.error("Error loading completed requests:", err);
      setCompletedRequests([]);
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

      const res = await apiGet("/workers/me");

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

  async function handleCompletionPhotos(requestId, files) {
    try {
      const photos = await filesToPhotos(files);
      setCompletionPhotos((p) => ({ ...p, [requestId]: [...(p[requestId] || []), ...photos] }));
    } catch (err) {
      console.error(err);
      setApplyMsg("Не успях да прочета снимките след ремонта.");
    }
  }

  function removeCompletionPhoto(requestId, photoId) {
    setCompletionPhotos((p) => ({
      ...p,
      [requestId]: (p[requestId] || []).filter((photo) => String(photo.id) !== String(photoId)),
    }));
  }

  async function completeRequest(requestId) {
    try {
      setApplyMsg("");
      setCompletingId(requestId);

      await apiPost(`/requests/${requestId}/complete`, { afterPhotos: completionPhotos[requestId] || [] });

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

    if (isDevMockToken()) {
      const updated = await uploadDevWorkerAvatar(profile.avatar);
      if (updated?.avatarUrl) {
        setProfile((p) => ({ ...p, avatarUrl: updated.avatarUrl, avatar: null }));
        setPreviewAvatar(absUrl(updated.avatarUrl));
      } else {
        setProfile((p) => ({ ...p, avatar: null }));
      }
      return updated;
    }

    const fd = new FormData();
    fd.append("avatar", profile.avatar);

    const res = await axios.post(`${getApiBase()}/workers/me/avatar`, fd, {
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

      let updated = null;

      if (isDevMockToken()) {
        updated = saveDevWorkerProfile({
          fullName: profile.fullName,
          city: profile.city,
          description: profile.description,
          experience: profile.experience,
          equipment: profile.equipment,
        });
      } else {
        const res = await apiPut("/workers/me", {
          fullName: profile.fullName,
          city: profile.city,
          description: profile.description,
          experience: profile.experience,
          equipment: profile.equipment,
        });
        updated = res.data || {};
      }

      setProfile((p) => ({
        ...p,
        fullName: updated?.fullName || p.fullName,
        city: updated?.city || p.city,
        description: updated?.description || p.description,
        experience: updated?.experience || p.experience,
        equipment: updated?.equipment || p.equipment,
        avatarUrl: updated?.avatarUrl || p.avatarUrl,
      }));

      if (updated?.avatarUrl && !profile.avatar) setPreviewAvatar(absUrl(updated.avatarUrl));
      if (profile.avatar) await uploadAvatarIfNeeded();
      await loadMeProfile();

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
          url: photoUrl(x),
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

      if (isDevMockToken()) {
        await uploadDevWorkerGallery(galleryFiles);
        setGalleryMsg("Снимките са качени.");
        setGalleryFiles([]);
        await loadGallery();
        return;
      }

      const fd = new FormData();
      galleryFiles.forEach((f) => fd.append("images", f));

      await axios.post(`${getApiBase()}/workers/me/gallery`, fd, {
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

  const galleryAlbums = useMemo(() => {
    const cleanPhotos = (items = []) =>
      (Array.isArray(items) ? items : [])
        .map((photo) => ({
          ...(typeof photo === "object" && photo ? photo : {}),
          url: photoUrl(photo),
        }))
        .filter((photo) => !!photo.url);

    const completedAlbums = (Array.isArray(completedRequests) ? completedRequests : [])
      .map((job) => {
        const before = cleanPhotos(job.beforePhotos || job.photos);
        const after = cleanPhotos(job.afterPhotos);
        const photos = [...after, ...before];
        const id = job.requestId || job.id;

        return {
          id: `job-${id}`,
          type: "job",
          title: `Обект #${id} • ${job.category || "Ремонт"}`,
          subtitle: job.address || "Завършен ремонт",
          meta: `${job.durationDays || 1} дни`,
          photos,
          cover: photos[0],
          date: job.completedAt || job.created_at || job.createdAt,
        };
      })
      .filter((album) => album.photos.length > 0);

    const jobRequestIds = new Set(
      completedAlbums
        .map((album) => String(album.id).replace(/^job-/, ""))
        .filter(Boolean)
    );

    const loosePhotos = cleanPhotos(gallery).filter((photo) => {
      if (!photo.requestId) return true;
      return !jobRequestIds.has(String(photo.requestId));
    });

    const manualAlbum =
      loosePhotos.length > 0
        ? [
            {
              id: "manual-gallery",
              type: "manual",
              title: "Качени снимки",
              subtitle: "Общи портфолио снимки",
              meta: `${loosePhotos.length} снимки`,
              photos: loosePhotos,
              cover: loosePhotos[0],
              date: loosePhotos[0]?.created_at || loosePhotos[0]?.createdAt,
            },
          ]
        : [];

    return [...completedAlbums, ...manualAlbum];
  }, [completedRequests, gallery]);

  const activeAlbum =
    albumViewer && galleryAlbums[albumViewer.albumIndex] ? galleryAlbums[albumViewer.albumIndex] : null;
  const activePhoto =
    activeAlbum && activeAlbum.photos[albumViewer?.photoIndex || 0]
      ? activeAlbum.photos[albumViewer?.photoIndex || 0]
      : null;
  const canDeleteActivePhoto = activeAlbum?.type === "manual" && activePhoto?.id;

  function openAlbum(albumIndex, photoIndex = 0) {
    setAlbumViewer({ albumIndex, photoIndex });
  }

  function closeAlbum() {
    setAlbumViewer(null);
  }

  function stepAlbumPhoto(delta) {
    setAlbumViewer((viewer) => {
      if (!viewer) return viewer;
      const album = galleryAlbums[viewer.albumIndex];
      if (!album?.photos?.length) return viewer;
      const next = (viewer.photoIndex + delta + album.photos.length) % album.photos.length;
      return { ...viewer, photoIndex: next };
    });
  }

  async function deleteActiveGalleryPhoto() {
    if (!canDeleteActivePhoto) return;
    const imageId = activePhoto.id;
    const ok = window.confirm("Да изтрия ли тази снимка от галерията?");
    if (!ok) return;

    const currentIndex = albumViewer?.photoIndex || 0;
    const remaining = Math.max(0, (activeAlbum?.photos?.length || 1) - 1);

    await deleteGalleryImage(imageId);

    if (remaining === 0) {
      closeAlbum();
      return;
    }

    setAlbumViewer((viewer) =>
      viewer
        ? {
            ...viewer,
            photoIndex: Math.min(currentIndex, remaining - 1),
          }
        : viewer
    );
  }

  const avatarSrc =
    previewAvatar || (profile.avatarUrl ? absUrl(profile.avatarUrl) : "") || "/media_files/Snejan.jpg";

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 pt-24 fixed h-full">
        <nav className="flex flex-col gap-4 px-6 text-sm">
          {[
            ["dashboard", "Контрол панел"],
            ["requests", "Заявки"],
            ["map", "Карта заявки"],
            ["profile", "Профил"],
            ["gallery", "Галерия"],
            ["calculator", "Калкулатор"],
            ["settings", "Настройки"],
            ["subscription", "Абонамент"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                if (key === "map") window.location.href = "/repair-map";
                else setActiveTab(key);
              }}
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
                      const beforePhotos = requestPhotos(r);

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

                        {beforePhotos.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-bold text-gray-300 mb-2">Снимки от клиента</div>
                            <div className="flex flex-wrap gap-2">
                              {beforePhotos.map((photo) => (
                                <a
                                  key={photo.id || photoUrl(photo)}
                                  href={photoUrl(photo)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block h-20 w-20 overflow-hidden rounded-lg border border-gray-700 bg-gray-950"
                                >
                                  <img src={photoUrl(photo)} alt={photo.name || "Снимка от клиента"} className="h-full w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

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
                            <div className="w-full md:w-auto bg-gray-900 border border-gray-700 rounded-lg p-3">
                              <label className="block text-xs font-bold text-gray-300 mb-2">Снимки след ремонта</label>
                              <input type="file" accept="image/*" multiple onChange={(e) => { handleCompletionPhotos(r.id, e.target.files); e.target.value = ""; }} className="block text-xs max-w-56" />
                              {Array.isArray(completionPhotos[r.id]) && completionPhotos[r.id].length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {completionPhotos[r.id].map((photo) => (
                                    <div key={photo.id || photoUrl(photo)} className="relative h-14 w-14 overflow-hidden rounded border border-gray-700">
                                      <img src={photoUrl(photo)} alt={photo.name || "Снимка след ремонта"} className="h-full w-full object-cover" />
                                      <button type="button" onClick={() => removeCompletionPhoto(r.id, photo.id)} className="absolute right-0 top-0 bg-red-600 text-white text-[10px] px-1">x</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

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
                  const beforePhotos = requestPhotos(req);

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

                      {beforePhotos.length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm font-bold text-gray-300 mb-2">Снимки от клиента</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {beforePhotos.map((photo) => (
                              <a
                                key={photo.id || photoUrl(photo)}
                                href={photoUrl(photo)}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-lg border border-gray-700 bg-gray-900"
                              >
                                <img src={photoUrl(photo)} alt={photo.name || "Снимка от клиента"} className="h-24 w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

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
                            <div className="w-full md:w-auto bg-gray-900 border border-gray-700 rounded-lg p-3">
                              <label className="block text-xs font-bold text-gray-300 mb-2">Снимки след ремонта</label>
                              <input type="file" accept="image/*" multiple onChange={(e) => { handleCompletionPhotos(req.id, e.target.files); e.target.value = ""; }} className="block text-xs max-w-56" />
                              {Array.isArray(completionPhotos[req.id]) && completionPhotos[req.id].length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {completionPhotos[req.id].map((photo) => (
                                    <div key={photo.id || photoUrl(photo)} className="relative h-14 w-14 overflow-hidden rounded border border-gray-700">
                                      <img src={photoUrl(photo)} alt={photo.name || "Снимка след ремонта"} className="h-full w-full object-cover" />
                                      <button type="button" onClick={() => removeCompletionPhoto(req.id, photo.id)} className="absolute right-0 top-0 bg-red-600 text-white text-[10px] px-1">x</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

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


        {activeTab === "history" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold">История на ремонтите</h1>
              <button onClick={loadCompletedRequests} className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold">Обнови</button>
            </div>
            {completedRequests.length === 0 ? (
              <p className="text-gray-400">Все още няма завършени ремонти.</p>
            ) : (
              <div className="space-y-4">
                {completedRequests.map((job) => {
                  const before = Array.isArray(job.beforePhotos) ? job.beforePhotos : Array.isArray(job.photos) ? job.photos : [];
                  const after = Array.isArray(job.afterPhotos) ? job.afterPhotos : [];
                  const duration = job.durationDays || 1;
                  return (
                    <div key={job.id || job.requestId} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div><h2 className="text-xl font-bold">#{job.requestId || job.id} • {job.category || "Ремонт"}</h2><p className="text-gray-400 text-sm mt-1">{job.address || "—"}</p></div>
                        <div className="text-right text-sm"><div className="text-green-400 font-bold">Завършена</div><div className="text-gray-400 mt-1">Време: {duration} дни</div></div>
                      </div>
                      <p className="text-gray-300 mt-3">{job.description || "Няма описание."}</p>
                      <div className="grid md:grid-cols-2 gap-4 mt-5">
                        <div><h3 className="font-bold mb-2">Преди ремонта</h3>{before.length === 0 ? <p className="text-gray-500 text-sm">Няма снимки преди.</p> : <div className="grid grid-cols-2 gap-3">{before.map((photo) => <a key={photo.id || photoUrl(photo)} href={photoUrl(photo)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-700 bg-gray-900"><img src={photoUrl(photo)} alt={photo.name || "Преди ремонта"} className="h-28 w-full object-cover" /></a>)}</div>}</div>
                        <div><h3 className="font-bold mb-2">След ремонта</h3>{after.length === 0 ? <p className="text-gray-500 text-sm">Няма снимки след.</p> : <div className="grid grid-cols-2 gap-3">{after.map((photo) => <a key={photo.id || photoUrl(photo)} href={photoUrl(photo)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-700 bg-gray-900"><img src={photoUrl(photo)} alt={photo.name || "След ремонта"} className="h-28 w-full object-cover" /></a>)}</div>}</div>
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
                <img
                  src={avatarSrc}
                  className="w-32 h-32 rounded-full border-4 border-red-500 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/media_files/Snejan.jpg";
                  }}
                />
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
              ) : galleryAlbums.length === 0 ? (
                <p className="text-gray-400">Няма качени снимки.</p>
              ) : (
                <div className="space-y-3">
                  {galleryAlbums.map((album, albumIndex) => (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => openAlbum(albumIndex)}
                      className="w-full text-left bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-blue-500 transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-green-600/20 border border-green-500/40 px-3 py-1 text-xs font-bold text-green-300">
                              Реален обект
                            </span>
                            <span className="rounded-full bg-blue-600/20 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-200">
                              {album.photos.length} снимки
                            </span>
                          </div>

                          <div className="mt-3 text-xl font-extrabold leading-tight">{album.title.replace(/^Обект #\d+\s•\s/, "")}</div>
                          <div className="mt-1 text-sm text-gray-300">{album.subtitle}</div>

                          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
                            <div className="rounded-lg bg-gray-900 px-3 py-2">
                              <div className="text-gray-500 text-xs">Статус</div>
                              <div className="font-bold text-green-400">{album.type === "job" ? "Завършен" : "Портфолио"}</div>
                            </div>
                            <div className="rounded-lg bg-gray-900 px-3 py-2">
                              <div className="text-gray-500 text-xs">Време</div>
                              <div className="font-bold">{album.meta}</div>
                            </div>
                            <div className="rounded-lg bg-gray-900 px-3 py-2">
                              <div className="text-gray-500 text-xs">Дата</div>
                              <div className="font-bold">{formatBG(album.date)}</div>
                            </div>
                          </div>

                          <div className="mt-4 text-sm font-bold text-blue-300">
                            Виж всички снимки →
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:w-72 lg:w-80 h-32 md:h-36">
                          <div className="overflow-hidden rounded-lg bg-gray-900">
                            <img
                              src={album.cover.url}
                              alt={album.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                          <div className="relative overflow-hidden rounded-lg bg-gray-900">
                            <img
                              src={(album.photos[1] || album.cover).url}
                              alt={album.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            {album.photos.length > 2 && (
                              <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-lg font-extrabold">
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
              <div className="flex items-center gap-2">
                {canDeleteActivePhoto ? (
                  <button
                    type="button"
                    onClick={deleteActiveGalleryPhoto}
                    disabled={deletingId === activePhoto.id}
                    className={
                      deletingId === activePhoto.id
                        ? "rounded-lg bg-red-950 px-4 py-2 font-bold text-red-200 cursor-not-allowed"
                        : "rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 font-bold"
                    }
                  >
                    {deletingId === activePhoto.id ? "Трия..." : "Изтрий снимката"}
                  </button>
                ) : null}
                <button type="button" onClick={closeAlbum} className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 font-bold">
                  Затвори
                </button>
              </div>
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
                        ? "h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-blue-500"
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

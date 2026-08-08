// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../../services/api";
import { isDevMockToken, saveDevWorkerProfile, updateDevWorkerAppearance, uploadDevWorkerAvatar, uploadDevWorkerGallery } from "../../services/devMockApi";
import WorkerCalculatorPanel from "../../components/workers/WorkerCalculatorPanel";
import WorkerDashboardSummary from "../../components/workers/WorkerDashboardSummary";
import WorkerGalleryPanel from "../../components/workers/WorkerGalleryPanel";
import WorkerProfileSidebar from "../../components/workers/WorkerProfileSidebar";
import WorkerReferralPanel from "../../components/workers/WorkerReferralPanel";
import WorkerProfileEditorPremium from "../../components/workers/WorkerProfileEditorPremium";
import { getApiBase, mediaUrl, photoMediaUrl } from "../../utils/mediaUrls";
import { cleanRequestDescription, formatRequestExpectedRange } from "../../utils/requestPresentation";
import { DEFAULT_WORKER_BANNER_KEY } from "../../constants/workerBannerCatalog";
import AccountSettingsPanel from "../../components/account/AccountSettingsPanel";

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
      file,
    }))
  );
}

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

const WORKER_TABS = new Set([
  "dashboard",
  "requests",
  "history",
  "profile",
  "referrals",
  "gallery",
  "calculator",
  "settings",
  "subscription",
]);

function normalizeWorkerTab(tab) {
  return WORKER_TABS.has(tab) ? tab : "dashboard";
}

export default function WorkerProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => normalizeWorkerTab(searchParams.get("tab")));

  const [profile, setProfile] = useState({
    fullName: "",
    city: "",
    description: "",
    experience: "",
    equipment: "",
    avatar: null,
    avatarUrl: "",
    profileBannerKey: DEFAULT_WORKER_BANNER_KEY,
    skills: [],
    skillKeys: [],
    approvalStatus: "",
    visibilityStatus: "",
  });

  // IMPORTANT: това е users.id на логнатия worker (userId)
  const [myUserId, setMyUserId] = useState(null);

  const [previewAvatar, setPreviewAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextTab = normalizeWorkerTab(searchParams.get("tab"));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  function selectWorkerTab(key) {
    if (key === "map") {
      navigate("/repair-map");
      return;
    }

    const nextTab = normalizeWorkerTab(key);
    setActiveTab(nextTab);
    navigate(nextTab === "dashboard" ? "/worker/profile" : `/worker/profile?tab=${encodeURIComponent(nextTab)}`);
  }

  const [requests, setRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reqError, setReqError] = useState("");

  const [applyingId, setApplyingId] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [applyMsg, setApplyMsg] = useState("");

  // ✅ COMPLETE state
  const [completingId, setCompletingId] = useState(null);
  const [completionPhotos, setCompletionPhotos] = useState({});

  // ✅ REVIEWS state (worker rating)
  const [ratingInfo, setRatingInfo] = useState({ total: 0, average: 0, items: [] });
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState("");

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
  const [referralInfo, setReferralInfo] = useState({ code: null, referralUrl: null, invites: [], rewards: [] });
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralMsg, setReferralMsg] = useState("");
  const [referralError, setReferralError] = useState("");

  useEffect(() => {
    loadMeProfile();
    loadRequests();
    loadCompletedRequests();
    loadGallery();
    loadReferrals();
  }, []);

  async function loadRequests() {
    try {
      setReqError("");
      setApplyMsg("");
      setLoadingRequests(true);

      const res = await apiGet("/requests/worker");
      const data = Array.isArray(res.data) ? res.data : [];
      setRequests(data);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || "";
      const accessRestricted =
        status === 403 &&
        /worker (profile|account) (is not approved|is not visible|is not active)/i.test(message);

      if (accessRestricted) {
        setReqError(
          "Заявките ще бъдат достъпни, когато профилът ти е одобрен и активен.",
        );
      } else {
        console.error("Error loading requests:", err);
        setReqError("Грешка при зареждане на заявки.");
      }
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadCompletedRequests() {
    try {
      const completedRes = await apiGet("/requests/worker?scope=history");
      const completed = Array.isArray(completedRes.data) ? completedRes.data : [];
      setCompletedRequests(completed);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || "";
      const accessRestricted =
        status === 403 &&
        /worker (profile|account) (is not approved|is not visible|is not active)/i.test(message);

      if (!accessRestricted) {
        console.error("Error loading completed requests:", err);
      }
      setCompletedRequests([]);
    }
  }

  const loadMyReviews = useCallback(async () => {
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
  }, [myUserId]);

  useEffect(() => {
    if (myUserId) loadMyReviews();
  }, [loadMyReviews, myUserId]);

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
        profileBannerKey: w.profileBannerKey || DEFAULT_WORKER_BANNER_KEY,
        skills: Array.isArray(w.skills) ? w.skills : [],
        skillKeys: Array.isArray(w.skillKeys) ? w.skillKeys : [],
        approvalStatus: w.approvalStatus || (w.isApproved ? "approved" : "pending"),
        visibilityStatus: w.visibilityStatus || "",
        avatar: null,
      }));

      if (w.avatarUrl) setPreviewAvatar(absUrl(w.avatarUrl));
    } catch (err) {
      console.error("Error loading worker profile:", err);
    }
  }

  function hasApplied(req) {
    if (!myUserId) return false;
    if (!Array.isArray(req?.applications)) return false;
    return req.applications.some(
      (application) =>
        Number(application?.workerUserId) === Number(myUserId) &&
        !["withdrawn", "rejected"].includes(application?.status),
    );
  }

  function isClosed(req) {
    return ["completed", "canceled", "archived"].includes(requestStatusKey(req));
  }

  function isAssignedToMe(req) {
    if (!myUserId) return false;
    return Number(req?.assignedWorkerUserId) === Number(myUserId);
  }

  function requestStatusKey(req) {
    return req?.statusKey || "";
  }

  function requestAllows(req, action) {
    return Array.isArray(req?.allowedActions) && req.allowedActions.includes(action);
  }

  function canWithdrawApplication(req) {
    const selectedToMe =
      isAssignedToMe(req) && ["worker_selected", "assigned"].includes(requestStatusKey(req));
    return (
      hasApplied(req) &&
      !isClosed(req) &&
      requestAllows(req, "withdraw_application") &&
      (selectedToMe || !toNum(req.assignedWorkerUserId))
    );
  }

  function workerStepAction(req) {
    if (!isAssignedToMe(req)) return null;
    const actions = {
      worker_selected: { endpoint: "worker-confirm", label: "Потвърждавам заявката", action: "mark_arrived" },
      assigned: { endpoint: "worker-confirm", label: "Потвърждавам заявката", action: "mark_arrived" },
      worker_confirmed: { endpoint: "on-site", label: "На адрес съм", action: "mark_arrived" },
      worker_on_site: { endpoint: "inspect", label: "Огледах обекта", action: "start_work" },
      inspected: { endpoint: "start", label: "Започнах работа", action: "start_work" },
      in_progress: { endpoint: "finish", label: "Свърших работа", needsPhotos: true, action: "mark_ready" },
      work_finished: { endpoint: "ready", label: "Готово за клиента" },
      reviewed: { endpoint: "complete", label: "Затвори поръчката", action: "close" },
    };
    const step = actions[requestStatusKey(req)] || null;
    if (!step || !step.action) return step;
    return requestAllows(req, step.action) ? step : null;
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

      await apiPost(`/requests/${requestId}/complete`, {});

      setApplyMsg(`Поръчка #${requestId} е затворена ✅`);
      await loadRequests();
      await loadCompletedRequests();
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
      if (!canApplyToJobs()) {
        setApplyMsg("Профилът ти трябва да е одобрен и активен, за да кандидатстваш.");
        return;
      }
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
        return false;
      }

      let updated = null;

      if (isDevMockToken()) {
        updated = saveDevWorkerProfile({
          fullName: profile.fullName,
          city: profile.city,
          description: profile.description,
          experience: profile.experience,
          skills: profile.skills,
          profileBannerKey: profile.profileBannerKey,
        });
        await updateDevWorkerAppearance({ profileBannerKey: profile.profileBannerKey });
      } else {
        const res = await apiPut("/workers/me", {
          fullName: profile.fullName,
          city: profile.city,
          description: profile.description,
          experience: profile.experience,
          skills: profile.skills,
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

      if (!isDevMockToken()) {
        await apiPut("/workers/me/appearance", { profileBannerKey: profile.profileBannerKey });
      }

      if (updated?.avatarUrl && !profile.avatar) setPreviewAvatar(absUrl(updated.avatarUrl));
      if (profile.avatar) await uploadAvatarIfNeeded();
      await loadMeProfile();

      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setSaving(false);
    }
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
      const s = (r.statusLabel || r.statusKey || "—").toLowerCase();
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
      const st = (r.statusKey || "").toLowerCase();
      const statusOk = statusFilter === "all" ? true : st === statusFilter;

      if (!catOk || !statusOk) return false;
      if (!q) return true;

      const hay = [r.clientName, r.address, r.description, r.category, r.statusLabel, r.statusKey]
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
    const labelsByKey = new Map();
    requests.forEach((request) => {
      const key = String(request.statusKey || "").toLowerCase();
      if (key) labelsByKey.set(key, request.statusLabel || key);
    });
    return [
      { key: "all", label: "Всички статуси" },
      ...Array.from(labelsByKey, ([key, label]) => ({ key, label })),
    ];
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

  async function withdrawApplication(requestId) {
    try {
      setApplyMsg("");
      setWithdrawingId(requestId);

      await apiPost(`/requests/${requestId}/withdraw`, {});

      setApplyMsg(`Кандидатурата по заявка #${requestId} е оттеглена.`);
      await loadRequests();
    } catch (err) {
      console.error("withdrawApplication error:", err);
      const status = err?.response?.status;

      if (status === 401) setApplyMsg("401: Нямаш валиден токен. Логни се пак.");
      else if (status === 403) setApplyMsg("403: Нямаш права (трябва worker).");
      else setApplyMsg(err?.response?.data?.message || "Неуспешно оттегляне на кандидатурата.");
    } finally {
      setWithdrawingId(null);
    }
  }

  async function advanceWorkerStep(req) {
    const action = workerStepAction(req);
    if (!action) return;

    try {
      setApplyMsg("");
      setCompletingId(req.id);
      let payload = {};

      if (action.needsPhotos) {
        const photos = completionPhotos[req.id] || [];
        if (isDevMockToken()) {
          payload = { afterPhotos: photos };
        } else {
          const imageFiles = photos
            .map((photo) => photo?.file)
            .filter((file) => file instanceof File);

          if (imageFiles.length) {
            const mediaPayload = new FormData();
            imageFiles.forEach((file) => mediaPayload.append("images", file));
            await apiPost(`/requests/${req.id}/media/after`, mediaPayload);
          }
        }
      }

      await apiPost(`/requests/${req.id}/${action.endpoint}`, payload);
      setApplyMsg(`Заявка #${req.id}: ${action.label}.`);
      await loadRequests();
      await loadCompletedRequests();
    } catch (err) {
      console.error("advanceWorkerStep error:", err);
      setApplyMsg(err?.response?.data?.message || "Неуспешна промяна на статуса.");
    } finally {
      setCompletingId(null);
    }
  }

  function canApplyToJobs() {
    return profile.approvalStatus === "approved" && !["hidden", "suspended"].includes(String(profile.visibilityStatus || "").toLowerCase());
  }

  async function loadReferrals() {
    try {
      setReferralError("");
      setReferralLoading(true);
      const res = await apiGet("/referrals/me");
      setReferralInfo(res.data || { code: null, referralUrl: null, invites: [], rewards: [] });
    } catch (err) {
      console.error("loadReferrals error:", err);
      setReferralError("Не успях да заредя referral информацията.");
    } finally {
      setReferralLoading(false);
    }
  }

  async function createReferralCode() {
    try {
      setReferralMsg("");
      setReferralError("");
      setReferralLoading(true);
      const res = await apiPost("/referrals/me/code", {});
      setReferralInfo((prev) => ({ ...prev, ...(res.data || {}) }));
      await loadReferrals();
    } catch (err) {
      console.error("createReferralCode error:", err);
      setReferralError(err?.response?.data?.message || "Не успях да създам referral код.");
    } finally {
      setReferralLoading(false);
    }
  }

  async function copyReferralLink() {
    const link = referralInfo.referralUrl || "";
    if (!link) return;
    await navigator.clipboard?.writeText(link);
    setReferralMsg("Линкът е копиран.");
  }

  async function shareReferralLink() {
    const link = referralInfo.referralUrl || "";
    if (!link) return;
    const text = `Покани добър майстор в Bricky. След като завърши успешно 2 ремонта, получаваш 30 дни подсилена видимост: ${link}`;
    if (navigator.share) {
      await navigator.share({ title: "Bricky referral", text, url: link });
      setReferralMsg("Линкът е споделен.");
    } else {
      await navigator.clipboard?.writeText(text);
      setReferralMsg("Текстът за споделяне е копиран.");
    }
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
    <div className="flex min-h-screen bg-[#07101d] text-white">
      <WorkerProfileSidebar activeTab={activeTab} onSelect={selectWorkerTab} />

      <main className="flex-1 px-4 pb-20 pt-40 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.08),transparent_34%),linear-gradient(180deg,#07101d,#050b14)] sm:px-6 lg:ml-64 lg:px-10 lg:pt-24">
        {activeTab === "dashboard" && (
          <div className="max-w-6xl mx-auto rounded-2xl border border-cyan-400/15 bg-[#081827]/75 p-6 shadow-2xl shadow-cyan-950/20">
            <WorkerDashboardSummary
              stats={stats}
              loadingRequests={loadingRequests}
              requestError={reqError}
              actionMessage={applyMsg}
              ratingInfo={ratingInfo}
              ratingLoading={ratingLoading}
              ratingError={ratingError}
              onRefresh={() => {
                loadRequests();
                loadMyReviews();
              }}
            />

            <div className="mt-8 rounded-2xl border border-cyan-400/15 bg-[#0b2033]/85 p-6 shadow-inner shadow-cyan-950/20">
              <h2 className="text-xl font-bold mb-4">Последни заявки</h2>

              {stats.newest.length === 0 ? (
                <p className="text-gray-400">Няма заявки.</p>
              ) : (
                <div className="space-y-3">
                  {stats.newest.map((r) => {
                    const applied = hasApplied(r);
                    const closed = isClosed(r);
                    const hasAssigned = !!toNum(r.assignedWorkerUserId);
                    const assignedToMe = isAssignedToMe(r);
                    const canWithdraw = canWithdrawApplication(r);

                      const profileCannotApply = !canApplyToJobs();
                      const disabledApply =
                        profileCannotApply ||
                        applied ||
                        closed ||
                        hasAssigned ||
                        !requestAllows(r, "apply") ||
                        applyingId === r.id;
                      const selectionPending = assignedToMe && ["worker_selected", "assigned"].includes(requestStatusKey(r));
                      const showContact = assignedToMe && !selectionPending && r.addressPrecision === "exact";
                      const stageAction = workerStepAction(r);
                      const showComplete = Boolean(stageAction);
                      const showAfterPhotos = Boolean(stageAction?.needsPhotos);
                      const beforePhotos = requestPhotos(r);

                      return (
                        <div key={r.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-bold">
                            #{r.id} • {r.category} • {r.clientName}
                          </div>
                          <div className="text-sm text-red-400">{r.statusLabel || r.statusKey}</div>
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

                        {selectionPending && (
                          <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-950/25 p-3 text-sm text-cyan-100">
                            Потвърди заявката, за да получиш телефона и точния адрес на клиента.
                          </div>
                        )}

                        {showContact && (
                          <div className="mt-3 bg-gray-800 border border-gray-700 rounded-xl p-3">
                            <div className="text-green-400 font-bold">Контакт с клиента</div>
                            <div className="text-sm text-gray-200 mt-2">
                              <div>
                                <b>Име:</b> {r.clientName || "—"}
                              </div>
                              <div>
                                <b>Адрес:</b> {r.address || "—"}
                              </div>
                              <div>
                                <b>Телефон:</b> {r.phone || "—"}
                              </div>
                            </div>
                            <p className="mt-3 text-xs text-amber-200">Поръчката е потвърдена. За прекратяване се обърни към администратор.</p>
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

                          {canWithdraw && (
                            <button
                              type="button"
                              onClick={() => withdrawApplication(r.id)}
                              disabled={withdrawingId === r.id}
                              className={
                                withdrawingId === r.id
                                  ? "bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-bold cursor-not-allowed"
                                  : "bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg font-bold"
                              }
                            >
                              {withdrawingId === r.id ? "Оттеглям..." : selectionPending ? "Откажи заявката" : "Оттегли кандидатура"}
                            </button>
                          )}

                          {/* ✅ Complete button */}
                          {showAfterPhotos && (
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
                              onClick={() => (stageAction.endpoint === "complete" ? completeRequest(r.id) : advanceWorkerStep(r))}
                              disabled={completingId === r.id}
                              className={
                                completingId === r.id
                                  ? "bg-gray-700 px-4 py-2 rounded-lg font-bold cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold"
                              }
                            >
                              {completingId === r.id ? "Записвам..." : stageAction.label}
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
                              : profileCannotApply
                              ? "Чака одобрение"
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
                placeholder="Търси по категория, район или описание..."
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
                {statuses.map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {loadingRequests ? (
              <p className="text-gray-400">Зареждане...</p>
            ) : reqError ? (
              <p className={reqError.startsWith("Заявките ще бъдат") ? "text-amber-300" : "text-red-400"}>
                {reqError}
              </p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-gray-400">Няма налични заявки.</p>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const applied = hasApplied(req);
                  const closed = isClosed(req);
                  const hasAssigned = !!toNum(req.assignedWorkerUserId);
                  const assignedToMe = isAssignedToMe(req);
                  const canWithdraw = canWithdrawApplication(req);

                  const profileCannotApply = !canApplyToJobs();
                  const disabledApply =
                    profileCannotApply ||
                    applied ||
                    closed ||
                    hasAssigned ||
                    !requestAllows(req, "apply") ||
                    applyingId === req.id;
                  const selectionPending = assignedToMe && ["worker_selected", "assigned"].includes(requestStatusKey(req));
                  const showContact = assignedToMe && !selectionPending && req.addressPrecision === "exact";
                  const stageAction = workerStepAction(req);
                  const showComplete = Boolean(stageAction);
                  const showAfterPhotos = Boolean(stageAction?.needsPhotos);
                  const beforePhotos = requestPhotos(req);

                  return (
                    <div key={req.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold">
                          #{req.id} • {req.category}
                        </h2>
                        <span className="text-red-400 font-bold">{req.statusLabel || req.statusKey}</span>
                      </div>

                      <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                        <p className="text-gray-300">
                          <strong>Клиент:</strong> {req.clientName}
                        </p>
                        <p className="text-gray-300">
                          <strong>{req.addressPrecision === "exact" ? "Адрес:" : "Район:"}</strong> {req.address || "—"}
                        </p>
                      </div>

                      <p className="mt-3 whitespace-pre-line text-gray-400">
                        {cleanRequestDescription(req.description) || "Няма описание."}
                      </p>
                      {formatRequestExpectedRange(req) && (
                        <p className="mt-3 text-sm font-bold text-green-300">
                          Ориентировъчна цена: {formatRequestExpectedRange(req)}
                        </p>
                      )}

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

                      {selectionPending && (
                        <div className="mt-4 rounded-xl border border-cyan-500/25 bg-cyan-950/25 p-4 text-sm text-cyan-100">
                          Потвърди заявката, за да получиш телефона и точния адрес на клиента.
                        </div>
                      )}

                      {showContact && (
                        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl p-4">
                          <div className="text-green-400 font-bold">Контакт с клиента</div>
                          <div className="grid md:grid-cols-2 gap-3 text-sm mt-3">
                            <div className="text-gray-200">
                              <b>Име:</b> {req.clientName || "—"}
                            </div>
                            <div className="text-gray-200">
                              <b>Адрес:</b> {req.address || "—"}
                            </div>
                            <div className="text-gray-200">
                              <b>Телефон:</b> {req.phone || "—"}
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-amber-200">Поръчката е потвърдена. За прекратяване се обърни към администратор.</p>
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
                          {canWithdraw && (
                            <button
                              type="button"
                              onClick={() => withdrawApplication(req.id)}
                              disabled={withdrawingId === req.id}
                              className={
                                withdrawingId === req.id
                                  ? "bg-gray-700 text-gray-300 px-5 py-2 rounded-lg font-bold cursor-not-allowed"
                                  : "bg-yellow-600 hover:bg-yellow-700 px-5 py-2 rounded-lg font-bold"
                              }
                            >
                              {withdrawingId === req.id ? "Оттеглям..." : selectionPending ? "Откажи заявката" : "Оттегли кандидатура"}
                            </button>
                          )}

                          {showAfterPhotos && (
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
                              onClick={() => (stageAction.endpoint === "complete" ? completeRequest(req.id) : advanceWorkerStep(req))}
                              disabled={completingId === req.id}
                              className={
                                completingId === req.id
                                  ? "bg-gray-700 text-gray-300 px-5 py-2 rounded-lg font-bold cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg font-bold"
                              }
                            >
                              {completingId === req.id ? "Записвам..." : stageAction.label}
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
                              : profileCannotApply
                              ? "Чака одобрение"
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
                      <p className="mt-3 whitespace-pre-line text-gray-300">
                        {cleanRequestDescription(job.description) || "Няма описание."}
                      </p>
                      {formatRequestExpectedRange(job) && (
                        <p className="mt-3 text-sm font-bold text-green-300">
                          Ориентировъчна цена: {formatRequestExpectedRange(job)}
                        </p>
                      )}
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
          <WorkerProfileEditorPremium
            profile={profile}
            setProfile={setProfile}
            avatarSrc={avatarSrc}
            onAvatarChange={handleAvatarUpload}
            onSave={saveProfile}
            onPreview={() => myUserId && navigate(`/workers/${myUserId}`)}
            saving={saving}
            ratingInfo={ratingInfo}
            ratingLoading={ratingLoading}
            ratingError={ratingError}
            completedCount={completedRequests.length}
          />
        )}

        {activeTab === "referrals" && (
          <WorkerReferralPanel
            referralInfo={referralInfo}
            loading={referralLoading}
            error={referralError}
            message={referralMsg}
            onRefresh={loadReferrals}
            onCreateCode={createReferralCode}
            onCopyLink={copyReferralLink}
            onShareLink={shareReferralLink}
            formatDate={formatBG}
          />
        )}

        {activeTab === "gallery" && (
          <WorkerGalleryPanel
            albums={galleryAlbums}
            loading={galleryLoading}
            error={galleryError}
            message={galleryMsg}
            selectedFiles={galleryFiles}
            uploading={uploadingGallery}
            deletingId={deletingId}
            activeAlbum={activeAlbum}
            activePhoto={activePhoto}
            activePhotoIndex={albumViewer?.photoIndex || 0}
            canDeleteActivePhoto={canDeleteActivePhoto}
            onRefresh={loadGallery}
            onPickFiles={onPickGalleryFiles}
            onUpload={uploadGallery}
            onOpenAlbum={openAlbum}
            onCloseAlbum={closeAlbum}
            onStepPhoto={stepAlbumPhoto}
            onSelectPhoto={(photoIndex) =>
              setAlbumViewer((viewer) => (viewer ? { ...viewer, photoIndex } : viewer))
            }
            onDeleteActivePhoto={deleteActiveGalleryPhoto}
            formatDate={formatBG}
          />
        )}

        {activeTab === "calculator" && <WorkerCalculatorPanel />}

        {activeTab === "settings" && (
          <AccountSettingsPanel
            onProfileSaved={(account) =>
              setProfile((current) => ({
                ...current,
                fullName: account.profile?.name || current.fullName,
              }))
            }
          />
        )}

        {activeTab === "subscription" && (
          <AccountSettingsPanel view="subscription" />
        )}
      </main>

    </div>
  );
}

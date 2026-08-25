// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../services/api";
import ClientProfileSidebar from "../components/client/ClientProfileSidebar";
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
import AccountSettingsPanel from "../components/account/AccountSettingsPanel";

function formatBG(dateStr) {
  try {
    return new Date(dateStr).toLocaleString("bg-BG");
  } catch {
    return dateStr || "—";
  }
}

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

function requestApplicantIds(request) {
  if (!Array.isArray(request?.applications)) return [];
  return uniqNums(
    request.applications
      .filter((application) => !["withdrawn", "rejected"].includes(application?.status))
      .map((application) => application?.workerUserId),
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
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return ["requests", "history", "create", "profile", "settings"].includes(tab) ? tab : "requests";
  });

  const [client, setClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [requests, setRequests] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // keyed by worker.userId (users.id)
  const [workersMap, setWorkersMap] = useState({});

  const [actionMsg, setActionMsg] = useState("");
  const [assigningKey, setAssigningKey] = useState("");
  const [unassigningId, setUnassigningId] = useState(null);

  // ✅ reviews state (real, not session-fantasy)
  const [reviewDraft, setReviewDraft] = useState({}); // { [requestId]: { rating, comment } }
  const [reviewMsg, setReviewMsg] = useState({}); // { [requestId]: string }
  const [reviewSaving, setReviewSaving] = useState({}); // { [requestId]: boolean }
  const [reviewMap, setReviewMap] = useState({}); // { [requestId]: review }

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    setActionMsg("");
    try {
      // optional client profile endpoint
      try {
        const clientRes = await apiGet("/client/me");
        setClient(clientRes.data || {});
      } catch {
        // ok - no endpoint
      }

      const [reqRes, historyRes] = await Promise.all([
        apiGet("/requests/client"),
        apiGet("/requests/client?scope=history").catch(() => ({ data: [] })),
      ]);
      const reqs = Array.isArray(reqRes.data) ? reqRes.data : [];
      const historyReqs = Array.isArray(historyRes.data) ? historyRes.data : [];
      setRequests(reqs);
      setRequestHistory(historyReqs);
      const allReqs = [...reqs, ...historyReqs];

      // ✅ (optional) load my reviews so UI knows "already rated"
      // If endpoint missing, UI still works (backend prevents duplicates).
      try {
        const revRes = await apiGet("/reviews/client");
        const items = Array.isArray(revRes.data) ? revRes.data : [];

        const map = {};
        items.forEach((x) => {
          if (x?.requestId) map[Number(x.requestId)] = x;
        });
        setReviewMap(map);
      } catch (e) {
        console.log("GET /reviews/client not available (ok for MVP):", e);
        setReviewMap({});
      }

      await hydrateWorkers(allReqs);

      // Ensure drafts exist for client-confirmed + assigned requests.
      setReviewDraft((prev) => {
        const next = { ...prev };
        allReqs.forEach((r) => {
          const isCompleted = ["client_confirmed", "reviewed", "completed"].includes(
            r.statusKey || "",
          ) && Boolean(r.archivedAt || r.isArchived);
          const assignedUserId = Number(r.assignedWorkerUserId || 0) || null;
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
      requestApplicantIds(r).forEach((n) => needed.add(n));
      const assigned = Number(r.assignedWorkerUserId);
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

  function requestAllows(request, action) {
    return Array.isArray(request?.allowedActions) && request.allowedActions.includes(action);
  }

  function canUnassignWorker(request) {
    return requestAllows(request, "unassign");
  }

  async function unassignWorker(requestId) {
    try {
      setActionMsg("");
      setUnassigningId(requestId);
      await apiPost(`/requests/${requestId}/unassign`, {});
      setActionMsg(`Майсторът е премахнат от заявка #${requestId}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setActionMsg(err?.response?.data?.message || "Не успях да премахна майстора.");
    } finally {
      setUnassigningId(null);
    }
  }

  async function confirmWork(requestId) {
    try {
      setActionMsg("");
      await apiPost(`/requests/${requestId}/client-confirm`, {});
      setActionMsg(`Потвърди завършената работа по заявка #${requestId}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setActionMsg(err?.response?.data?.message || "Не успях да потвърдя работата.");
    }
  }

  // Create review after the client confirms the finished work.
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

  const requestHistorySorted = useMemo(() => {
    return [...requestHistory].sort((a, b) => new Date(b.completedAt || b.archivedAt || b.created_at) - new Date(a.completedAt || a.archivedAt || a.created_at));
  }, [requestHistory]);

  const visibleRequests = useMemo(
    () =>
      activeTab === "history"
        ? requestHistorySorted.map((request) => ({ ...request, _archiveScope: "history" }))
        : requestsSorted.map((request) => ({ ...request, _archiveScope: "active" })),
    [activeTab, requestsSorted, requestHistorySorted],
  );

  if (loading) {
    return <div className="text-white text-center pt-32">Зареждане...</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-78px)] text-white">
      <ClientProfileSidebar activeTab={activeTab} onSelect={setActiveTab} />

      <main className="min-w-0 flex-1 px-4 pb-20 pt-24 sm:px-7 lg:ml-64 lg:px-10 lg:pt-12">
        {["requests", "history"].includes(activeTab) && (
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <h1 className="text-3xl font-extrabold sm:text-4xl">{activeTab === "history" ? "История" : "Моите заявки"}</h1>

              {activeTab === "requests" && <div className="flex flex-wrap gap-3">
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
              </div>}
            </div>

            {actionMsg && <div className="mb-4 text-yellow-300 font-bold">{actionMsg}</div>}

            {visibleRequests.length === 0 ? (
              <p className="text-gray-400">Нямате заявки.</p>
            ) : (
              <div className="space-y-6">
                {visibleRequests.map((r) => {
                  const appliedList = requestApplicantIds(r);
                  const assignedUserId = Number(r.assignedWorkerUserId || 0) || null;

                  const statusKey = r.statusKey || "";
                  const canConfirmWork = requestAllows(r, "confirm_completion");
                  const isCompleted =
                    ["client_confirmed", "reviewed", "completed"].includes(
                      r.lifecycleStatusKey || statusKey,
                    ) && Boolean(r.archivedAt || r.isArchived);
                  const canUnassign = assignedUserId && canUnassignWorker(r);
                  const lockedAfterConfirm =
                    assignedUserId &&
                    !["worker_selected", "assigned"].includes(statusKey) &&
                    !["completed", "canceled", "archived"].includes(statusKey);
                  const canChooseCandidate = !assignedUserId && requestAllows(r, "assign");
                  const reviewedItem = reviewMap?.[Number(r.id)] || null;
                  const alreadyReviewed = !!reviewedItem || statusKey === "reviewed";
                  const showReviewForm = isCompleted && assignedUserId && !alreadyReviewed;

                  const draft = reviewDraft[r.id] || { rating: 5, comment: "" };
                  const ratingValue = safeRatingValue(draft.rating);
                  const msg = reviewMsg[r.id] || "";
                  const saving = !!reviewSaving[r.id];

                  return (
                    <div key={`${r._archiveScope}-${r.id}`} className="bricky-card overflow-hidden rounded-[20px] p-5 sm:p-8">
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
                            <span className={`inline-flex min-h-9 items-center rounded-xl border px-4 text-sm font-extrabold ${isCompleted ? "border-green-400/20 bg-green-400/10 text-green-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"}`}>{r.statusLabel || statusKey}</span>
                          </div>
                          <div className="mt-3 text-sm text-slate-400">
                            {assignedUserId ? <><span>Избран майстор: </span><span className="font-bold text-green-300">{workersMap[assignedUserId]?.fullName || `userId ${assignedUserId}`}</span></> : "Няма избран майстор"}
                          </div>
                          {canUnassign && (
                            <button
                              type="button"
                              onClick={() => unassignWorker(r.id)}
                              disabled={unassigningId === r.id}
                              className={
                                unassigningId === r.id
                                  ? "mt-3 rounded-lg bg-gray-700 px-4 py-2 text-sm font-bold text-gray-300 cursor-not-allowed"
                                  : "mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700"
                              }
                            >
                              {unassigningId === r.id ? "Премахвам..." : "Премахни майстора"}
                            </button>
                          )}
                          {lockedAfterConfirm && (
                            <p className="mt-3 max-w-sm text-sm font-semibold text-amber-200 md:ml-auto">
                              Майсторът е потвърдил поръчката. За прекратяване се свържете с администратор.
                            </p>
                          )}
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

                      {canConfirmWork && assignedUserId && (
                        <div className="mt-6 rounded-xl border border-green-500/30 bg-green-950/25 p-4">
                          <h3 className="font-bold text-lg text-green-200">Майсторът е маркирал работата като готова</h3>
                          <p className="mt-2 text-sm text-slate-300">Потвърди само ако работата наистина е приключена и си я приел.</p>
                          <button
                            type="button"
                            onClick={() => confirmWork(r.id)}
                            className="mt-4 rounded-lg bg-green-600 px-5 py-3 font-bold hover:bg-green-700"
                          >
                            Потвърждавам работата
                          </button>
                        </div>
                      )}

                      {/* ✅ REVIEW SECTION */}
                      {(isCompleted || alreadyReviewed) && assignedUserId && (
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
                                        <strong>Описание:</strong> {w.description || "—"}
                                      </div>

                                      <div className="flex gap-2 mt-3">
                                        <a
                                          href={
                                            canChooseCandidate
                                              ? `/worker-preview?requestId=${r.id}&userId=${workerUserId}`
                                              : `/worker-preview?userId=${workerUserId}`
                                          }
                                          className="inline-block bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded font-bold"
                                        >
                                          Виж профил
                                        </a>

                                        {canChooseCandidate && (
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
              <ProfileField label="Име" value={client.name || "Не е добавено"} />
              <ProfileField label="Телефон" value={client.phone || "Не е добавен"} />
              <ProfileField label="Имейл" value={client.email || "Не е добавен"} />
              <ProfileField label="Основен адрес" value={client.address || "Не е добавен"} />
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <AccountSettingsPanel
            onProfileSaved={(account) =>
              setClient({
                name: account.profile?.name || "",
                email: account.email || "",
                phone: account.profile?.phone || "",
                address: account.profile?.address || "",
              })
            }
          />
        )}
      </main>
    </div>
  );
}

function ProfileField({ label, value }) {
  return <div className="rounded-xl border border-slate-400/15 bg-slate-950/25 p-5"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-2 font-semibold text-slate-100">{value}</div></div>;
}

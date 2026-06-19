// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../services/api";
import LogoutButton from "../components/LogoutButton";

function formatBG(dateStr) {
  try {
    return new Date(dateStr).toLocaleString("bg-BG");
  } catch {
    return dateStr || "—";
  }
}

const CATEGORIES = ["ВиК", "Електро", "Шпакловка и боя", "Плочки"];

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
    category: "ВиК",
    description: "",
  });

  const [createError, setCreateError] = useState("");
  const [createOk, setCreateOk] = useState("");
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
        const clientRes = await apiGet("/requests/client");
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

  async function createRequest() {
    setCreateError("");
    setCreateOk("");
    try {
      const res = await apiPost("/requests", {
        clientName: newReq.clientName,
        email: newReq.email,
        phone: newReq.phone,
        address: newReq.address,
        category: newReq.category,
        description: newReq.description,
      });

      setCreateOk(`Заявката е създадена! (#${res.data?.id ?? "?"})`);
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
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 pt-24 fixed h-full">
        <nav className="flex flex-col gap-4 px-6 text-sm">
          {[
            ["requests", "Моите заявки"],
            ["create", "Направи заявка"],
            ["profile", "Профил"],
            ["settings", "Настройки"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={activeTab === key ? "text-red-400 font-bold" : "hover:text-red-300"}
            >
              {label}
            </button>
          ))}

          <div className="mt-4">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="flex-1 ml-64 pt-24 px-10 pb-20">
        {activeTab === "requests" && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-8">
              <h1 className="text-3xl font-bold">Моите заявки</h1>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab("create")}
                  className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-bold"
                >
                  Направи заявка
                </button>

                <button
                  onClick={loadData}
                  className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
                >
                  Обнови
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
                    <div key={r.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold">
                            #{r.id} • {r.category}
                          </h2>
                          <p className="text-gray-400 text-sm mt-1">Създадена: {formatBG(r.created_at)}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-300">
                            Статус:
                            <span className="ml-2 text-red-400 font-bold">{r.status}</span>
                          </div>

                          {assignedUserId ? (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-300">Избран майстор:</span>{" "}
                              <span className="text-green-400 font-bold">
                                {workersMap[assignedUserId]?.fullName || `userId ${assignedUserId}`}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-gray-400">Няма избран майстор</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <p className="text-gray-300">
                          <strong>Адрес:</strong> {r.address || "—"}
                        </p>
                        <p className="text-gray-300">
                          <strong>Описание:</strong> {r.description || "—"}
                        </p>
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

                      <div className="mt-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
                        <h3 className="font-bold text-lg">Кандидати ({appliedList.length})</h3>

                        {appliedList.length === 0 ? (
                          <p className="text-gray-400 mt-2">Още няма кандидатствали майстори.</p>
                        ) : (
                          <div className="mt-3 grid md:grid-cols-2 gap-3">
                            {appliedList.map((workerUserId, idx) => {
                              const w = workersMap[workerUserId];
                              const key = `${r.id}:${workerUserId}`;
                              const isAssigned = assignedUserId === workerUserId;

                              return (
                                <div
                                  key={`${r.id}-${workerUserId}-${idx}`}
                                  className="bg-gray-800 border border-gray-700 rounded-xl p-4"
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
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Направи заявка</h1>

            {createError && <div className="mb-4 text-red-400 font-bold">{createError}</div>}
            {createOk && <div className="mb-4 text-green-400 font-bold">{createOk}</div>}

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  value={newReq.clientName}
                  onChange={(e) => setNewReq((p) => ({ ...p, clientName: e.target.value }))}
                  className="p-3 rounded bg-gray-900 border border-gray-700"
                  placeholder="Име"
                />
                <input
                  value={newReq.phone}
                  onChange={(e) => setNewReq((p) => ({ ...p, phone: e.target.value }))}
                  className="p-3 rounded bg-gray-900 border border-gray-700"
                  placeholder="Телефон"
                />
              </div>

              <input
                value={newReq.email}
                onChange={(e) => setNewReq((p) => ({ ...p, email: e.target.value }))}
                className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
                placeholder="Имейл"
              />

              <input
                value={newReq.address}
                onChange={(e) => setNewReq((p) => ({ ...p, address: e.target.value }))}
                className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
                placeholder="Адрес"
              />

              <select
                value={newReq.category}
                onChange={(e) => setNewReq((p) => ({ ...p, category: e.target.value }))}
                className="p-3 rounded bg-gray-900 border border-gray-700 w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <textarea
                value={newReq.description}
                onChange={(e) => setNewReq((p) => ({ ...p, description: e.target.value }))}
                className="p-3 rounded bg-gray-900 border border-gray-700 w-full h-32"
                placeholder="Опиши проблема..."
              />

              <button
                onClick={createRequest}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold"
              >
                Създай заявка
              </button>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Моят профил</h1>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-gray-300">
              Ако `/client/me` е 404, този таб е placeholder. Заявките и създаването работят и без него.
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="text-center mt-10">
            <h1 className="text-3xl font-bold mb-4">Настройки</h1>
            <p className="text-gray-400">(placeholder)</p>
          </div>
        )}
      </main>
    </div>
  );
}

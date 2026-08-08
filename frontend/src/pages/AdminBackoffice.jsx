import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, LogOut, Plus, RefreshCw, Save, X } from "lucide-react";
import { apiGet, apiPost } from "../services/api";
import { mediaUrl, photoMediaUrl } from "../utils/mediaUrls";

const tabs = [
  { key: "users", label: "Потребители" },
  { key: "workers", label: "Майстори" },
  { key: "requests", label: "Заявки" },
  { key: "media", label: "Снимки" },
  { key: "categories", label: "Категории" },
  { key: "pricing", label: "Цени" },
  { key: "referrals", label: "Referrals" },
  { key: "audit", label: "Audit" },
];

export default function AdminBackoffice() {
  const [activeTab, setActiveTab] = useState("users");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [requestTimeline, setRequestTimeline] = useState(null);

  const endpoint = useMemo(() => `/admin/${activeTab}`, [activeTab]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet(endpoint);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Неуспешно зареждане");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setMediaPreview(null);
        setRequestTimeline(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function run(action) {
    setError("");
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || "Действието не беше изпълнено");
      return false;
    }
  }

  async function openRequestTimeline(requestId) {
    setError("");
    try {
      const res = await apiGet(`/admin/requests/${requestId}/timeline`);
      setRequestTimeline(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Timeline-ът не можа да се зареди");
    }
  }

  function openMediaPreview(media) {
    if (!media?.url) return;
    setMediaPreview(media);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    window.location.assign("/auth");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bricky Backoffice</h1>
            <p className="mt-1 text-sm text-slate-400">Sprint 3 v2 data core operations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold">
              <RefreshCw size={16} aria-hidden="true" />
              Обнови
            </button>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-100">
              <LogOut size={16} aria-hidden="true" />
              Изход
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                activeTab === tab.key ? "bg-red-600 text-white" : "bg-slate-900 text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-md border border-red-500/40 bg-red-950/40 p-3 text-red-200">{error}</div>}
        {loading ? <div className="text-slate-400">Зареждане...</div> : null}

        {!loading && activeTab === "users" && <UsersTable items={items} run={run} />}
        {!loading && activeTab === "workers" && <WorkersTable items={items} run={run} />}
        {!loading && activeTab === "requests" && (
          <RequestsTable items={items} run={run} onPreview={openMediaPreview} onTimeline={openRequestTimeline} />
        )}
        {!loading && activeTab === "media" && <MediaTable items={items} run={run} onPreview={openMediaPreview} />}
        {!loading && activeTab === "categories" && <CategoriesTable items={items} run={run} />}
        {!loading && activeTab === "pricing" && <PricingTable items={items} run={run} />}
        {!loading && activeTab === "referrals" && <ReferralsTable items={items} run={run} />}
        {!loading && activeTab === "audit" && <AuditTable items={items} />}
      </div>

      {mediaPreview && <MediaPreviewModal media={mediaPreview} onClose={() => setMediaPreview(null)} />}
      {requestTimeline && <RequestTimelineModal data={requestTimeline} onClose={() => setRequestTimeline(null)} />}
    </main>
  );
}

function UsersTable({ items, run }) {
  return (
    <DataTable
      columns={["ID", "Име", "Email", "Роля", "Статус", "Действия"]}
      rows={items.map((user) => [
        user.id,
        user.name || "-",
        user.email || "-",
        user.role || "-",
        user.status || "active",
        <div className="flex gap-2" key={user.id}>
          <SmallButton onClick={() => run(() => apiPost(`/admin/users/${user.id}/status`, { status: "blocked" }))}>
            Block
          </SmallButton>
          <SmallButton onClick={() => run(() => apiPost(`/admin/users/${user.id}/status`, { status: "active" }))}>
            Active
          </SmallButton>
        </div>,
      ])}
    />
  );
}

function WorkersTable({ items, run }) {
  return (
    <DataTable
      columns={["User ID", "Име", "Град", "Акаунт", "Одобрение", "Стена", "Действия"]}
      rows={items.map((worker) => [
        worker.workerUserId || worker.userId || worker.id,
        worker.publicName || worker.fullName || "-",
        worker.city || "-",
        worker.userStatus || "-",
        worker.approvalStatus || (worker.isApproved ? "approved" : "pending"),
        worker.visibilityStatus === "public" ? "Показан" : "Скрит",
        <div className="flex flex-wrap gap-2" key={worker.workerUserId || worker.userId || worker.id}>
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(`/admin/workers/${worker.workerUserId || worker.userId || worker.id}/approval`, {
                  approvalStatus: "approved",
                }),
              )
            }
          >
            Approve
          </SmallButton>
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(`/admin/workers/${worker.workerUserId || worker.userId || worker.id}/approval`, {
                  approvalStatus: "suspended",
                }),
              )
            }
          >
            Suspend
          </SmallButton>
          <SmallButton
            disabled={(worker.approvalStatus || "pending") !== "approved"}
            onClick={() =>
              run(() =>
                apiPost(`/admin/workers/${worker.workerUserId || worker.userId || worker.id}/wall-visibility`, {
                  listed: worker.visibilityStatus !== "public",
                  reason: "manual_wall_management",
                }),
              )
            }
          >
            {worker.visibilityStatus === "public" ? "Махни от стената" : "Добави на стената"}
          </SmallButton>
        </div>,
      ])}
    />
  );
}

function RequestsTable({ items, run, onPreview, onTimeline }) {
  return (
    <DataTable
      columns={["ID", "Категория", "Клиент", "Статус", "Майстор", "Снимки", "Действия"]}
      rows={items.map((request) => {
        const status = request.statusKey || "-";
        const canModerate = ["draft", "pending_admin"].includes(status) && !request.archivedAt;
        const isCompleted = status === "completed" && Boolean(request.archivedAt || request.isArchived);
        const requestPhotos = Array.isArray(request.beforePhotos) ? request.beforePhotos : request.photos || [];
        const hasPendingPhotos = requestPhotos.some((photo) =>
          !["approved", "rejected"].includes(String(photo.moderationStatus || "pending").toLowerCase()),
        );

        return [
          request.id,
          request.categoryKey || request.category || "-",
          request.clientName || "-",
          status,
          request.assignedWorkerUserId || "-",
          <RequestPhotoStrip request={request} key={`photos-${request.id}`} onPreview={onPreview} run={run} />,
          <div className="flex flex-wrap gap-2" key={`actions-${request.id}`}>
            <SmallButton onClick={() => onTimeline?.(request.id)} icon={<Clock3 size={14} />}>
              Timeline
            </SmallButton>
            {canModerate ? (
              <>
              <SmallButton
                disabled={hasPendingPhotos}
                title={hasPendingPhotos ? "Review every photo before publishing the request" : undefined}
                onClick={() => run(() => apiPost(`/admin/requests/${request.id}/status`, { status: "published" }))}
              >
                Одобри
              </SmallButton>
              <SmallButton onClick={() => run(() => apiPost(`/admin/requests/${request.id}/status`, { status: "archived" }))}>
                Архивирай
              </SmallButton>
              </>
            ) : (
              <span className="self-center text-xs font-semibold uppercase text-slate-500">
              {isCompleted ? "read-only completed" : "read-only"}
              </span>
            )}
          </div>,
        ];
      })}
    />
  );
}

function CategoriesTable({ items, run }) {
  return (
    <DataTable
      columns={["Категория", "Подредба", "Статус", "Дейности", "Действия"]}
      rows={items.map((category) => [
        <div key={`category-${category.categoryKey}`}>
          <div className="font-semibold text-white">{category.label}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{category.categoryKey}</div>
        </div>,
        category.sortOrder,
        <StatusBadge key={`status-${category.categoryKey}`} active={category.isActive} />,
        <div className="flex min-w-72 flex-col gap-2" key={`activities-${category.categoryKey}`}>
          {(category.activities || []).length ? (
            category.activities.map((activity) => (
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 last:border-0 last:pb-0" key={activity.activityKey}>
                <div>
                  <div className="font-medium">{activity.label}</div>
                  <div className="text-xs text-slate-500">
                    {activity.activityKey}
                    {activity.unitType ? ` • ${activity.unitType}` : ""}
                  </div>
                </div>
                <SmallButton
                  onClick={() =>
                    run(() =>
                      apiPost(`/admin/categories/${category.categoryKey}/activities/${activity.activityKey}`, {
                        isActive: !activity.isActive,
                        reason: "admin_catalog_update",
                      }),
                    )
                  }
                >
                  {activity.isActive ? "Изключи" : "Включи"}
                </SmallButton>
              </div>
            ))
          ) : (
            <span className="text-slate-500">Няма дейности</span>
          )}
        </div>,
        <SmallButton
          key={`toggle-${category.categoryKey}`}
          onClick={() =>
            run(() =>
              apiPost(`/admin/categories/${category.categoryKey}`, {
                isActive: !category.isActive,
                reason: "admin_catalog_update",
              }),
            )
          }
        >
          {category.isActive ? "Изключи" : "Включи"}
        </SmallButton>,
      ])}
    />
  );
}

function PricingTable({ items, run }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    version: "",
    categoryKey: "",
    activityKey: "",
    laborMin: "",
    laborMax: "",
    materialMin: "",
    materialMax: "",
    currency: "EUR",
  });

  useEffect(() => {
    let active = true;
    apiGet("/admin/categories")
      .then((res) => {
        if (!active) return;
        const next = Array.isArray(res.data) ? res.data : [];
        setCategories(next);
        setForm((current) => {
          if (current.categoryKey || !next.length) return current;
          const categoryKey = next[0].categoryKey;
          return {
            ...current,
            categoryKey,
            activityKey: next[0].activities?.[0]?.activityKey || "",
          };
        });
      })
      .catch(() => setCategories([]));
    return () => {
      active = false;
    };
  }, []);

  const selectedCategory = categories.find((category) => category.categoryKey === form.categoryKey);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editRule(rule) {
    const stamp = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replace("T", "").slice(0, 12);
    setForm({
      version: `admin-${stamp}`,
      categoryKey: rule.categoryKey,
      activityKey: rule.activityKey,
      laborMin: String(rule.laborMin ?? ""),
      laborMax: String(rule.laborMax ?? ""),
      materialMin: rule.materialMin == null ? "" : String(rule.materialMin),
      materialMax: rule.materialMax == null ? "" : String(rule.materialMax),
      currency: rule.currency || "EUR",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event) {
    event.preventDefault();
    const succeeded = await run(() =>
      apiPost("/admin/pricing", {
        ...form,
        reason: "admin_pricing_version",
      }),
    );
    if (succeeded) {
      setForm((current) => ({
        ...current,
        version: "",
        laborMin: "",
        laborMax: "",
        materialMin: "",
        materialMax: "",
      }));
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="border-b border-slate-800 pb-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus size={18} className="text-cyan-400" aria-hidden="true" />
          <h2 className="text-lg font-bold">Нова или коригирана ценова версия</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <AdminInput label="Версия" value={form.version} onChange={(value) => setField("version", value)} placeholder="2026-q3" required />
          <AdminSelect
            label="Категория"
            value={form.categoryKey}
            onChange={(value) => {
              const category = categories.find((item) => item.categoryKey === value);
              setForm((current) => ({
                ...current,
                categoryKey: value,
                activityKey: category?.activities?.[0]?.activityKey || "",
              }));
            }}
            options={categories.map((category) => ({ value: category.categoryKey, label: category.label }))}
          />
          <AdminSelect
            label="Дейност"
            value={form.activityKey}
            onChange={(value) => setField("activityKey", value)}
            options={(selectedCategory?.activities || []).map((activity) => ({ value: activity.activityKey, label: activity.label }))}
          />
          <AdminInput label="Валута" value={form.currency} onChange={(value) => setField("currency", value.toUpperCase())} maxLength={3} required />
          <AdminInput label="Труд от" type="number" value={form.laborMin} onChange={(value) => setField("laborMin", value)} min="0" step="0.01" required />
          <AdminInput label="Труд до" type="number" value={form.laborMax} onChange={(value) => setField("laborMax", value)} min="0" step="0.01" required />
          <AdminInput label="Материали от" type="number" value={form.materialMin} onChange={(value) => setField("materialMin", value)} min="0" step="0.01" />
          <AdminInput label="Материали до" type="number" value={form.materialMax} onChange={(value) => setField("materialMax", value)} min="0" step="0.01" />
        </div>
        <button
          type="submit"
          disabled={!form.version || !form.categoryKey || !form.activityKey}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={16} aria-hidden="true" />
          Запази версията
        </button>
      </form>

      <DataTable
        columns={["ID", "Версия", "Категория / дейност", "Труд", "Материали", "Валута", "Статус", "Действия"]}
        rows={items.map((rule) => [
          rule.id,
          rule.version,
          <div key={`rule-${rule.id}`}>
            <div>{rule.categoryKey}</div>
            <div className="text-xs text-slate-500">{rule.activityKey}</div>
          </div>,
          `${rule.laborMin} – ${rule.laborMax}`,
          rule.materialMin == null ? "–" : `${rule.materialMin} – ${rule.materialMax}`,
          rule.currency,
          <StatusBadge key={`pricing-status-${rule.id}`} active={rule.isActive} />,
          <div className="flex gap-2" key={`pricing-action-${rule.id}`}>
            <SmallButton onClick={() => editRule(rule)}>Коригирай</SmallButton>
            <SmallButton
              onClick={() =>
                run(() =>
                  apiPost(`/admin/pricing/${rule.id}/status`, {
                    isActive: !rule.isActive,
                    reason: "admin_pricing_status",
                  }),
                )
              }
            >
              {rule.isActive ? "Деактивирай" : "Активирай"}
            </SmallButton>
          </div>,
        ])}
      />
    </div>
  );
}

function RequestPhotoStrip({ request, onPreview, run }) {
  const photos = Array.isArray(request.beforePhotos) && request.beforePhotos.length ? request.beforePhotos : request.photos || [];
  if (!photos.length) return <span className="text-slate-500">няма</span>;

  return (
    <div className="flex max-h-64 max-w-xs flex-wrap gap-2 overflow-y-auto pr-1">
      {photos.map((photo) => {
        const url = photoMediaUrl(photo);
        if (!url) return null;

        const moderationStatus = photo.moderationStatus || "pending";

        return (
          <div className="w-24 rounded border border-slate-700 bg-slate-950 p-1" key={photo.id || url}>
            <button
              type="button"
              onClick={() =>
                onPreview?.({
                  url,
                  title: `Заявка #${request.id}`,
                  subtitle: request.categoryKey || request.category || "Снимка към заявка",
                  status: moderationStatus,
                })
              }
              className="block w-full overflow-hidden rounded"
              title="Отвори снимката"
            >
              <img src={url} alt="" className="h-14 w-full object-cover" />
            </button>
            <div className="mt-1 truncate text-[10px] font-semibold uppercase text-slate-400" title={moderationStatus}>
              {moderationStatus}
            </div>
            {photo.id && !["approved", "rejected"].includes(String(moderationStatus).toLowerCase()) && (
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => run(() => apiPost(`/admin/media/${photo.id}/moderation`, { moderationStatus: "approved" }))}
                  className="rounded bg-emerald-700 px-1 py-1 text-[10px] font-bold text-white hover:bg-emerald-600"
                  title="Одобри снимката"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => run(() => apiPost(`/admin/media/${photo.id}/moderation`, { moderationStatus: "rejected" }))}
                  className="rounded bg-red-800 px-1 py-1 text-[10px] font-bold text-white hover:bg-red-700"
                  title="Отхвърли снимката"
                >
                  X
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MediaTable({ items, run, onPreview }) {
  return (
    <DataTable
      columns={["ID", "Kind", "Owner", "Request", "Preview", "Moderation"]}
      rows={items.map((media) => {
        const url = mediaUrl(media.publicUrl || media.url || media.storageKey);

        return [
          media.id,
          media.kind,
          media.ownerUserId,
          media.requestId || "-",
          url ? (
            <div key={media.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onPreview?.({
                    url,
                    title: `${media.kind || "media"} #${media.id}`,
                    subtitle: `Owner ${media.ownerUserId || "-"}${media.requestId ? ` • Request ${media.requestId}` : ""}`,
                    status: media.moderationStatus,
                  })
                }
                className="overflow-hidden rounded border border-slate-700 bg-slate-950"
                title="Отвори снимката"
              >
                <img src={url} alt="" className="h-14 w-20 object-cover" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onPreview?.({
                    url,
                    title: `${media.kind || "media"} #${media.id}`,
                    subtitle: `Owner ${media.ownerUserId || "-"}${media.requestId ? ` • Request ${media.requestId}` : ""}`,
                    status: media.moderationStatus,
                  })
                }
                className="text-blue-300 underline"
              >
                отвори
              </button>
            </div>
          ) : (
            <span key={media.id} className="text-slate-500">
              няма URL
            </span>
          ),
          <div className="flex gap-2" key={`moderation-${media.id}`}>
            <span>{media.moderationStatus}</span>
            <SmallButton onClick={() => run(() => apiPost(`/admin/media/${media.id}/moderation`, { moderationStatus: "approved" }))}>
              OK
            </SmallButton>
            <SmallButton onClick={() => run(() => apiPost(`/admin/media/${media.id}/moderation`, { moderationStatus: "rejected" }))}>
              Reject
            </SmallButton>
          </div>,
        ];
      })}
    />
  );
}

function MediaPreviewModal({ media, onClose }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Затвори прегледа" onClick={onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-bold text-white">{media.title || "Снимка"}</div>
            <div className="mt-1 text-sm text-slate-400">
              {media.subtitle || "Медиа преглед"} {media.status ? `• ${media.status}` : ""}
            </div>
          </div>

          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            <X size={16} aria-hidden="true" />
            Затвори
          </button>
        </div>

        <div className="flex min-h-[55vh] items-center justify-center bg-slate-950 p-4">
          {failed ? (
            <div className="max-w-xl rounded-xl border border-red-500/40 bg-red-950/40 p-5 text-center text-red-100">
              <div className="font-bold">Не успях да заредя снимката.</div>
              <div className="mt-2 break-all text-sm text-red-200/80">{media.url}</div>
            </div>
          ) : (
            <img
              src={media.url}
              alt={media.title || "media preview"}
              className="max-h-[74vh] max-w-full rounded-lg object-contain"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RequestTimelineModal({ data, onClose }) {
  const request = data?.request || {};
  const events = Array.isArray(data?.events) ? data.events : [];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Затвори timeline" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Timeline на заявка #{request.id}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {request.categoryKey || request.category || "Без категория"} • {request.statusLabel || request.statusKey || "–"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700">
            <X size={16} aria-hidden="true" />
            Затвори
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {events.length ? (
            <ol className="relative border-l border-cyan-500/40 pl-6">
              {events.map((event) => (
                <li className="relative pb-6 last:pb-0" key={event.id}>
                  <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-400" />
                  <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                    <div className="font-semibold text-white">{event.eventType}</div>
                    <time className="text-xs text-slate-500">
                      {event.createdAt ? new Date(event.createdAt).toLocaleString("bg-BG") : "–"}
                    </time>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Actor: {event.actorUserId || "system"}</div>
                  {event.metadataJson && Object.keys(event.metadataJson).length ? (
                    <pre className="mt-3 overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                      {JSON.stringify(event.metadataJson, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="border border-slate-800 p-5 text-slate-400">Няма записани събития.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferralsTable({ items, run }) {
  return (
    <DataTable
      columns={["ID", "Code", "Type", "Referrer", "Referred", "Status", "Progress", "Reward", "Actions"]}
      rows={items.map((referral) => [
        referral.id,
        referral.code,
        referral.type,
        referral.referrerUserId,
        referral.referredUserId || "-",
        referral.status,
        `${referral.qualifiedRepairCount || 0}/2`,
        (referral.rewards || []).find((reward) => reward.status === "active")?.endsAt
          ? new Date((referral.rewards || []).find((reward) => reward.status === "active").endsAt).toLocaleDateString("bg-BG")
          : "-",
        <div className="flex flex-wrap gap-2" key={referral.id}>
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(`/admin/referrals/${referral.id}/reject`, {
                  reason: "admin_review",
                }),
              )
            }
          >
            Reject
          </SmallButton>
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(`/admin/referrals/${referral.id}/revoke-reward`, {
                  reason: "admin_review",
                }),
              )
            }
          >
            Revoke
          </SmallButton>
          <SmallButton onClick={() => run(() => apiPost(`/admin/referrals/${referral.id}/restore-reward`, { reason: "admin_restore" }))}>
            Restore
          </SmallButton>
        </div>,
      ])}
    />
  );
}

function AuditTable({ items }) {
  return (
    <DataTable
      columns={["ID", "Admin", "Action", "Target", "Reason", "Date"]}
      rows={items.map((log) => [
        log.id,
        log.adminUserId,
        log.action,
        `${log.targetType || "-"} #${log.targetId || "-"}`,
        log.reason || "-",
        log.createdAt ? new Date(log.createdAt).toLocaleString("bg-BG") : "-",
      ])}
    />
  );
}

function DataTable({ columns, rows }) {
  if (!rows.length) return <div className="rounded-md border border-slate-800 p-5 text-slate-400">Няма записи.</div>;

  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-300">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row, index) => (
            <tr key={index} className="bg-slate-950">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top text-slate-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
      {active ? "активно" : "изключено"}
    </span>
  );
}

function AdminInput({ label, value, onChange, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-400">{label}</span>
      <input
        {...inputProps}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-500"
      />
    </label>
  );
}

function AdminSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-500"
      >
        {!options.length && <option value="">Няма опции</option>}
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SmallButton({ children, onClick, icon = null, disabled = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800"
    >
      {icon}
      {children}
    </button>
  );
}

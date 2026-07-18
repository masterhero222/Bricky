import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../services/api";

const tabs = [
  { key: "users", label: "Потребители" },
  { key: "workers", label: "Майстори" },
  { key: "requests", label: "Заявки" },
  { key: "media", label: "Снимки" },
  { key: "referrals", label: "Referrals" },
  { key: "audit", label: "Audit" },
];

export default function AdminBackoffice() {
  const [activeTab, setActiveTab] = useState("users");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const endpoint = useMemo(() => `/admin/${activeTab}`, [activeTab]);

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  async function run(action) {
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Действието не беше изпълнено");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bricky Backoffice</h1>
            <p className="mt-1 text-sm text-slate-400">Sprint 3 v2 data core operations</p>
          </div>
          <button onClick={load} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold">
            Обнови
          </button>
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
        {!loading && activeTab === "requests" && <RequestsTable items={items} run={run} />}
        {!loading && activeTab === "media" && <MediaTable items={items} run={run} />}
        {!loading && activeTab === "referrals" && <ReferralsTable items={items} run={run} />}
        {!loading && activeTab === "audit" && <AuditTable items={items} />}
      </div>
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
      columns={["User ID", "Име", "Град", "Approval", "Visibility", "Действия"]}
      rows={items.map((worker) => [
        worker.workerUserId || worker.userId || worker.id,
        worker.publicName || worker.fullName || "-",
        worker.city || "-",
        worker.approvalStatus || (worker.isApproved ? "approved" : "pending"),
        worker.visibilityStatus || "-",
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
        </div>,
      ])}
    />
  );
}

function RequestsTable({ items, run }) {
  return (
    <DataTable
      columns={["ID", "Категория", "Клиент", "Статус", "Майстор", "Снимки", "Действия"]}
      rows={items.map((request) => [
        request.id,
        request.categoryKey || request.category || "-",
        request.clientName || "-",
        request.statusKey || request.status || "-",
        request.assignedWorkerUserId || request.assignedWorkerId || "-",
        <RequestPhotoStrip request={request} key={`photos-${request.id}`} />,
        <div className="flex gap-2" key={`actions-${request.id}`}>
          <SmallButton onClick={() => run(() => apiPost(`/admin/requests/${request.id}/status`, { status: "published" }))}>
            Одобри
          </SmallButton>
          <SmallButton onClick={() => run(() => apiPost(`/admin/requests/${request.id}/status`, { status: "archived" }))}>
            Архивирай
          </SmallButton>
        </div>,
      ])}
    />
  );
}

function RequestPhotoStrip({ request }) {
  const photos = Array.isArray(request.beforePhotos) && request.beforePhotos.length ? request.beforePhotos : request.photos || [];
  if (!photos.length) return <span className="text-slate-500">няма</span>;

  return (
    <div className="flex max-w-xs flex-wrap gap-2">
      {photos.slice(0, 4).map((photo) => (
        <a
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded border border-slate-700 bg-slate-950"
          key={photo.id || photo.url}
          title={photo.moderationStatus || "pending"}
        >
          <img src={photo.url} alt="" className="h-12 w-16 object-cover" />
        </a>
      ))}
      {photos.length > 4 && <span className="self-center text-xs text-slate-400">+{photos.length - 4}</span>}
    </div>
  );
}

function MediaTable({ items, run }) {
  return (
    <DataTable
      columns={["ID", "Kind", "Owner", "Request", "URL", "Moderation"]}
      rows={items.map((media) => [
        media.id,
        media.kind,
        media.ownerUserId,
        media.requestId || "-",
        <a key={media.id} className="text-blue-300 underline" href={media.publicUrl} target="_blank" rel="noreferrer">
          отвори
        </a>,
        <div className="flex gap-2" key={media.id}>
          <span>{media.moderationStatus}</span>
          <SmallButton onClick={() => run(() => apiPost(`/admin/media/${media.id}/moderation`, { moderationStatus: "approved" }))}>
            OK
          </SmallButton>
          <SmallButton onClick={() => run(() => apiPost(`/admin/media/${media.id}/moderation`, { moderationStatus: "rejected" }))}>
            Reject
          </SmallButton>
        </div>,
      ])}
    />
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

function SmallButton({ children, onClick }) {
  return (
    <button onClick={onClick} className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700">
      {children}
    </button>
  );
}

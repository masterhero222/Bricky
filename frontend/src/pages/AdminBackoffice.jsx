import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { apiGet, apiPost } from '../services/api';
import { mediaUrl, photoMediaUrl } from '../utils/mediaUrls';
import {
  CompletionBadge,
  WorkerAdminFilters,
  WorkerDetailModal,
} from '../components/admin/WorkerAdminOperations';

const tabs = [
  { key: 'users', label: 'Потребители' },
  { key: 'workers', label: 'Майстори' },
  { key: 'requests', label: 'Заявки' },
  { key: 'media', label: 'Снимки' },
  { key: 'categories', label: 'Категории' },
  { key: 'pricing', label: 'Цени' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'reports', label: 'Сигнали' },
  { key: 'audit', label: 'Audit' },
];

const filterableTabs = new Set(['users', 'workers', 'requests', 'media']);
const ADMIN_PAGE_SIZE = 20;

function itemStatuses(tab, item) {
  if (tab === 'users') return [item.status || 'active'];
  if (tab === 'workers') {
    return [item.userStatus, item.approvalStatus, item.visibilityStatus].filter(
      Boolean,
    );
  }
  if (tab === 'requests')
    return [item.statusKey || item.status].filter(Boolean);
  if (tab === 'media') return [item.moderationStatus].filter(Boolean);
  return [];
}

export default function AdminBackoffice() {
  const [activeTab, setActiveTab] = useState('users');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [requestTimeline, setRequestTimeline] = useState(null);
  const [requestIntervention, setRequestIntervention] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [workerDetailLoading, setWorkerDetailLoading] = useState(false);
  const [workerDetailError, setWorkerDetailError] = useState('');
  const [workerDetailUserId, setWorkerDetailUserId] = useState(null);
  const [workerFilters, setWorkerFilters] = useState({
    incomplete: false,
    missingPhone: false,
    onboardingIncomplete: false,
    sort: 'newest',
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const endpoint = useMemo(() => {
    if (activeTab !== 'workers') return `/admin/${activeTab}`;
    const params = new URLSearchParams();
    if (workerFilters.incomplete) params.set('incomplete', 'true');
    if (workerFilters.missingPhone) params.set('missingPhone', 'true');
    if (workerFilters.onboardingIncomplete) {
      params.set('onboardingIncomplete', 'true');
    }
    params.set('sort', workerFilters.sort);
    return `/admin/workers?${params.toString()}`;
  }, [activeTab, workerFilters]);
  const availableStatuses = useMemo(
    () =>
      [
        ...new Set(items.flatMap((item) => itemStatuses(activeTab, item))),
      ].sort(),
    [activeTab, items],
  );
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('bg-BG');
    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        JSON.stringify(item)
          .toLocaleLowerCase('bg-BG')
          .includes(normalizedSearch);
      const matchesStatus =
        !statusFilter || itemStatuses(activeTab, item).includes(statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [activeTab, items, search, statusFilter]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ADMIN_PAGE_SIZE),
  );
  const visibleItems = useMemo(() => {
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return filteredItems.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filteredItems, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(endpoint);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Неуспешно зареждане');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setMediaPreview(null);
        setRequestTimeline(null);
        setRequestIntervention(null);
        setWorkerDetail(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function run(action) {
    setError('');
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || 'Действието не беше изпълнено');
      return false;
    }
  }

  async function openRequestTimeline(requestId) {
    setError('');
    try {
      const res = await apiGet(`/admin/requests/${requestId}/timeline`);
      setRequestTimeline(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Timeline-ът не можа да се зареди',
      );
    }
  }

  async function openWorkerDetail(workerUserId) {
    setWorkerDetailUserId(workerUserId);
    setWorkerDetailLoading(true);
    setWorkerDetailError('');
    setError('');
    try {
      const res = await apiGet(`/admin/workers/${workerUserId}`);
      setWorkerDetail(res.data);
    } catch (err) {
      setWorkerDetailError(
        err?.response?.data?.message ||
          'Детайлите за майстора не можаха да се заредят',
      );
    } finally {
      setWorkerDetailLoading(false);
    }
  }

  function openMediaPreview(media) {
    if (!media?.url) return;
    setMediaPreview(media);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    window.location.assign('/auth');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bricky Backoffice</h1>
            <p className="mt-1 text-sm text-slate-400">
              Sprint 3 v2 data core operations
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/knowledge" className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">
              <Plus size={16} /> Център за ремонти
            </Link>
            <Link to="/admin/privacy" className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-4 py-2 text-sm font-semibold text-cyan-200">
              <Save size={16} /> GDPR заявки
            </Link>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Обнови
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-100"
            >
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
                activeTab === tab.key
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-900 text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-950/40 p-3 text-red-200">
            {error}
          </div>
        )}
        {loading ? <div className="text-slate-400">Зареждане...</div> : null}

        {!loading && filterableTabs.has(activeTab) && (
          <AdminListControls
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            status={statusFilter}
            statuses={availableStatuses}
            onStatus={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            page={page}
            totalPages={totalPages}
            resultCount={filteredItems.length}
            onPage={setPage}
          />
        )}

        {!loading && activeTab === 'workers' && (
          <WorkerAdminFilters
            value={workerFilters}
            onChange={(next) => {
              setWorkerFilters(next);
              setPage(1);
            }}
          />
        )}

        {!loading && activeTab === 'users' && (
          <UsersTable items={visibleItems} run={run} />
        )}
        {!loading && activeTab === 'workers' && (
          <WorkersTable
            items={visibleItems}
            run={run}
            onDetails={openWorkerDetail}
          />
        )}
        {!loading && activeTab === 'requests' && (
          <RequestsTable
            items={visibleItems}
            run={run}
            onPreview={openMediaPreview}
            onTimeline={openRequestTimeline}
          />
        )}
        {!loading && activeTab === 'media' && (
          <MediaTable
            items={visibleItems}
            run={run}
            onPreview={openMediaPreview}
          />
        )}
        {!loading && activeTab === 'categories' && (
          <CategoriesTable items={items} run={run} />
        )}
        {!loading && activeTab === 'pricing' && (
          <PricingTable items={items} run={run} />
        )}
        {!loading && activeTab === 'referrals' && (
          <ReferralsTable items={items} run={run} />
        )}
        {!loading && activeTab === 'reports' && (
          <ReportsTable items={items} run={run} />
        )}
        {!loading && activeTab === 'audit' && <AuditTable items={items} />}
      </div>

      {mediaPreview && (
        <MediaPreviewModal
          media={mediaPreview}
          onClose={() => setMediaPreview(null)}
        />
      )}
      {(workerDetail || workerDetailLoading || workerDetailError) && (
        <WorkerDetailModal
          worker={workerDetail}
          loading={workerDetailLoading}
          error={workerDetailError}
          onRetry={() => openWorkerDetail(workerDetailUserId)}
          onClose={() => {
            setWorkerDetail(null);
            setWorkerDetailLoading(false);
            setWorkerDetailError('');
            setWorkerDetailUserId(null);
          }}
        />
      )}
      {requestTimeline && (
        <RequestTimelineModal
          data={requestTimeline}
          onClose={() => setRequestTimeline(null)}
          onIntervene={(action) =>
            setRequestIntervention({ request: requestTimeline.request, action })
          }
        />
      )}
      {requestIntervention && (
        <RequestInterventionModal
          request={requestIntervention.request}
          action={requestIntervention.action}
          onClose={() => setRequestIntervention(null)}
          onConfirm={async (reason) => {
            const succeeded = await run(() =>
              apiPost(
                `/admin/requests/${requestIntervention.request.id}/intervention`,
                {
                  action: requestIntervention.action,
                  reason,
                },
              ),
            );
            if (succeeded) {
              setRequestIntervention(null);
              setRequestTimeline(null);
            }
            return succeeded;
          }}
        />
      )}
    </main>
  );
}

function AdminListControls({
  search,
  onSearch,
  status,
  statuses,
  onStatus,
  page,
  totalPages,
  resultCount,
  onPage,
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900/60 p-3 lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Търсене</span>
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Търсене в текущия списък"
          className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-500"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <span>Статус</span>
        <select
          value={status}
          onChange={(event) => onStatus(event.target.value)}
          className="h-10 min-w-44 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-500"
        >
          <option value="">Всички</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className="whitespace-nowrap text-sm text-slate-400">
          {resultCount} резултата
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Предишна страница"
            title="Предишна страница"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 bg-slate-950 text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center text-sm text-slate-300">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Следваща страница"
            title="Следваща страница"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 bg-slate-950 text-slate-200 disabled:opacity-40"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsTable({ items, run }) {
  return (
    <DataTable
      columns={[
        'ID',
        'Тип',
        'Обект',
        'Категория',
        'Описание',
        'Статус',
        'Действия',
      ]}
      rows={items.map((report) => [
        report.id,
        report.targetType,
        report.targetId,
        report.category,
        report.details || '-',
        report.status,
        <ReportActions key={`report-${report.id}`} report={report} run={run} />,
      ])}
    />
  );
}

function ReportActions({ report, run }) {
  const [status, setStatus] = useState(
    report.status === 'open' ? 'reviewing' : 'resolved',
  );
  const [note, setNote] = useState('');
  return (
    <div className="flex min-w-64 flex-col gap-2">
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
        >
          <option value="reviewing">Проверка</option>
          <option value="resolved">Приключен</option>
          <option value="dismissed">Отхвърлен</option>
        </select>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Задължителна бележка"
          className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
        />
      </div>
      <SmallButton
        disabled={!note.trim()}
        onClick={() =>
          run(() =>
            apiPost(`/admin/reports/${report.id}/status`, { status, note }),
          )
        }
      >
        Запази
      </SmallButton>
    </div>
  );
}

function UsersTable({ items, run }) {
  return (
    <DataTable
      columns={['ID', 'Име', 'Email', 'Роля', 'Статус', 'Действия']}
      rows={items.map((user) => [
        user.id,
        user.name || '-',
        user.email || '-',
        user.role || '-',
        user.status || 'active',
        <div className="flex gap-2" key={user.id}>
          <ReasonAction
            label="Block"
            placeholder="Причина за блокиране"
            onConfirm={(reason) =>
              run(() =>
                apiPost(`/admin/users/${user.id}/status`, {
                  status: 'blocked',
                  reason,
                }),
              )
            }
          />
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(`/admin/users/${user.id}/status`, { status: 'active' }),
              )
            }
          >
            Active
          </SmallButton>
        </div>,
      ])}
    />
  );
}

function WorkersTable({ items, run, onDetails }) {
  return (
    <DataTable
      columns={[
        'User ID',
        'Име',
        'Град',
        'Акаунт',
        'Одобрение',
        'Стена',
        'Профил',
        'Onboarding',
        'Действия',
      ]}
      rows={items.map((worker) => [
        worker.workerUserId || worker.userId || worker.id,
        worker.publicName || worker.fullName || '-',
        worker.city || '-',
        worker.userStatus || '-',
        worker.approvalStatus || (worker.isApproved ? 'approved' : 'pending'),
        worker.visibilityStatus === 'public' ? 'Показан' : 'Скрит',
        <CompletionBadge
          key={`completion-${worker.workerUserId || worker.id}`}
          value={worker.completionPercent}
        />,
        worker.onboardingStatus === 'completed' ? 'Завършен' : 'Незавършен',
        <div
          className="flex flex-wrap gap-2"
          key={worker.workerUserId || worker.userId || worker.id}
        >
          <SmallButton
            onClick={() =>
              onDetails(worker.workerUserId || worker.userId || worker.id)
            }
          >
            <Eye size={14} aria-hidden="true" />
            Детайли
          </SmallButton>
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(
                  `/admin/workers/${worker.workerUserId || worker.userId || worker.id}/approval`,
                  {
                    approvalStatus: 'approved',
                  },
                ),
              )
            }
          >
            Approve
          </SmallButton>
          <ReasonAction
            label="Suspend"
            placeholder="Причина за спиране"
            onConfirm={(reason) =>
              run(() =>
                apiPost(
                  `/admin/workers/${worker.workerUserId || worker.userId || worker.id}/approval`,
                  {
                    approvalStatus: 'suspended',
                    reason,
                  },
                ),
              )
            }
          />
          <SmallButton
            disabled={(worker.approvalStatus || 'pending') !== 'approved'}
            onClick={() =>
              run(() =>
                apiPost(
                  `/admin/workers/${worker.workerUserId || worker.userId || worker.id}/wall-visibility`,
                  {
                    listed: worker.visibilityStatus !== 'public',
                    reason: 'manual_wall_management',
                  },
                ),
              )
            }
          >
            {worker.visibilityStatus === 'public'
              ? 'Махни от стената'
              : 'Добави на стената'}
          </SmallButton>
        </div>,
      ])}
    />
  );
}

function RequestsTable({ items, run, onPreview, onTimeline }) {
  return (
    <DataTable
      columns={[
        'ID',
        'Категория',
        'Клиент',
        'Статус',
        'Майстор',
        'Снимки',
        'Действия',
      ]}
      rows={items.map((request) => {
        const status = request.statusKey || '-';
        const canModerate =
          ['draft', 'pending_admin'].includes(status) && !request.archivedAt;
        const isCompleted =
          status === 'completed' &&
          Boolean(request.archivedAt || request.isArchived);
        const requestPhotos = Array.isArray(request.beforePhotos)
          ? request.beforePhotos
          : request.photos || [];
        const hasPendingPhotos = requestPhotos.some(
          (photo) =>
            !['approved', 'rejected'].includes(
              String(photo.moderationStatus || 'pending').toLowerCase(),
            ),
        );

        return [
          request.id,
          request.categoryKey || request.category || '-',
          request.clientName || '-',
          status,
          request.assignedWorkerUserId || '-',
          <RequestPhotoStrip
            request={request}
            key={`photos-${request.id}`}
            onPreview={onPreview}
            run={run}
          />,
          <div className="flex flex-wrap gap-2" key={`actions-${request.id}`}>
            <SmallButton
              onClick={() => onTimeline?.(request.id)}
              icon={<Clock3 size={14} />}
            >
              Timeline
            </SmallButton>
            {canModerate ? (
              <>
                <SmallButton
                  disabled={hasPendingPhotos}
                  title={
                    hasPendingPhotos
                      ? 'Review every photo before publishing the request'
                      : undefined
                  }
                  onClick={() =>
                    run(() =>
                      apiPost(`/admin/requests/${request.id}/status`, {
                        status: 'published',
                      }),
                    )
                  }
                >
                  Одобри
                </SmallButton>
                <ReasonAction
                  label="Архивирай"
                  placeholder="Причина за архивиране"
                  onConfirm={(reason) =>
                    run(() =>
                      apiPost(`/admin/requests/${request.id}/status`, {
                        status: 'archived',
                        reason,
                      }),
                    )
                  }
                />
              </>
            ) : (
              <span className="self-center text-xs font-semibold uppercase text-slate-500">
                {isCompleted ? 'read-only completed' : 'read-only'}
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
      columns={['Категория', 'Подредба', 'Статус', 'Дейности', 'Действия']}
      rows={items.map((category) => [
        <div key={`category-${category.categoryKey}`}>
          <div className="font-semibold text-white">{category.label}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">
            {category.categoryKey}
          </div>
        </div>,
        category.sortOrder,
        <StatusBadge
          key={`status-${category.categoryKey}`}
          active={category.isActive}
        />,
        <div
          className="flex min-w-72 flex-col gap-2"
          key={`activities-${category.categoryKey}`}
        >
          {(category.activities || []).length ? (
            category.activities.map((activity) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 last:border-0 last:pb-0"
                key={activity.activityKey}
              >
                <div>
                  <div className="font-medium">{activity.label}</div>
                  <div className="text-xs text-slate-500">
                    {activity.activityKey}
                    {activity.unitType ? ` • ${activity.unitType}` : ''}
                  </div>
                </div>
                <SmallButton
                  onClick={() =>
                    run(() =>
                      apiPost(
                        `/admin/categories/${category.categoryKey}/activities/${activity.activityKey}`,
                        {
                          isActive: !activity.isActive,
                          reason: 'admin_catalog_update',
                        },
                      ),
                    )
                  }
                >
                  {activity.isActive ? 'Изключи' : 'Включи'}
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
                reason: 'admin_catalog_update',
              }),
            )
          }
        >
          {category.isActive ? 'Изключи' : 'Включи'}
        </SmallButton>,
      ])}
    />
  );
}

function PricingTable({ items, run }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    version: '',
    categoryKey: '',
    activityKey: '',
    laborMin: '',
    laborMax: '',
    materialMin: '',
    materialMax: '',
    currency: 'EUR',
  });

  useEffect(() => {
    let active = true;
    apiGet('/admin/categories')
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
            activityKey: next[0].activities?.[0]?.activityKey || '',
          };
        });
      })
      .catch(() => setCategories([]));
    return () => {
      active = false;
    };
  }, []);

  const selectedCategory = categories.find(
    (category) => category.categoryKey === form.categoryKey,
  );

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editRule(rule) {
    const stamp = new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replace('T', '')
      .slice(0, 12);
    setForm({
      version: `admin-${stamp}`,
      categoryKey: rule.categoryKey,
      activityKey: rule.activityKey,
      laborMin: String(rule.laborMin ?? ''),
      laborMax: String(rule.laborMax ?? ''),
      materialMin: rule.materialMin == null ? '' : String(rule.materialMin),
      materialMax: rule.materialMax == null ? '' : String(rule.materialMax),
      currency: rule.currency || 'EUR',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event) {
    event.preventDefault();
    const succeeded = await run(() =>
      apiPost('/admin/pricing', {
        ...form,
        reason: 'admin_pricing_version',
      }),
    );
    if (succeeded) {
      setForm((current) => ({
        ...current,
        version: '',
        laborMin: '',
        laborMax: '',
        materialMin: '',
        materialMax: '',
      }));
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="border-b border-slate-800 pb-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus size={18} className="text-cyan-400" aria-hidden="true" />
          <h2 className="text-lg font-bold">
            Нова или коригирана ценова версия
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <AdminInput
            label="Версия"
            value={form.version}
            onChange={(value) => setField('version', value)}
            placeholder="2026-q3"
            required
          />
          <AdminSelect
            label="Категория"
            value={form.categoryKey}
            onChange={(value) => {
              const category = categories.find(
                (item) => item.categoryKey === value,
              );
              setForm((current) => ({
                ...current,
                categoryKey: value,
                activityKey: category?.activities?.[0]?.activityKey || '',
              }));
            }}
            options={categories.map((category) => ({
              value: category.categoryKey,
              label: category.label,
            }))}
          />
          <AdminSelect
            label="Дейност"
            value={form.activityKey}
            onChange={(value) => setField('activityKey', value)}
            options={(selectedCategory?.activities || []).map((activity) => ({
              value: activity.activityKey,
              label: activity.label,
            }))}
          />
          <AdminInput
            label="Валута"
            value={form.currency}
            onChange={(value) => setField('currency', value.toUpperCase())}
            maxLength={3}
            required
          />
          <AdminInput
            label="Труд от"
            type="number"
            value={form.laborMin}
            onChange={(value) => setField('laborMin', value)}
            min="0"
            step="0.01"
            required
          />
          <AdminInput
            label="Труд до"
            type="number"
            value={form.laborMax}
            onChange={(value) => setField('laborMax', value)}
            min="0"
            step="0.01"
            required
          />
          <AdminInput
            label="Материали от"
            type="number"
            value={form.materialMin}
            onChange={(value) => setField('materialMin', value)}
            min="0"
            step="0.01"
          />
          <AdminInput
            label="Материали до"
            type="number"
            value={form.materialMax}
            onChange={(value) => setField('materialMax', value)}
            min="0"
            step="0.01"
          />
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
        columns={[
          'ID',
          'Версия',
          'Категория / дейност',
          'Труд',
          'Материали',
          'Валута',
          'Статус',
          'Действия',
        ]}
        rows={items.map((rule) => [
          rule.id,
          rule.version,
          <div key={`rule-${rule.id}`}>
            <div>{rule.categoryKey}</div>
            <div className="text-xs text-slate-500">{rule.activityKey}</div>
          </div>,
          `${rule.laborMin} – ${rule.laborMax}`,
          rule.materialMin == null
            ? '–'
            : `${rule.materialMin} – ${rule.materialMax}`,
          rule.currency,
          <StatusBadge
            key={`pricing-status-${rule.id}`}
            active={rule.isActive}
          />,
          <div className="flex gap-2" key={`pricing-action-${rule.id}`}>
            <SmallButton onClick={() => editRule(rule)}>Коригирай</SmallButton>
            <SmallButton
              onClick={() =>
                run(() =>
                  apiPost(`/admin/pricing/${rule.id}/status`, {
                    isActive: !rule.isActive,
                    reason: 'admin_pricing_status',
                  }),
                )
              }
            >
              {rule.isActive ? 'Деактивирай' : 'Активирай'}
            </SmallButton>
          </div>,
        ])}
      />
    </div>
  );
}

function RequestPhotoStrip({ request, onPreview, run }) {
  const photos =
    Array.isArray(request.beforePhotos) && request.beforePhotos.length
      ? request.beforePhotos
      : request.photos || [];
  if (!photos.length) return <span className="text-slate-500">няма</span>;

  return (
    <div className="flex max-h-64 max-w-xs flex-wrap gap-2 overflow-y-auto pr-1">
      {photos.map((photo) => {
        const url = photoMediaUrl(photo);
        if (!url) return null;

        const moderationStatus = photo.moderationStatus || 'pending';

        return (
          <div
            className="w-24 rounded border border-slate-700 bg-slate-950 p-1"
            key={photo.id || url}
          >
            <button
              type="button"
              onClick={() =>
                onPreview?.({
                  url,
                  title: `Заявка #${request.id}`,
                  subtitle:
                    request.categoryKey ||
                    request.category ||
                    'Снимка към заявка',
                  status: moderationStatus,
                })
              }
              className="block w-full overflow-hidden rounded"
              title="Отвори снимката"
            >
              <img src={url} alt="" className="h-14 w-full object-cover" />
            </button>
            <div
              className="mt-1 truncate text-[10px] font-semibold uppercase text-slate-400"
              title={moderationStatus}
            >
              {moderationStatus}
            </div>
            {photo.id &&
              !['approved', 'rejected'].includes(
                String(moderationStatus).toLowerCase(),
              ) && (
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        apiPost(`/admin/media/${photo.id}/moderation`, {
                          moderationStatus: 'approved',
                        }),
                      )
                    }
                    className="rounded bg-emerald-700 px-1 py-1 text-[10px] font-bold text-white hover:bg-emerald-600"
                    title="Одобри снимката"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        apiPost(`/admin/media/${photo.id}/moderation`, {
                          moderationStatus: 'rejected',
                          reason: 'Не отговаря на правилата за съдържание',
                        }),
                      )
                    }
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
      columns={['ID', 'Kind', 'Owner', 'Request', 'Preview', 'Moderation']}
      rows={items.map((media) => {
        const url = mediaUrl(media.publicUrl || media.url || media.storageKey);

        return [
          media.id,
          media.kind,
          media.ownerUserId,
          media.requestId || '-',
          url ? (
            <div key={media.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onPreview?.({
                    url,
                    title: `${media.kind || 'media'} #${media.id}`,
                    subtitle: `Owner ${media.ownerUserId || '-'}${media.requestId ? ` • Request ${media.requestId}` : ''}`,
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
                    title: `${media.kind || 'media'} #${media.id}`,
                    subtitle: `Owner ${media.ownerUserId || '-'}${media.requestId ? ` • Request ${media.requestId}` : ''}`,
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
            <SmallButton
              onClick={() =>
                run(() =>
                  apiPost(`/admin/media/${media.id}/moderation`, {
                    moderationStatus: 'approved',
                  }),
                )
              }
            >
              OK
            </SmallButton>
            <ReasonAction
              label="Reject"
              placeholder="Причина за отказ"
              onConfirm={(reason) =>
                run(() =>
                  apiPost(`/admin/media/${media.id}/moderation`, {
                    moderationStatus: 'rejected',
                    reason,
                  }),
                )
              }
            />
          </div>,
        ];
      })}
    />
  );
}

function MediaPreviewModal({ media, onClose }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Затвори прегледа"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-bold text-white">
              {media.title || 'Снимка'}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {media.subtitle || 'Медиа преглед'}{' '}
              {media.status ? `• ${media.status}` : ''}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <X size={16} aria-hidden="true" />
            Затвори
          </button>
        </div>

        <div className="flex min-h-[55vh] items-center justify-center bg-slate-950 p-4">
          {failed ? (
            <div className="max-w-xl rounded-xl border border-red-500/40 bg-red-950/40 p-5 text-center text-red-100">
              <div className="font-bold">Не успях да заредя снимката.</div>
              <div className="mt-2 break-all text-sm text-red-200/80">
                {media.url}
              </div>
            </div>
          ) : (
            <img
              src={media.url}
              alt={media.title || 'media preview'}
              className="max-h-[74vh] max-w-full rounded-lg object-contain"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RequestTimelineModal({ data, onClose, onIntervene }) {
  const request = data?.request || {};
  const events = Array.isArray(data?.events) ? data.events : [];
  const canIntervene = [
    'worker_confirmed',
    'worker_on_site',
    'inspected',
    'in_progress',
    'work_finished',
    'ready_for_client_confirmation',
    'client_confirmed',
    'reviewed',
  ].includes(request.statusKey);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Затвори timeline"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              Timeline на заявка #{request.id}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {request.categoryKey || request.category || 'Без категория'} •{' '}
              {request.statusLabel || request.statusKey || '–'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            <X size={16} aria-hidden="true" />
            Затвори
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {canIntervene && (
            <div className="mb-5 flex flex-wrap gap-3 rounded-md border border-amber-500/30 bg-amber-950/20 p-4">
              <div className="mr-auto">
                <div className="font-semibold text-amber-100">
                  Заключена потвърдена поръчка
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Само администратор може да я прекрати или преотвори.
                </div>
              </div>
              <SmallButton onClick={() => onIntervene?.('reopen')}>
                Освободи и преотвори
              </SmallButton>
              <button
                type="button"
                onClick={() => onIntervene?.('cancel')}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                Прекрати поръчката
              </button>
            </div>
          )}
          {events.length ? (
            <ol className="relative border-l border-cyan-500/40 pl-6">
              {events.map((event) => (
                <li className="relative pb-6 last:pb-0" key={event.id}>
                  <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-400" />
                  <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                    <div className="font-semibold text-white">
                      {event.eventType}
                    </div>
                    <time className="text-xs text-slate-500">
                      {event.createdAt
                        ? new Date(event.createdAt).toLocaleString('bg-BG')
                        : '–'}
                    </time>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Actor: {event.actorUserId || 'system'}
                  </div>
                  {event.metadataJson &&
                  Object.keys(event.metadataJson).length ? (
                    <pre className="mt-3 overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                      {JSON.stringify(event.metadataJson, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="border border-slate-800 p-5 text-slate-400">
              Няма записани събития.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestInterventionModal({ request, action, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isCancel = action === 'cancel';

  async function submit(event) {
    event.preventDefault();
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Затвори"
        onClick={onClose}
      />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-6 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-white">
          {isCancel ? 'Прекрати поръчката' : 'Освободи и преотвори'} #
          {request.id}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Действието ще бъде записано в timeline-а и административния одит.
        </p>
        <label
          htmlFor="request-intervention-reason"
          className="mt-5 block text-sm font-semibold text-slate-200"
        >
          Причина
        </label>
        <textarea
          id="request-intervention-reason"
          autoFocus
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-400"
          placeholder="Опишете причината за намесата..."
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-800 px-4 py-2 font-semibold"
          >
            Назад
          </button>
          <button
            type="submit"
            disabled={!reason.trim() || submitting}
            className={`rounded-md px-4 py-2 font-semibold text-white disabled:opacity-50 ${isCancel ? 'bg-red-700' : 'bg-blue-700'}`}
          >
            {submitting ? 'Записване...' : 'Потвърди'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReferralsTable({ items, run }) {
  return (
    <DataTable
      columns={[
        'ID',
        'Code',
        'Type',
        'Referrer',
        'Referred',
        'Status',
        'Progress',
        'Reward',
        'Actions',
      ]}
      rows={items.map((referral) => [
        referral.id,
        referral.code,
        referral.type,
        referral.referrerUserId,
        referral.referredUserId || '-',
        referral.status,
        `${referral.qualifiedRepairCount || 0}/2`,
        (referral.rewards || []).find((reward) => reward.status === 'active')
          ?.endsAt
          ? new Date(
              (referral.rewards || []).find(
                (reward) => reward.status === 'active',
              ).endsAt,
            ).toLocaleDateString('bg-BG')
          : '-',
        <div className="flex flex-wrap gap-2" key={referral.id}>
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(`/admin/referrals/${referral.id}/reject`, {
                  reason: 'admin_review',
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
                  reason: 'admin_review',
                }),
              )
            }
          >
            Revoke
          </SmallButton>
          <SmallButton
            onClick={() =>
              run(() =>
                apiPost(`/admin/referrals/${referral.id}/restore-reward`, {
                  reason: 'admin_restore',
                }),
              )
            }
          >
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
      columns={['ID', 'Admin', 'Action', 'Target', 'Reason', 'Date']}
      rows={items.map((log) => [
        log.id,
        log.adminUserId,
        log.action,
        `${log.targetType || '-'} #${log.targetId || '-'}`,
        log.reason || '-',
        log.createdAt ? new Date(log.createdAt).toLocaleString('bg-BG') : '-',
      ])}
    />
  );
}

function DataTable({ columns, rows }) {
  if (!rows.length)
    return (
      <div className="rounded-md border border-slate-800 p-5 text-slate-400">
        Няма записи.
      </div>
    );

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
                <td
                  key={cellIndex}
                  className="px-4 py-3 align-top text-slate-200"
                >
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
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}
    >
      {active ? 'активно' : 'изключено'}
    </span>
  );
}

function AdminInput({ label, value, onChange, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-400">
        {label}
      </span>
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
      <span className="mb-1 block text-xs font-semibold text-slate-400">
        {label}
      </span>
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

function ReasonAction({ label, placeholder, onConfirm }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return <SmallButton onClick={() => setOpen(true)}>{label}</SmallButton>;
  }

  async function submit(event) {
    event.preventDefault();
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const succeeded = await onConfirm(reason.trim());
      if (succeeded) {
        setReason('');
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-w-64 items-center gap-2">
      <input
        autoFocus
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-2 text-xs text-white outline-none focus:border-cyan-500"
      />
      <button
        type="submit"
        disabled={!reason.trim() || submitting}
        className="h-8 rounded bg-red-700 px-3 text-xs font-semibold text-white disabled:opacity-40"
      >
        {submitting ? '...' : 'Потвърди'}
      </button>
      <button
        type="button"
        aria-label="Отказ"
        title="Отказ"
        onClick={() => {
          setOpen(false);
          setReason('');
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded bg-slate-800 text-slate-300"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </form>
  );
}

function SmallButton({
  children,
  onClick,
  icon = null,
  disabled = false,
  title,
}) {
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

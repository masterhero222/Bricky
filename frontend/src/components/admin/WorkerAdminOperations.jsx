import { Copy, Mail, MapPin, Phone, X } from 'lucide-react';

export function CompletionBadge({ value }) {
  const percentage = Number.isFinite(Number(value)) ? Number(value) : 0;
  const color =
    percentage >= 100
      ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
      : percentage >= 50
        ? 'border-amber-500/40 bg-amber-950/40 text-amber-100'
        : 'border-red-500/40 bg-red-950/40 text-red-100';
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${color}`}>
      {percentage}%
    </span>
  );
}

export function WorkerAdminFilters({ value, onChange }) {
  const toggle = (key) => onChange({ ...value, [key]: !value[key] });
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-slate-900/70 p-3">
      {[
        ['incomplete', 'Незавършен профил'],
        ['missingPhone', 'Липсва телефон'],
        ['onboardingIncomplete', 'Onboarding незавършен'],
      ].map(([key, label]) => (
        <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={Boolean(value[key])}
            onChange={() => toggle(key)}
            className="h-4 w-4 accent-emerald-500"
          />
          {label}
        </label>
      ))}
      <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
        Сортиране
        <select
          value={value.sort}
          onChange={(event) => onChange({ ...value, sort: event.target.value })}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
        >
          <option value="newest">Най-нови</option>
          <option value="completion_asc">Най-нисък процент</option>
        </select>
      </label>
    </div>
  );
}

export function WorkerDetailModal({ worker, loading, error, onRetry, onClose }) {
  async function copyPhone() {
    if (worker?.phonePrivate) {
      await navigator.clipboard.writeText(worker.phonePrivate);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-label="Детайли за майстора"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-300">
              Майстор #{worker?.workerUserId || '-'}
            </p>
            <h2 className="mt-1 text-xl font-bold">{worker?.publicName || 'Детайли'}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-700 text-slate-300"
            aria-label="Затвори"
          >
            <X size={20} />
          </button>
        </div>

        {loading && <p className="text-slate-400">Зареждане...</p>}
        {!loading && error && (
          <div className="rounded-md border border-red-500/40 bg-red-950/30 p-4">
            <p className="text-sm text-red-100">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
            >
              Опитай отново
            </button>
          </div>
        )}
        {!loading && worker && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard icon={Phone} label="Телефон" value={worker.phonePrivate || 'Липсва'}>
                {worker.phonePrivate && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={copyPhone} className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold">
                      <Copy size={14} /> Копирай
                    </button>
                    <a href={`tel:${worker.phonePrivate}`} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold">
                      <Phone size={14} /> Позвъни
                    </a>
                  </div>
                )}
              </DetailCard>
              <DetailCard icon={Mail} label="Имейл" value={worker.email || 'Липсва'} />
              <DetailCard icon={MapPin} label="Град / район" value={worker.city || 'Липсва'} />
              <DetailCard icon={MapPin} label="Адрес" value={worker.defaultAddress || 'Липсва'} />
              <DetailCard label="Предпочитан контакт" value={worker.preferredContactMethod || 'Липсва'} />
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">Завършеност на профила</h3>
                <CompletionBadge value={worker.completionPercent} />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800">
                <div className="h-full bg-emerald-500" style={{ width: `${worker.completionPercent || 0}%` }} />
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {(worker.missingItems || []).map((item) => (
                  <li key={item.key}>• {item.label}</li>
                ))}
                {!worker.missingItems?.length && <li className="text-emerald-300">Профилът е готов.</li>}
              </ul>
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
              <h3 className="font-bold">Onboarding и дейност</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <DetailTerm label="Статус" value={worker.onboardingStatus} />
                <DetailTerm label="Основна категория" value={worker.primaryCategoryKey || 'Липсва'} />
                <DetailTerm label="Работи като" value={worker.workType || 'Липсва'} />
                <DetailTerm label="Опит" value={worker.experienceRange || 'Липсва'} />
                <DetailTerm label="Приема обекти" value={worker.availabilityStatus || 'Липсва'} />
                <DetailTerm label="Източник" value={worker.acquisitionSourceSelfReported || 'Липсва'} />
              </dl>
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
              <h3 className="font-bold">Системни статуси</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[worker.accountStatus, worker.approvalStatus, worker.visibilityStatus].map((status, index) => (
                  <span key={`${status}-${index}`} className="rounded-md bg-slate-800 px-2 py-1 text-slate-200">
                    {status || '-'}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-slate-400">
                Регистрация: {worker.createdAt ? new Date(worker.createdAt).toLocaleString('bg-BG') : 'Липсва'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value, children }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
        {Icon && <Icon size={15} aria-hidden="true" />}
        {label}
      </div>
      <p className="mt-2 break-words font-semibold text-slate-100">{value}</p>
      {children}
    </div>
  );
}

function DetailTerm({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-200">{value}</dd>
    </div>
  );
}

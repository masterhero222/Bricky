import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CreditCard,
  Download,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  FileText,
  UserRound,
} from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../services/api';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '' };

function messageFrom(error, fallback) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || fallback;
}

function dateLabel(value) {
  if (!value) return 'Без крайна дата';
  return new Date(value).toLocaleDateString('bg-BG');
}

export default function AccountSettingsPanel({
  view = 'settings',
  onProfileSaved,
}) {
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationPassword, setDeactivationPassword] = useState('');
  const [deactivationConfirmed, setDeactivationConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [privacy, setPrivacy] = useState(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyRequestType, setPrivacyRequestType] = useState('access');
  const [privacyRequestDetails, setPrivacyRequestDetails] = useState('');
  const [privacyRequesting, setPrivacyRequesting] = useState(false);

  async function loadAccount() {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/account/me');
      const next = response.data || {};
      setAccount(next);
      setForm({
        name: next.profile?.name || '',
        email: next.email || '',
        phone: next.profile?.phone || '',
        address: next.profile?.address || '',
      });
    } catch (requestError) {
      setError(
        messageFrom(requestError, 'Настройките не могат да бъдат заредени.'),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
    loadPrivacy();
  }, []);

  async function loadPrivacy() {
    try {
      const response = await apiGet('/privacy/status');
      setPrivacy(response.data);
    } catch (requestError) {
      setError(messageFrom(requestError, 'Настройките за поверителност не могат да бъдат заредени.'));
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const emailChanged =
        form.email.trim().toLowerCase() !==
        String(account?.email || '').toLowerCase();
      const response = await apiPut('/account/profile', form);
      setAccount(response.data);
      if (emailChanged) {
        await apiPost('/auth/email-verification/request');
        setMessage(
          'Данните са запазени. Изпратихме линк за потвърждение на новия имейл.',
        );
      } else {
        setMessage('Данните са запазени.');
      }
      onProfileSaved?.(response.data);
    } catch (requestError) {
      setError(messageFrom(requestError, 'Данните не бяха запазени.'));
    } finally {
      setSaving(false);
    }
  }

  async function requestEmailVerification() {
    setMessage('');
    setError('');
    setRequestingVerification(true);
    try {
      const response = await apiPost('/auth/email-verification/request');
      setMessage(response.data?.message || 'Изпратихме линк за потвърждение.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Линкът не можа да бъде изпратен.'));
    } finally {
      setRequestingVerification(false);
    }
  }

  async function requestPasswordReset() {
    setMessage('');
    setError('');
    setRequestingReset(true);
    try {
      const response = await apiPost('/auth/password-reset/request', {
        email: account?.email,
      });
      setMessage(
        response.data?.message ||
          'Изпратихме защитен линк на регистрирания имейл.',
      );
    } catch (requestError) {
      setError(messageFrom(requestError, 'Линкът не можа да бъде изпратен.'));
    } finally {
      setRequestingReset(false);
    }
  }

  async function markRead(notificationId) {
    await apiPost(`/notifications/${notificationId}/read`);
    await loadAccount();
  }

  async function exportAccountData() {
    setMessage('');
    setError('');
    setExporting(true);
    try {
      const response = await apiGet('/privacy/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bricky-account-${account?.userId || 'data'}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('Копието на личните ви данни е изтеглено.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Данните не могат да бъдат изтеглени.'));
    } finally {
      setExporting(false);
    }
  }

  async function savePrivacyPreferences() {
    setPrivacySaving(true);
    setMessage('');
    setError('');
    try {
      const response = await apiPut('/privacy/preferences', {
        analyticsConsent: Boolean(privacy?.preferences?.analyticsConsent),
        marketingConsent: Boolean(privacy?.preferences?.marketingConsent),
      });
      setPrivacy(response.data);
      setMessage('Изборът за поверителност е запазен.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Изборът не можа да бъде запазен.'));
    } finally {
      setPrivacySaving(false);
    }
  }

  async function acceptCurrentDocuments() {
    setPrivacySaving(true);
    setMessage('');
    setError('');
    try {
      const response = await apiPost('/privacy/accept-current');
      setPrivacy(response.data);
      setMessage('Актуалните правни документи са отбелязани като прочетени и приети.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Приемането не можа да бъде записано.'));
    } finally {
      setPrivacySaving(false);
    }
  }

  async function submitPrivacyRequest(event) {
    event.preventDefault();
    setPrivacyRequesting(true);
    setMessage('');
    setError('');
    try {
      await apiPost('/privacy/requests', {
        requestType: privacyRequestType,
        details: privacyRequestDetails,
      });
      setPrivacyRequestDetails('');
      await loadPrivacy();
      setMessage('Заявката е регистрирана. Ще получите отговор обичайно до един месец.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Заявката не можа да бъде регистрирана.'));
    } finally {
      setPrivacyRequesting(false);
    }
  }

  async function deactivateAccount(event) {
    event.preventDefault();
    if (!deactivationConfirmed) return;
    setMessage('');
    setError('');
    setDeactivating(true);
    try {
      await apiPost('/account/deactivate', {
        currentPassword: deactivationPassword,
      });
      ['token', 'accessToken', 'access_token', 'role', 'userId'].forEach((key) =>
        localStorage.removeItem(key),
      );
      window.location.assign('/');
    } catch (requestError) {
      setError(
        messageFrom(requestError, 'Профилът не може да бъде деактивиран.'),
      );
    } finally {
      setDeactivating(false);
    }
  }

  if (loading)
    return (
      <div className="mx-auto max-w-5xl py-12 text-center text-slate-400">
        Зареждане на настройките...
      </div>
    );

  if (view === 'subscription') {
    const subscription = account?.subscription;
    return (
      <section
        className="mx-auto max-w-4xl"
        aria-labelledby="subscription-title"
      >
        <div className="mb-7 flex items-center gap-3">
          <CreditCard className="text-cyan-300" />
          <div>
            <h1 id="subscription-title" className="text-3xl font-extrabold">
              Абонамент
            </h1>
            <p className="mt-1 text-slate-400">
              Текущ план и период на валидност.
            </p>
          </div>
        </div>
        <div className="bricky-card grid gap-6 rounded-2xl p-6 sm:grid-cols-3">
          <AccountValue
            label="План"
            value={(subscription?.planKey || 'free').toUpperCase()}
          />
          <AccountValue
            label="Статус"
            value={subscription?.status || 'active'}
          />
          <AccountValue
            label="Валиден до"
            value={dateLabel(subscription?.endsAt)}
          />
        </div>
      </section>
    );
  }

  const notifications = account?.notifications?.items || [];
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold">Настройки</h1>
        <p className="mt-2 text-slate-400">
          Лични данни, адрес, известия и сигурност на акаунта.
        </p>
      </header>

      {(message || error) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-green-400/25 bg-green-500/10 text-green-200'}`}
        >
          {error || message}
        </div>
      )}

      {account && !account.emailVerified && (
        <section className="flex flex-col gap-4 rounded-lg border border-amber-300/25 bg-amber-400/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-extrabold text-amber-100">
              Имейлът не е потвърден
            </p>
            <p className="mt-1 text-sm text-amber-100/75">
              Потвърдете адреса, за да защитите профила и да получавате важните
              съобщения.
            </p>
          </div>
          <button
            type="button"
            onClick={requestEmailVerification}
            disabled={requestingVerification}
            className="bricky-button-secondary shrink-0"
          >
            <Mail size={18} />{' '}
            {requestingVerification ? 'Изпращане...' : 'Изпрати линк'}
          </button>
        </section>
      )}

      <section
        className="bricky-card rounded-2xl p-6"
        aria-labelledby="account-profile-title"
      >
        <h2
          id="account-profile-title"
          className="flex items-center gap-2 text-xl font-extrabold"
        >
          <UserRound className="text-cyan-300" /> Данни за профила
        </h2>
        <form onSubmit={saveProfile} className="mt-6 grid gap-5 md:grid-cols-2">
          <AccountInput
            icon={UserRound}
            label="Име"
            value={form.name}
            onChange={(value) =>
              setForm((current) => ({ ...current, name: value }))
            }
            autoComplete="name"
          />
          <AccountInput
            icon={Mail}
            label="Имейл"
            type="email"
            value={form.email}
            onChange={(value) =>
              setForm((current) => ({ ...current, email: value }))
            }
            autoComplete="email"
          />
          <AccountInput
            icon={Phone}
            label="Телефон"
            type="tel"
            value={form.phone}
            onChange={(value) =>
              setForm((current) => ({ ...current, phone: value }))
            }
            autoComplete="tel"
          />
          <AccountInput
            icon={MapPin}
            label="Основен адрес"
            value={form.address}
            onChange={(value) =>
              setForm((current) => ({ ...current, address: value }))
            }
            autoComplete="street-address"
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bricky-button-primary"
            >
              <Save size={18} /> {saving ? 'Запазване...' : 'Запази данните'}
            </button>
          </div>
        </form>
      </section>

      <section
        className="bricky-card rounded-2xl p-6"
        aria-labelledby="account-security-title"
      >
        <h2
          id="account-security-title"
          className="flex items-center gap-2 text-xl font-extrabold"
        >
          <KeyRound className="text-cyan-300" /> Смяна на парола
        </h2>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-slate-300">
              Ще изпратим еднократен защитен линк на:
            </p>
            <p className="mt-1 flex items-center gap-2 font-bold text-slate-100">
              <Mail size={17} className="text-cyan-300" /> {account?.email}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Линкът е валиден 30 минути и може да бъде използван само веднъж.
            </p>
          </div>
          <button
            type="button"
            onClick={requestPasswordReset}
            disabled={requestingReset || !account?.email}
            className="bricky-button-secondary shrink-0"
          >
            <Mail size={18} />{' '}
            {requestingReset ? 'Изпращане...' : 'Изпрати защитен линк'}
          </button>
        </div>
      </section>

      <section
        className="bricky-card rounded-2xl p-6"
        aria-labelledby="account-notifications-title"
      >
        <div className="flex items-center justify-between gap-4">
          <h2
            id="account-notifications-title"
            className="flex items-center gap-2 text-xl font-extrabold"
          >
            <Bell className="text-cyan-300" /> Известия
          </h2>
          <span className="text-sm font-bold text-cyan-200">
            {account?.notifications?.unreadCount || 0} непрочетени
          </span>
        </div>
        <div className="mt-5 divide-y divide-slate-400/15">
          {notifications.length === 0 ? (
            <p className="py-5 text-slate-400">Нямате известия.</p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 py-4"
              >
                <div>
                  <p
                    className={
                      item.isRead
                        ? 'text-slate-400'
                        : 'font-bold text-slate-100'
                    }
                  >
                    {item.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString('bg-BG')}
                  </p>
                </div>
                {!item.isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(item.id)}
                    className="shrink-0 rounded-lg border border-cyan-400/20 p-2 text-cyan-200 hover:bg-cyan-400/10"
                    title="Маркирай като прочетено"
                  >
                    <Check size={18} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section
        className="bricky-card rounded-2xl p-6"
        aria-labelledby="account-privacy-title"
      >
        <h2
          id="account-privacy-title"
          className="flex items-center gap-2 text-xl font-extrabold"
        >
          <ShieldAlert className="text-cyan-300" /> Данни и поверителност
        </h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {privacy && !privacy.acceptances?.some((item) => item.documentType === 'privacy' && item.documentVersion === privacy.versions?.privacyVersion) && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-5 lg:col-span-2">
              <h3 className="font-extrabold text-amber-100">Актуализирани правни документи</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Прегледайте актуалните Условия за ползване и Политика за поверителност. Незадължителните съгласия се управляват отделно по-долу.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href="/terms" target="_blank" rel="noreferrer" className="bricky-button-secondary">Условия</a>
                <a href="/privacy" target="_blank" rel="noreferrer" className="bricky-button-secondary">Поверителност</a>
                <button type="button" onClick={acceptCurrentDocuments} disabled={privacySaving} className="bricky-button-primary">Прочетох и приемам</button>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-slate-400/15 bg-slate-950/25 p-5">
            <h3 className="font-extrabold text-slate-100">Копие на данните</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Изтеглете информацията за профила, заявките, кандидатурите,
              отзивите, снимките и известията си в JSON формат.
            </p>
            <button
              type="button"
              onClick={exportAccountData}
              disabled={exporting}
              className="bricky-button-secondary mt-5"
            >
              <Download size={18} />
              {exporting ? 'Подготовка...' : 'Изтегли моите данни'}
            </button>
          </div>

          <div className="rounded-xl border border-slate-400/15 bg-slate-950/25 p-5">
            <h3 className="font-extrabold text-slate-100">Незадължително проследяване</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              В момента рекламни и незадължителни аналитични инструменти не се зареждат. Изборът ви се пази за бъдеща интеграция и може да бъде променен по всяко време.
            </p>
            {['analyticsConsent', 'marketingConsent'].map((key) => (
              <label key={key} className="mt-4 flex items-center justify-between gap-4 text-sm font-bold text-slate-200">
                {key === 'analyticsConsent' ? 'Аналитика' : 'Маркетингови съобщения'}
                <input
                  type="checkbox"
                  checked={Boolean(privacy?.preferences?.[key])}
                  onChange={(event) =>
                    setPrivacy((current) => ({
                      ...current,
                      preferences: { ...current?.preferences, [key]: event.target.checked },
                    }))
                  }
                  className="h-5 w-5 accent-emerald-500"
                />
              </label>
            ))}
            <button type="button" onClick={savePrivacyPreferences} disabled={privacySaving || !privacy} className="bricky-button-secondary mt-5">
              <Save size={18} /> {privacySaving ? 'Запазване...' : 'Запази избора'}
            </button>
          </div>

          <form onSubmit={submitPrivacyRequest} className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5 lg:col-span-2">
            <h3 className="flex items-center gap-2 font-extrabold text-slate-100"><FileText size={18} /> Искане относно лични данни</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Подайте проследимо искане за достъп, корекция, заличаване, ограничаване или възражение. Може да поискаме допълнително потвърждение на самоличността.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
              <select value={privacyRequestType} onChange={(event) => setPrivacyRequestType(event.target.value)} className="min-h-12 rounded-lg border border-slate-400/20 bg-slate-950 px-3 text-slate-100">
                <option value="access">Достъп</option>
                <option value="rectification">Корекция</option>
                <option value="erasure">Заличаване</option>
                <option value="restriction">Ограничаване</option>
                <option value="objection">Възражение</option>
              </select>
              <textarea value={privacyRequestDetails} onChange={(event) => setPrivacyRequestDetails(event.target.value)} minLength={5} maxLength={2000} required placeholder="Опишете точно какво искате..." className="min-h-28 rounded-lg border border-slate-400/20 bg-slate-950 p-3 text-slate-100" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <a href="/privacy" className="text-sm font-bold text-cyan-300 underline">Прочети политиката</a>
              <button type="submit" disabled={privacyRequesting || privacyRequestDetails.trim().length < 5} className="bricky-button-primary">
                {privacyRequesting ? 'Изпращане...' : 'Регистрирай искането'}
              </button>
            </div>
            {privacy?.requests?.length > 0 && (
              <div className="mt-5 divide-y divide-slate-400/15 border-t border-slate-400/15">
                {privacy.requests.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <span>#{item.id} · {item.requestType}</span>
                    <span className="font-bold text-cyan-200">{item.status} · срок {dateLabel(item.dueAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </form>

          <form
            onSubmit={deactivateAccount}
            className="rounded-xl border border-red-400/20 bg-red-500/5 p-5"
          >
            <h3 className="font-extrabold text-red-100">
              Деактивиране на профила
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Профилът става недостъпен и всички сесии се прекратяват. Историята
              на поръчките се пази по законови и отчетни причини. Не е възможно
              деактивиране при активна поръчка.
            </p>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-300">
                Текуща парола
              </span>
              <input
                type="password"
                value={deactivationPassword}
                onChange={(event) => setDeactivationPassword(event.target.value)}
                autoComplete="current-password"
                minLength={6}
                required
                className="min-h-12 w-full rounded-xl border border-slate-400/20 bg-slate-950/35 px-4 text-slate-100 outline-none focus:border-red-300/60"
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={deactivationConfirmed}
                onChange={(event) =>
                  setDeactivationConfirmed(event.target.checked)
                }
                className="mt-1"
              />
              Разбирам, че профилът ми ще бъде деактивиран.
            </label>
            <button
              type="submit"
              disabled={
                deactivating ||
                !deactivationConfirmed ||
                deactivationPassword.length < 6
              }
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldAlert size={18} />
              {deactivating ? 'Деактивиране...' : 'Деактивирай профила'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function AccountInput({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-300">
        {label}
      </span>
      <span className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-400/20 bg-slate-950/35 px-4 focus-within:border-cyan-300/60">
        {Icon && <Icon size={18} className="shrink-0 text-slate-500" />}
        <input
          required={type === 'email' || type === 'password'}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent py-3 text-slate-100 outline-none"
        />
      </span>
    </label>
  );
}

function AccountValue({ label, value }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-extrabold text-slate-100">{value}</div>
    </div>
  );
}

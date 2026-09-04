import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CreditCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Save,
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
  }, []);

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

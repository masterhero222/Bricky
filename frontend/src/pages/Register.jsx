import { useState } from 'react';
import { apiPost } from '../services/api';

import { REPAIR_CATEGORY_OPTIONS } from '../constants/repairCatalog';

const WORKER_SKILL_OPTIONS = REPAIR_CATEGORY_OPTIONS.map((category) => ({
  key: category.key,
  label: category.shortLabel || category.label,
}));

export default function Register() {
  const [role, setRole] = useState(() =>
    new URLSearchParams(window.location.search).get('role') === 'worker'
      ? 'worker'
      : 'client',
  );
  const [referralCode, setReferralCode] = useState(
    () => new URLSearchParams(window.location.search).get('ref') || '',
  );

  const [form, setForm] = useState({
    name: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: '',
    skills: [],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleSkill = (s) => {
    const exists = form.skills.includes(s);
    setForm({
      ...form,
      skills: exists ? form.skills.filter((x) => x !== s) : [...form.skills, s],
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Паролите не съвпадат.');
      return;
    }

    // ✅ Единен endpoint
    const endpoint = '/auth/register';

    // ✅ Единен payload + role
    const payload =
      role === 'client'
        ? {
            role: 'client',
            name: form.name,
            email: form.email,
            password: form.password,
          }
        : {
            role: 'worker',
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            phone: form.phone,
            city: form.city,
            skills: form.skills,
          };

    if (referralCode.trim()) payload.referralCode = referralCode.trim();

    try {
      setSubmitting(true);
      const response = await apiPost(endpoint, payload);
      const verification = response.data?.emailVerification;
      setSuccess(
        verification?.deliveryStatus === 'failed'
          ? 'Регистрацията е успешна, но имейлът не беше доставен. Влезте и изпратете нов линк от Настройки.'
          : 'Регистрацията е успешна. Изпратихме линк за потвърждение на имейла.',
      );
    } catch (err) {
      console.error(err.response?.data || err);
      const message = err.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(' ')
          : message || 'Грешка при регистрация.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center pt-24 px-6">
      <h1 className="text-3xl font-bold mb-8">Регистрация</h1>

      {/* ROLE SWITCH */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setRole('client')}
          className={`px-6 py-2 rounded-lg font-bold ${
            role === 'client' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Клиент
        </button>

        <button
          type="button"
          onClick={() => setRole('worker')}
          className={`px-6 py-2 rounded-lg font-bold ${
            role === 'worker' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Майстор
        </button>
      </div>

      <form
        onSubmit={submit}
        className="bg-gray-800 p-8 rounded-xl w-full max-w-lg space-y-4 shadow-xl"
      >
        {(error || success) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-bold ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'}`}
            role="status"
          >
            {error || success}
            {success && (
              <a href="/auth/login" className="ml-2 underline">
                Към вход
              </a>
            )}
          </div>
        )}
        {role === 'client' ? (
          <input
            name="name"
            placeholder="Име"
            className="w-full p-3 rounded bg-gray-700"
            value={form.name}
            onChange={change}
            required
          />
        ) : (
          <>
            <input
              name="fullName"
              placeholder="Трите имена"
              className="w-full p-3 rounded bg-gray-700"
              value={form.fullName}
              onChange={change}
              required
            />

            <input
              name="phone"
              placeholder="Телефон"
              className="w-full p-3 rounded bg-gray-700"
              value={form.phone}
              onChange={change}
              required
            />

            <input
              name="city"
              placeholder="Град"
              className="w-full p-3 rounded bg-gray-700"
              value={form.city}
              onChange={change}
              required
            />

            <div className="flex gap-2 flex-wrap">
              {WORKER_SKILL_OPTIONS.map((skill) => (
                <button
                  type="button"
                  key={skill.key}
                  onClick={() => toggleSkill(skill.key)}
                  className={`px-3 py-1 rounded ${
                    form.skills.includes(skill.key)
                      ? 'bg-blue-600'
                      : 'bg-gray-700'
                  }`}
                >
                  {skill.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
          <label className="mb-2 block text-sm font-semibold text-gray-300">
            Referral код
          </label>
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="Например BRABC123"
            className="w-full rounded bg-gray-700 p-3"
          />
          {referralCode ? (
            <p className="mt-2 text-sm text-green-300">
              Покана от Bricky е добавена към регистрацията.
            </p>
          ) : null}
        </div>

        <input
          name="email"
          placeholder="Имейл"
          className="w-full p-3 rounded bg-gray-700"
          value={form.email}
          onChange={change}
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Парола"
          className="w-full p-3 rounded bg-gray-700"
          value={form.password}
          onChange={change}
          required
        />

        <input
          name="confirmPassword"
          type="password"
          placeholder="Потвърди парола"
          className="w-full p-3 rounded bg-gray-700"
          value={form.confirmPassword}
          onChange={change}
          required
        />

        <button
          disabled={submitting || Boolean(success)}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 p-3 rounded font-bold"
        >
          {submitting ? 'Регистриране...' : 'Регистрация'}
        </button>
      </form>
    </div>
  );
}

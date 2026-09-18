import { useState } from 'react';
import { apiPost } from '../services/api';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  passwordPolicyError,
} from '../utils/passwordPolicy';

import { REPAIR_CATEGORY_OPTIONS } from '../constants/repairCatalog';
import { PRIVACY_VERSION, TERMS_VERSION } from '../constants/legal';
import { Link } from 'react-router-dom';
import GoogleRegisterButton from '../components/auth/GoogleRegisterButton';
import { AuthShell, RoleSelector } from '../components/registration/RegistrationShell';
import '../styles/auth.css';

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
    legalAccepted: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const change = (e) =>
    setForm({
      ...form,
      [e.target.name]:
        e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    });

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

    const passwordError = passwordPolicyError(form.password);
    if (passwordError) {
      setError(passwordError);
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
            legalAccepted: form.legalAccepted,
            termsVersion: TERMS_VERSION,
            privacyVersion: PRIVACY_VERSION,
          }
        : {
            role: 'worker',
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            phone: form.phone,
            city: form.city,
            skills: form.skills,
            legalAccepted: form.legalAccepted,
            termsVersion: TERMS_VERSION,
            privacyVersion: PRIVACY_VERSION,
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

  const googleRegistrationPayload = () => {
    const payload = {
      role,
      legalAccepted: form.legalAccepted,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    };

    if (role === 'client') {
      payload.name = form.name;
    } else {
      Object.assign(payload, {
        fullName: form.fullName,
        phone: form.phone,
        city: form.city,
        skills: form.skills,
      });
    }
    if (referralCode.trim()) payload.referralCode = referralCode.trim();
    return payload;
  };

  const googleDisabled =
    !form.legalAccepted ||
    (role === 'worker' &&
      (!form.phone.trim() || !form.city.trim() || form.skills.length === 0));

  const registerWithGoogle = async (credential) => {
    setError('');
    setSuccess('');
    setGoogleSubmitting(true);

    try {
      const response = await apiPost('/auth/google/register', {
        ...googleRegistrationPayload(),
        credential,
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('userName', user.name || '');
      window.location.href =
        user.role === 'worker' ? '/worker/profile' : '/client/profile';
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(' ')
          : message || 'Google регистрацията не беше успешна.',
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <AuthShell role={role}>
      <form
        onSubmit={submit}
        className="registration-form-panel registration-production-form"
      >
        <RoleSelector role={role} onChange={setRole} />
        <div className="registration-form-heading">
          <div>
            <h1>{role === 'worker' ? 'Създай профил на майстор' : 'Създай клиентски профил'}</h1>
            <p>{role === 'worker' ? 'Добавете информация за дейността и района си.' : 'Създайте профил и започнете да разглеждате майстори.'}</p>
          </div>
        </div>
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
            className="registration-production-input"
            value={form.name}
            onChange={change}
            required
          />
        ) : (
          <>
            <input
              name="fullName"
              placeholder="Трите имена"
              className="registration-production-input"
              value={form.fullName}
              onChange={change}
              required
            />

            <input
              name="phone"
              placeholder="Телефон"
              className="registration-production-input"
              value={form.phone}
              onChange={change}
              required
            />

            <input
              name="city"
              placeholder="Град"
              className="registration-production-input"
              value={form.city}
              onChange={change}
              required
            />

            <fieldset className="registration-specialties registration-production-specialties">
              <legend>Категории услуги</legend>
              <div>
              {WORKER_SKILL_OPTIONS.map((skill) => (
                <button
                  type="button"
                  key={skill.key}
                  onClick={() => toggleSkill(skill.key)}
                  className={form.skills.includes(skill.key) ? 'is-selected' : ''}
                >
                  {skill.label}
                </button>
              ))}
              </div>
            </fieldset>
          </>
        )}

        <div className="registration-production-referral">
          <label className="mb-2 block text-sm font-semibold text-gray-300">
            Referral код
          </label>
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="Например BRABC123"
            className="registration-production-input"
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
          className="registration-production-input"
          value={form.email}
          onChange={change}
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Парола"
          className="registration-production-input"
          value={form.password}
          onChange={change}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby="password-requirements"
          required
        />

        <p id="password-requirements" className="text-sm text-gray-400">
          {PASSWORD_REQUIREMENTS}
        </p>

        <input
          name="confirmPassword"
          type="password"
          placeholder="Потвърди парола"
          className="registration-production-input"
          value={form.confirmPassword}
          onChange={change}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
        />

        <label className="registration-consent registration-production-consent">
          <input
            name="legalAccepted"
            type="checkbox"
            checked={form.legalAccepted}
            onChange={change}
            className="mt-1 h-4 w-4 accent-emerald-500"
            required
          />
          <span>
            Прочетох и приемам{' '}
            <Link className="font-bold text-emerald-300 underline" to="/terms" target="_blank">
              Условията за ползване
            </Link>{' '}
            и{' '}
            <Link className="font-bold text-emerald-300 underline" to="/privacy" target="_blank">
              Политиката за поверителност
            </Link>
            .
          </span>
        </label>

        <GoogleRegisterButton
          disabled={googleDisabled || submitting}
          loading={googleSubmitting}
          onCredential={registerWithGoogle}
          onError={setError}
        />

        <div className="registration-production-divider">
          <span className="h-px flex-1 bg-gray-700" />
          или с имейл и парола
          <span className="h-px flex-1 bg-gray-700" />
        </div>

        <button
          disabled={submitting || googleSubmitting || Boolean(success) || !form.legalAccepted}
          className="registration-primary-action registration-login-submit"
        >
          {submitting ? 'Регистриране...' : 'Регистрация'}
        </button>
      </form>
    </AuthShell>
  );
}

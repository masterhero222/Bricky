import { useState } from 'react';
import { apiPost } from '../../services/api';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  passwordPolicyError,
} from '../../utils/passwordPolicy';

import { REPAIR_CATEGORY_OPTIONS } from '../../constants/repairCatalog';

const WORKER_SKILL_OPTIONS = REPAIR_CATEGORY_OPTIONS.map((category) => ({
  key: category.key,
  label: category.shortLabel || category.label,
}));

export default function WorkersRegister() {
  const [referralCode, setReferralCode] = useState(
    () => new URLSearchParams(window.location.search).get('ref') || '',
  );
  const [form, setForm] = useState({
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSkillToggle = (skill) => {
    setForm((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError('Паролите не съвпадат.');
      return;
    }


    const passwordError = passwordPolicyError(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (
      !form.fullName ||
      !form.email ||
      !form.phone ||
      !form.city ||
      !form.skills.length
    ) {
      setError('Всички полета са задължителни.');
      return;
    }

    const payload = {
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      phone: form.phone,
      city: form.city,
      skills: form.skills,
    };
    if (referralCode.trim()) payload.referralCode = referralCode.trim();

    try {
      const response = await apiPost('/auth/register', {
        ...payload,
        role: 'worker',
      });
      setSuccess(
        response.data?.emailVerification?.deliveryStatus === 'failed'
          ? 'Регистрацията е успешна, но имейлът не беше доставен. Влезте и изпратете нов линк от Настройки.'
          : 'Успешна регистрация. Проверете имейла си за линк за потвърждение.',
      );
      setError('');
      setForm({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        city: '',
        skills: [],
      });
    } catch {
      setError('Грешка при регистрацията');
      setSuccess('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-24 px-6 flex flex-col items-center">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-2xl w-full max-w-xl shadow-xl space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">
          Регистрация на майстор
        </h2>

        <input
          name="fullName"
          value={form.fullName}
          placeholder="Трите имена"
          onChange={handleChange}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby="worker-password-requirements"
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <p id="worker-password-requirements" className="text-sm text-gray-400">
          {PASSWORD_REQUIREMENTS}
        </p>

        <input
          name="email"
          value={form.email}
          placeholder="Имейл"
          onChange={handleChange}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Парола"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          name="confirmPassword"
          type="password"
          placeholder="Потвърди паролата"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          name="phone"
          value={form.phone}
          placeholder="Телефон"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

        <input
          name="city"
          value={form.city}
          placeholder="Населено място"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700"
          required
        />

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
            <p className="mt-2 text-sm text-green-300">Поканата е добавена.</p>
          ) : null}
        </div>

        <div>
          <p className="font-semibold mb-2">Специалности:</p>
          <div className="flex flex-wrap gap-3">
            {WORKER_SKILL_OPTIONS.map((skill) => (
              <button
                key={skill.key}
                type="button"
                onClick={() => handleSkillToggle(skill.key)}
                className={`px-4 py-2 rounded-full border ${
                  form.skills.includes(skill.key)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-600'
                }`}
              >
                {skill.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400">{error}</p>}
        {success && <p className="text-green-400">{success}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 py-3 rounded font-bold"
        >
          Регистрация
        </button>
      </form>
    </div>
  );
}

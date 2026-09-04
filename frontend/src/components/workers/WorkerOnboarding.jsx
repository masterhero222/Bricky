import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Phone,
  X,
} from 'lucide-react';
import { REPAIR_CATEGORY_OPTIONS } from '../../constants/repairCatalog';

const STEP_KEYS = ['contact', 'activity', 'acquisition', 'readiness'];

const STEP_FIELDS = {
  contact: ['phone', 'preferredContactMethod', 'contactAccuracyConfirmed'],
  activity: [
    'primaryCategoryKey',
    'skills',
    'workType',
    'experienceRange',
    'city',
    'availabilityStatus',
  ],
  acquisition: ['acquisitionSourceSelfReported', 'acquisitionSourceDetail'],
  readiness: ['projectPhotosReadiness', 'serviceDescriptionReadiness'],
};

const SOURCE_OPTIONS = [
  ['founder_outreach', 'Цветослав се свърза с мен'],
  ['worker_referral', 'Препоръка от майстор'],
  ['client_referral', 'Препоръка от клиент или познат'],
  ['facebook_group', 'Facebook група'],
  ['facebook_instagram_ad', 'Facebook или Instagram реклама'],
  ['tiktok', 'TikTok'],
  ['google_search', 'Google търсене'],
  ['flyer_qr', 'Флаер или QR код'],
  ['partner', 'Партньор'],
  ['other', 'Друго'],
];

export function WorkerProfileGuidanceCard({ state, onContinue, onNavigate }) {
  const completion = state?.completion;
  if (!completion) return null;
  const percentage = Number(completion.percentage || 0);
  const missing = completion.missingItems || [];

  return (
    <section className="mb-7 rounded-lg border border-cyan-400/20 bg-[#0b2033] p-5 shadow-lg shadow-cyan-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-300">
            {percentage === 100 ? 'Профилът е готов' : `Профилът ти е ${percentage}% готов`}
          </p>
          <h2 className="mt-1 text-xl font-bold">Дай на клиентите достатъчно информация за сравнение</h2>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-bold hover:bg-emerald-500"
        >
          Продължи профила <ArrowRight size={17} />
        </button>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded bg-slate-800" aria-label={`${percentage}% завършен профил`}>
        <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${percentage}%` }} />
      </div>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {missing.slice(0, 6).map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onNavigate(item.target)}
              className="flex w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-left text-sm text-slate-200 hover:border-cyan-500/50"
            >
              <CircleAlert size={16} className="shrink-0 text-amber-300" />
              {item.label}
            </button>
          </li>
        ))}
        {!missing.length && (
          <li className="flex items-center gap-2 text-sm text-emerald-300">
            <Check size={17} /> Всички основни елементи са попълнени.
          </li>
        )}
      </ul>
    </section>
  );
}

export function WorkerOnboardingModal({ state, onSaveStep, onClose }) {
  const initialStep = Math.min(4, Math.max(1, Number(state?.currentStep || 1)));
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStep(initialStep);
    setDraft({
      phone: state?.contact?.phone || '',
      preferredContactMethod: state?.contact?.preferredContactMethod || '',
      contactAccuracyConfirmed: Boolean(state?.contact?.contactAccuracyConfirmed),
      primaryCategoryKey: state?.activity?.primaryCategoryKey || '',
      skills: state?.activity?.skills || [],
      workType: state?.activity?.workType || '',
      experienceRange: state?.activity?.experienceRange || '',
      city: state?.activity?.city || '',
      availabilityStatus: state?.activity?.availabilityStatus || '',
      acquisitionSourceSelfReported: state?.acquisition?.source || '',
      acquisitionSourceDetail: state?.acquisition?.detail || '',
      projectPhotosReadiness: state?.readiness?.projectPhotosReadiness || '',
      serviceDescriptionReadiness: state?.readiness?.serviceDescriptionReadiness || '',
    });
  }, [initialStep, state]);

  const stepKey = STEP_KEYS[step - 1];
  const needsSourceDetail = ['worker_referral', 'partner', 'other'].includes(
    draft.acquisitionSourceSelfReported,
  );
  const categoryOptions = useMemo(
    () => REPAIR_CATEGORY_OPTIONS.map((item) => [item.key, item.shortLabel || item.label]),
    [],
  );

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function toggleSkill(key) {
    const current = draft.skills || [];
    update(
      'skills',
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const stepPayload = Object.fromEntries(
        STEP_FIELDS[stepKey].map((field) => [field, draft[field]]),
      );
      await onSaveStep(stepKey, stepPayload);
      if (step < 4) setStep((current) => current + 1);
      else onClose();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Неуспешно запазване';
      setError(Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-label="Onboarding за майстор">
      <form onSubmit={submit} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-cyan-400/25 bg-[#081827] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-300">Стъпка {step} от 4</p>
            <h2 className="mt-1 text-2xl font-bold">{['Контакт', 'Дейност', 'Как научихте за Bricky?', 'Готовност на профила'][step - 1]}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md border border-slate-600" aria-label="Продължи по-късно">
            <X size={20} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2" aria-hidden="true">
          {STEP_KEYS.map((key, index) => <span key={key} className={`h-1 rounded ${index < step ? 'bg-emerald-500' : 'bg-slate-700'}`} />)}
        </div>

        <div className="mt-6 space-y-5">
          {step === 1 && (
            <>
              <Field label="Телефон за връзка">
                <div className="flex items-center rounded-md border border-slate-600 bg-slate-950 px-3 focus-within:border-cyan-400">
                  <Phone size={18} className="text-slate-400" />
                  <input value={draft.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="0888 123 456" className="w-full bg-transparent px-3 py-3 outline-none" required />
                </div>
              </Field>
              <Field label="Предпочитан начин за контакт">
                <select value={draft.preferredContactMethod || ''} onChange={(e) => update('preferredContactMethod', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required>
                  <option value="">Избери</option><option value="phone">Телефон</option><option value="viber">Viber</option><option value="whatsapp">WhatsApp</option><option value="email">Имейл</option>
                </select>
              </Field>
              <label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" checked={Boolean(draft.contactAccuracyConfirmed)} onChange={(e) => update('contactAccuracyConfirmed', e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500" required />Потвърждавам, че данните са точни и Bricky може да ги използва за връзка по заявките.</label>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="С какво се занимавате основно?">
                <select value={draft.primaryCategoryKey || ''} onChange={(e) => update('primaryCategoryKey', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required><option value="">Избери категория</option>{categoryOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              </Field>
              <Field label="Допълнителни специалности">
                <div className="grid gap-2 sm:grid-cols-2">{categoryOptions.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm"><input type="checkbox" checked={(draft.skills || []).includes(key)} onChange={() => toggleSkill(key)} className="accent-emerald-500" />{label}</label>)}</div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Работите като"><select value={draft.workType || ''} onChange={(e) => update('workType', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required><option value="">Избери</option><option value="solo">Самостоятелен майстор</option><option value="team">Бригада</option><option value="company">Фирма</option></select></Field>
                <Field label="Опит"><select value={draft.experienceRange || ''} onChange={(e) => update('experienceRange', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required><option value="">Избери</option><option value="under_1">Под 1 година</option><option value="1_3">1–3 години</option><option value="4_7">4–7 години</option><option value="8_15">8–15 години</option><option value="15_plus">15+ години</option></select></Field>
                <Field label="Град / район"><input value={draft.city || ''} onChange={(e) => update('city', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required /></Field>
                <Field label="Приемате ли нови обекти?"><select value={draft.availabilityStatus || ''} onChange={(e) => update('availabilityStatus', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required><option value="">Избери</option><option value="yes">Да</option><option value="limited">Ограничено</option><option value="no">Не</option></select></Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Как научихте за Bricky?"><select value={draft.acquisitionSourceSelfReported || ''} onChange={(e) => update('acquisitionSourceSelfReported', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required><option value="">Избери</option>{SOURCE_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
              {needsSourceDetail && <Field label="Кратко уточнение"><input value={draft.acquisitionSourceDetail || ''} onChange={(e) => update('acquisitionSourceDetail', e.target.value)} maxLength={180} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required /></Field>}
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Имате ли снимки от реални завършени обекти?"><select value={draft.projectPhotosReadiness || ''} onChange={(e) => update('projectPhotosReadiness', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required><option value="">Избери</option><option value="ready">Да, готови са</option><option value="needs_preparation">Имам, но трябва да ги подготвя</option><option value="none">Не</option></select></Field>
              <Field label="Имате ли кратко описание на услугите си?"><select value={draft.serviceDescriptionReadiness || ''} onChange={(e) => update('serviceDescriptionReadiness', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-3" required><option value="">Избери</option><option value="yes">Да</option><option value="no">Не</option></select></Field>
            </>
          )}
        </div>

        {error && <p className="mt-5 whitespace-pre-line rounded-md border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
        <div className="mt-7 flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-4 py-3 text-sm font-semibold"><ArrowLeft size={17} />{step > 1 ? 'Назад' : 'По-късно'}</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-bold disabled:opacity-60">{saving ? 'Запазване...' : step === 4 ? 'Завърши' : 'Запази и продължи'}<ArrowRight size={17} /></button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span>{children}</label>;
}

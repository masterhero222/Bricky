import { Flag, X } from 'lucide-react';
import { useState } from 'react';
import { apiPost, getToken } from '../services/api';

const categories = [
  ['misleading', 'Подвеждаща информация'],
  ['inappropriate', 'Неподходящо съдържание'],
  ['privacy', 'Лични данни'],
  ['spam', 'Спам'],
  ['other', 'Друго'],
];

export default function ReportContentButton({
  targetType,
  targetId,
  label = 'Сигнализирай профила',
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('misleading');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!getToken()) {
      setStatus('Влезте в профила си, за да изпратите сигнал.');
      return;
    }
    if (category === 'other' && details.trim().length < 10) {
      setStatus('Опишете проблема с поне 10 знака.');
      return;
    }
    setSubmitting(true);
    setStatus('');
    try {
      await apiPost('/reports', {
        targetType,
        targetId: Number(targetId),
        category,
        details: details.trim() || undefined,
      });
      setStatus('Сигналът е изпратен за преглед.');
      setTimeout(() => setOpen(false), 900);
    } catch (error) {
      setStatus(error?.response?.data?.message || 'Сигналът не беше изпратен.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-red-300"
      >
        <Flag size={16} /> {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg border border-slate-600 bg-[#0b1b2b] p-6 text-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-red-300">Сигнал</p>
                <h2 className="mt-1 text-xl font-black">Какъв е проблемът?</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Затвори"
              >
                <X />
              </button>
            </div>
            <label
              className="mt-5 block text-sm font-bold"
              htmlFor="report-category"
            >
              Причина
            </label>
            <select
              id="report-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full border border-slate-600 bg-[#07111f] p-3"
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label
              className="mt-4 block text-sm font-bold"
              htmlFor="report-details"
            >
              Подробности
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={4}
              className="mt-2 w-full border border-slate-600 bg-[#07111f] p-3"
              placeholder="Не включвайте чужди лични данни."
            />
            {status && (
              <p className="mt-3 text-sm text-amber-200" role="status">
                {status}
              </p>
            )}
            <button
              disabled={submitting}
              className="mt-5 w-full bg-red-600 px-5 py-3 font-bold disabled:opacity-50"
            >
              {submitting ? 'Изпращане...' : 'Изпрати сигнал'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

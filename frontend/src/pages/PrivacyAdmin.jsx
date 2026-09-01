import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '../services/api';

const labels = {
  access: 'Достъп',
  rectification: 'Корекция',
  erasure: 'Заличаване',
  restriction: 'Ограничаване',
  objection: 'Възражение',
};

export default function PrivacyAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/admin/privacy/requests');
      setItems(response.data || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Заявките не могат да бъдат заредени.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function update(item) {
    setError('');
    try {
      await apiPut(`/admin/privacy/requests/${item.id}`, {
        status: item.status,
        responseNotes: item.responseNotes || '',
      });
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Промяната не беше запазена.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300"><ArrowLeft size={16} /> Backoffice</Link>
            <h1 className="mt-3 text-2xl font-extrabold">Лични данни и GDPR заявки</h1>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-bold"><RefreshCw size={16} /> Обнови</button>
        </header>
        {error && <p className="mt-5 rounded-md border border-red-500/40 bg-red-950/40 p-3 text-red-200">{error}</p>}
        <div className="mt-6 space-y-4">
          {loading ? <p className="text-slate-400">Зареждане...</p> : items.length === 0 ? <p className="text-slate-400">Няма регистрирани искания.</p> : items.map((item) => (
            <article key={item.id} className="rounded-md border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-extrabold">#{item.id} · {labels[item.requestType] || item.requestType}</h2>
                  <p className="mt-1 text-sm text-slate-400">{item.user?.name} · {item.user?.email || 'без активен имейл'} · срок {new Date(item.dueAt).toLocaleDateString('bg-BG')}</p>
                </div>
                <select value={item.status} onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value } : entry))} className="rounded-md border border-slate-700 bg-slate-950 px-3">
                  <option value="submitted">Нова</option>
                  <option value="in_review">В преглед</option>
                  <option value="completed">Приключена</option>
                  <option value="rejected">Отказана</option>
                </select>
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-300">{item.details}</p>
              <textarea value={item.responseNotes || ''} onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, responseNotes: event.target.value } : entry))} maxLength={4000} placeholder="Вътрешна бележка и резултат (задължително при приключване/отказ)" className="mt-4 min-h-24 w-full rounded-md border border-slate-700 bg-slate-950 p-3" />
              <div className="mt-3 flex justify-end"><button onClick={() => update(item)} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold"><Save size={16} /> Запази</button></div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

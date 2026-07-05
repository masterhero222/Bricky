import { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, RefreshCw, ShieldCheck, X } from "lucide-react";
import { apiGet, apiPost } from "../services/api";

export default function AdminPanel() {
  const [tab, setTab] = useState("requests");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("pending_review");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ pendingRequests: 0, pendingMedia: 0, pendingWorkers: 0, pendingReviews: 0 });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const [dashboard, queue] = await Promise.all([
      apiGet("/admin/dashboard"),
      apiGet(`/admin/${tab}?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}&page=${page}&limit=25`),
    ]);
    setSummary(dashboard.data); setItems(queue.data || []); setLoading(false);
  }, [tab, query, status, page]);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  const moderate = async (id, action) => {
    const reason = action === "approved" ? "" : window.prompt("Причина за модерацията:") || "";
    if (action !== "approved" && !reason.trim()) return;
    const item = items.find((entry) => entry.id === id);
    let path = `/admin/${tab}/${id}/${action}`;
    if (tab === "media" && item?.source === "gallery") path = `/admin/media/gallery/${id}/${action}`;
    if (tab === "media" && item?.source === "avatar") path = `/admin/workers/${id}/avatar/${action}`;
    if (tab === "workers") path = `/admin/workers/${id}/profile/${action}`;
    await apiPost(path, { reason }); await load();
  };
  return <section className="bricky-page min-h-[calc(100vh-78px)] py-10"><div className="bricky-container space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-300">Moderation gate</p><h1 className="text-4xl font-black">Административен панел</h1></div><button className="bricky-button-secondary" onClick={load}><RefreshCw size={18}/> Обнови</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat title="Заявки" value={summary.pendingRequests}/><Stat title="Снимки" value={summary.pendingMedia}/><Stat title="Майстори" value={summary.pendingWorkers}/><Stat title="Ревюта" value={summary.pendingReviews}/></div>
    <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">{[["requests","Заявки"],["media","Снимки"],["workers","Майстори"],["reviews","Ревюта"]].map(([key,name]) => <button key={key} onClick={() => { setTab(key); setPage(1); }} className={`rounded-lg px-5 py-3 font-bold ${tab === key ? "bg-green-500 text-slate-950" : "bg-slate-800"}`}>{name}</button>)}</div>
    <div className="bricky-card grid gap-3 p-4 md:grid-cols-[1fr_240px]">
      <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Търси в опашката..." className="rounded-xl border border-slate-600 bg-[#0d1728] px-4 py-3 text-white outline-none focus:border-cyan-300"/>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-600 bg-[#0d1728] px-4 py-3 text-white">
        <option value="pending_review">Чака преглед</option><option value="approved">Одобрено</option><option value="rejected">Отхвърлено</option><option value="hidden">Скрито</option>
      </select>
    </div>
    {loading ? <p>Зареждане...</p> : items.length === 0 ? <div className="bricky-card p-10 text-center text-slate-300"><ShieldCheck className="mx-auto mb-3 text-green-300"/>Няма съдържание за този филтър.</div> : <div className="grid gap-4">{items.map(item => <QueueItem key={`${item.source || tab}-${item.id}`} item={item} type={tab} onAction={moderate}/>)}</div>}
    <div className="flex items-center justify-end gap-3"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg bg-slate-800 px-4 py-2 font-bold disabled:opacity-40">Назад</button><span className="text-slate-300">Страница {page}</span><button disabled={items.length < 25} onClick={() => setPage((value) => value + 1)} className="rounded-lg bg-slate-800 px-4 py-2 font-bold disabled:opacity-40">Напред</button></div>
  </div></section>;
}
function Stat({ title, value }) { return <div className="bricky-card p-6"><p className="text-slate-400">{title}</p><strong className="text-4xl">{value}</strong></div>; }
function QueueItem({ item, type, onAction }) { return <article className="bricky-card flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
  {type === "media" && <img src={item.url} alt="Съдържание за модерация" className="h-32 w-48 rounded-lg object-cover"/>}
  <div className="min-w-0 flex-1"><span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-200">Чака преглед</span><h2 className="mt-3 text-xl font-black">{queueTitle(item, type)}</h2><p className="mt-2 text-slate-300">{item.description || item.comment || item.name || item.url || item.city || "Без допълнително описание"}</p></div>
  <div className="flex flex-wrap gap-2"><button onClick={() => onAction(item.id,"approved")} className="bricky-button-primary"><Check size={17}/> Одобри</button><button onClick={() => onAction(item.id,"rejected")} className="rounded-lg bg-red-500/15 px-4 py-3 font-bold text-red-200"><X size={17} className="inline"/> Отхвърли</button><button onClick={() => onAction(item.id,"hidden")} className="rounded-lg bg-slate-700 px-4 py-3 font-bold"><EyeOff size={17} className="inline"/> Скрий</button></div>
</article>; }
function queueTitle(item, type) {
  if (type === "requests") return `#${item.id} · ${item.category || "Заявка"}`;
  if (type === "workers") return item.fullName || `Майстор #${item.id}`;
  if (type === "reviews") return `Ревю #${item.id} · ${item.rating}/5`;
  return `${item.source === "avatar" ? "Аватар" : item.source === "gallery" ? "Галерия" : "Снимка към заявка"} #${item.id}`;
}

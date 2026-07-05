import { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, RefreshCw, ShieldCheck, X } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "../services/api";

export default function AdminPanel() {
  const [tab, setTab] = useState("requests");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("pending_review");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
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
  const editRequest = async (item) => {
    const category = window.prompt("Категория:", item.category || "");
    if (category == null) return;
    const description = window.prompt("Описание:", item.description || "");
    if (description == null) return;
    const address = window.prompt("Адрес:", item.address || "");
    if (address == null) return;
    const reason = window.prompt("Причина за административната корекция:") || "";
    if (!reason.trim()) return;
    await apiPut(`/admin/requests/${item.id}`, { category, description, address, reason });
    setSelected(null);
    await load();
  };
  const deleteRequest = async (item) => {
    const reason = window.prompt("Причина за изтриване (например спам):") || "";
    if (!reason.trim() || !window.confirm(`Изтриване на заявка #${item.id}?`)) return;
    await apiDelete(`/admin/requests/${item.id}`, { data: { reason } });
    setSelected(null);
    await load();
  };
  return <section className="bricky-page min-h-[calc(100vh-78px)] py-10"><div className="bricky-container space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-300">Moderation gate</p><h1 className="text-4xl font-black">Административен панел</h1></div><button className="bricky-button-secondary" onClick={load}><RefreshCw size={18}/> Обнови</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat title="Чакащи заявки" value={summary.pendingRequests}/><Stat title="Чакащи снимки" value={summary.pendingMedia}/><Stat title="Чакащи майстори" value={summary.pendingWorkers}/><Stat title="Чакащи ревюта" value={summary.pendingReviews}/><Stat title="Активни заявки" value={summary.activeRequests}/><Stat title="Завършени заявки" value={summary.completedRequests}/><Stat title="Активни потребители" value={summary.activeUsers}/><Stat title="Одобрени майстори" value={summary.activeWorkers}/></div>
    <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">{[["requests","Заявки"],["media","Снимки"],["workers","Майстори"],["reviews","Ревюта"]].map(([key,name]) => <button key={key} onClick={() => { setTab(key); setPage(1); }} className={`rounded-lg px-5 py-3 font-bold ${tab === key ? "bg-green-500 text-slate-950" : "bg-slate-800"}`}>{name}</button>)}</div>
    <div className="bricky-card grid gap-3 p-4 md:grid-cols-[1fr_240px]">
      <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Търси в опашката..." className="rounded-xl border border-slate-600 bg-[#0d1728] px-4 py-3 text-white outline-none focus:border-cyan-300"/>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-600 bg-[#0d1728] px-4 py-3 text-white">
        <option value="pending_review">Чака преглед</option><option value="approved">Одобрено</option><option value="rejected">Отхвърлено</option><option value="hidden">Скрито</option>
      </select>
    </div>
    {loading ? <p>Зареждане...</p> : items.length === 0 ? <div className="bricky-card p-10 text-center text-slate-300"><ShieldCheck className="mx-auto mb-3 text-green-300"/>Няма съдържание за този филтър.</div> : <div className="grid gap-4">{items.map(item => <QueueItem key={`${item.source || tab}-${item.id}`} item={item} type={tab} onAction={moderate} onView={() => setSelected(item)}/>)}</div>}
    <div className="flex items-center justify-end gap-3"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg bg-slate-800 px-4 py-2 font-bold disabled:opacity-40">Назад</button><span className="text-slate-300">Страница {page}</span><button disabled={items.length < 25} onClick={() => setPage((value) => value + 1)} className="rounded-lg bg-slate-800 px-4 py-2 font-bold disabled:opacity-40">Напред</button></div>
    {summary.recentActions?.length > 0 && <section className="bricky-card p-5"><h2 className="text-xl font-black">Последни административни действия</h2><div className="mt-4 grid gap-2">{summary.recentActions.slice(0, 5).map((action) => <p key={action.id} className="rounded-lg bg-slate-900/70 p-3 text-sm text-slate-300"><strong className="text-white">{action.action}</strong> · {action.targetType} #{action.targetId}</p>)}</div></section>}
    {selected && <DetailDrawer item={selected} type={tab} onClose={() => setSelected(null)} onEdit={editRequest} onDelete={deleteRequest}/>}
  </div></section>;
}
function Stat({ title, value }) { return <div className="bricky-card p-6"><p className="text-slate-400">{title}</p><strong className="text-4xl">{value}</strong></div>; }
function QueueItem({ item, type, onAction, onView }) { return <article className="bricky-card flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
  {type === "media" && <img src={item.url} alt="Съдържание за модерация" className="h-32 w-48 rounded-lg object-cover"/>}
  <div className="min-w-0 flex-1"><span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-200">Чака преглед</span><h2 className="mt-3 text-xl font-black">{queueTitle(item, type)}</h2><p className="mt-2 text-slate-300">{item.description || item.comment || item.name || item.url || item.city || "Без допълнително описание"}</p></div>
  <div className="flex flex-wrap gap-2"><button onClick={onView} className="rounded-lg border border-slate-600 px-4 py-3 font-bold">Детайли</button><button onClick={() => onAction(item.id,"approved")} className="bricky-button-primary"><Check size={17}/> Одобри</button><button onClick={() => onAction(item.id,"rejected")} className="rounded-lg bg-red-500/15 px-4 py-3 font-bold text-red-200"><X size={17} className="inline"/> Отхвърли</button><button onClick={() => onAction(item.id,"hidden")} className="rounded-lg bg-slate-700 px-4 py-3 font-bold"><EyeOff size={17} className="inline"/> Скрий</button></div>
</article>; }
function DetailDrawer({ item, type, onClose, onEdit, onDelete }) { return <div className="fixed inset-0 z-[80] flex justify-end bg-black/60" onClick={onClose}><aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-600 bg-[#0b1525] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-cyan-300">{type}</p><h2 className="mt-1 text-2xl font-black">{queueTitle(item, type)}</h2></div><button onClick={onClose} aria-label="Затвори детайлите" className="rounded-lg bg-slate-800 p-3"><X/></button></div>{item.url && <img src={item.url} alt="Преглед" className="mt-6 max-h-80 w-full rounded-xl object-contain"/>}{type === "requests" && <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => onEdit(item)} className="bricky-button-secondary">Коригирай заявката</button><button onClick={() => onDelete(item)} className="rounded-lg bg-red-500/15 px-4 py-3 font-bold text-red-200">Изтрий като спам</button></div>}<dl className="mt-6 grid gap-3">{Object.entries(item).filter(([,value]) => value != null && typeof value !== "object").map(([key,value]) => <div key={key} className="rounded-xl bg-slate-900/80 p-4"><dt className="text-xs font-bold uppercase text-slate-500">{key}</dt><dd className="mt-1 break-words text-slate-100">{String(value)}</dd></div>)}</dl></aside></div>; }
function queueTitle(item, type) {
  if (type === "requests") return `#${item.id} · ${item.category || "Заявка"}`;
  if (type === "workers") return item.fullName || `Майстор #${item.id}`;
  if (type === "reviews") return `Ревю #${item.id} · ${item.rating}/5`;
  return `${item.source === "avatar" ? "Аватар" : item.source === "gallery" ? "Галерия" : "Снимка към заявка"} #${item.id}`;
}

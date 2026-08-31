import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { knowledgeApi, knowledgeError } from '../../services/knowledge';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { mediaUrl } from '../../utils/mediaUrls';
import { articlePath } from '../../components/knowledge/content';
import './Knowledge.css';

export function KnowledgeCard({ article }) {
  return <article className="knowledge-card"><Link to={articlePath(article)}>
    {article.heroImage && <img src={mediaUrl(article.heroImage.url)} alt={article.heroImage.alt} loading="lazy" />}
    <div><h3>{article.title}</h3><p>{article.excerpt}</p><span>Прочети <ArrowRight size={16} /></span></div>
  </Link></article>;
}

export default function KnowledgeIndex() {
  const { section: sectionParam, repairKey } = useParams();
  const section = repairKey ? 'repairs' : sectionParam;
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setSearch(q); }, [q]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([knowledgeApi.metadata(false, controller.signal), knowledgeApi.list({ rubric: repairKey ? undefined : section, repair: repairKey, q, page, limit: 24 }, false, controller.signal)])
      .then(([metadata, articles]) => { setData({ metadata, ...articles }); })
      .catch(e => { if (!controller.signal.aborted) setError(knowledgeError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [section, repairKey, q, page, retry]);
  const rubric = data?.metadata.rubrics.find(r => r.slug === section);
  const repair = data?.metadata.categories.find(c => c.categoryKey === repairKey);
  const missing = !loading && !error && ((section && !rubric) || (repairKey && !repair));
  const title = repair?.label || rubric?.label || 'Център за ремонти';
  useDocumentMeta({ title: `${title} | Bricky`, description: repair?.description || rubric?.description || 'Ремонтни дейности, ориентировъчни цени и избор на майстор.', canonicalPath: repairKey ? `/knowledge/repairs/${repairKey}` : section ? `/knowledge/${section}` : '/knowledge', robots: q || missing || error || (!loading && !data?.total && section) ? 'noindex,follow' : 'index,follow' });
  if (missing) return <div className="knowledge-root knowledge-container"><h1>Разделът не е намерен</h1><Link to="/knowledge">Към Центъра за ремонти</Link></div>;
  const matchedCategories = data?.metadata.categories.filter(category => !q || q.toLocaleLowerCase('bg').split(/\s+/).every(word => `${category.label} ${category.description || ''}`.toLocaleLowerCase('bg').includes(word))) || [];
  function updatePage(value) { const next = new URLSearchParams(params); next.set('page', String(value)); setParams(next); window.scrollTo(0, 0); }
  return <div className="knowledge-root">
    <div className="knowledge-container">
      <nav className="knowledge-breadcrumb" aria-label="Навигационна пътека"><Link to="/">Начало</Link><span>/</span><Link to="/knowledge">Център за ремонти</Link>{section && <><span>/</span><span>{title}</span></>}</nav>
      <header className={`knowledge-heading ${!section ? 'knowledge-home-heading' : ''}`}>
        <div><span className="knowledge-eyebrow">BRICKY</span><h1>{title}</h1><p>{repair?.description || rubric?.description || 'Разбери ремонта преди да го започнеш.'}</p></div>
        <form role="search" onSubmit={event => { event.preventDefault(); setParams(search.trim() ? { q: search.trim() } : {}); }}><label htmlFor="knowledge-search">Какво искаш да ремонтираш или разбереш?</label><div className="knowledge-search"><Search size={20} /><input id="knowledge-search" value={search} onChange={e => setSearch(e.target.value)} maxLength={160} type="search" placeholder="Например: цена за баня" /><button type="submit" aria-label="Търси" title="Търси"><ArrowRight size={20} /></button></div></form>
      </header>
      {data && <nav className="knowledge-sections" aria-label="Рубрики"><Link to="/knowledge" aria-current={!section ? 'page' : undefined}>Всички</Link>{data.metadata.rubrics.map(r => <Link key={r.id} to={`/knowledge/${r.slug}`} aria-current={section === r.slug ? 'page' : undefined}>{r.label}</Link>)}</nav>}
      {error ? <div role="alert" className="knowledge-empty"><p>{error}</p><button onClick={() => setRetry(r => r + 1)}>Опитай отново</button></div> : loading ? <p role="status" className="knowledge-empty">Зареждане...</p> : <>
        {(!section || section === 'repairs') && !repairKey && matchedCategories.length > 0 && <section className="knowledge-band"><h2>{q ? 'Ремонтни категории' : 'Какъв ремонт планираш?'}</h2><div className="knowledge-category-grid">{matchedCategories.map(category => <Link key={category.id} to={`/knowledge/repairs/${category.categoryKey}`}><BookOpen size={19} /><span>{category.label}</span><ArrowRight size={16} /></Link>)}</div></section>}
        <section className="knowledge-band"><div className="knowledge-section-title"><h2>{q ? `Резултати за „${q}“` : section ? 'Статии и ръководства' : 'Въпроси и решения'}</h2><span>{data?.total || 0} статии</span></div>
          {data?.items.length ? <div className="knowledge-card-grid">{data.items.map(article => <KnowledgeCard key={article.id} article={article} />)}</div> : <div className="knowledge-empty"><p>{q ? 'Няма резултати по това търсене.' : 'Все още няма публикувани статии в този раздел.'}</p><Link to="/knowledge">Всички теми <ArrowRight size={16} /></Link></div>}
          {data?.total > data.limit && <nav className="knowledge-pagination" aria-label="Страници"><button disabled={page === 1} onClick={() => updatePage(page - 1)}>Назад</button><span>{page} / {Math.ceil(data.total / data.limit)}</span><button disabled={page * data.limit >= data.total} onClick={() => updatePage(page + 1)}>Напред</button></nav>}
        </section>
        {repair && <section className="knowledge-cta"><h2>Планираш {repair.label.toLocaleLowerCase('bg')}?</h2><Link to={`/requests?category=${encodeURIComponent(repair.categoryKey)}`}>Изчисли ориентировъчна цена <ArrowRight size={18} /></Link></section>}
      </>}
    </div>
  </div>;
}

const legacyRubrics = { 'kolko-struva': 'prices', 'cherven-flag': 'red-flags', 'briki-obyasnyava': 'guides', 'istinski-obekti': 'projects', 'remontni-dilemi': 'repairs', 'za-profesionalisti': 'workers', 'stroim-bricky': 'how-bricky-works' };
export function LegacyBlogIndex() {
  const [params] = useSearchParams();
  const section = legacyRubrics[params.get('rubrika')];
  return <Navigate replace to={section ? `/knowledge/${section}` : '/knowledge'} />;
}

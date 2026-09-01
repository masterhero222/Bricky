import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Eye, FilePlus2, Pencil, Save, Search, Trash2, X } from 'lucide-react';
import { knowledgeApi, knowledgeError, validateKnowledgeArticle } from '../../services/knowledge';
import { articlePath, contentTypeLabels, newTextBlock } from '../../components/knowledge/content';
import ContentEditor, { ImageFields, ToolButton, UploadButton } from '../../components/knowledge/ContentEditor';
import KnowledgeArticleView from '../../components/knowledge/KnowledgeArticleView';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import './Knowledge.css';
import './KnowledgeAdmin.css';

const emptyArticle = rubricId => ({ title: '', slug: '', excerpt: '', status: 'draft', contentType: 'ARTICLE', rubricId, repairCategoryId: null, tags: [], keywords: [], tagsInput: '', keywordsInput: '', blocks: [newTextBlock()], heroImage: null, seoTitle: '', seoDescription: '', author: 'Екипът на Bricky', calculatorCategory: null, relatedArticles: [], featured: false });
const editable = a => ({ ...a, tagsInput: (a.tags || []).join(', '), keywordsInput: (a.keywords || []).join(', ') });
const payload = a => ({ ...a, tags: a.tagsInput.split(',').map(s => s.trim()).filter(Boolean), keywords: a.keywordsInput.split(',').map(s => s.trim()).filter(Boolean) });

export default function KnowledgeAdmin() {
  const [metadata, setMetadata] = useState(null);
  const [list, setList] = useState({ items: [], total: 0, limit: 24 });
  const [filters, setFilters] = useState({ q: '', rubric: '', status: '', page: 1 });
  const [query, setQuery] = useState('');
  const [article, setArticle] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [rubricEditor, setRubricEditor] = useState(null);
  const [tab, setTab] = useState('articles');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [relatedQuery, setRelatedQuery] = useState('');
  const [relatedOptions, setRelatedOptions] = useState([]);
  const dirty = article !== null && JSON.stringify(article) !== baseline;
  const editingId = article?.id || (article ? 'new' : null);
  useDocumentMeta({ title: 'Редакция на съдържание | Bricky', description: 'Администрация', canonicalPath: '/admin/knowledge', robots: 'noindex,nofollow' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const [meta, result] = await Promise.all([knowledgeApi.metadata(true), knowledgeApi.list(filters, true)]); setMetadata(meta); setList(result); }
    catch (e) { setError(knowledgeError(e)); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!editingId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { knowledgeApi.list({ q: relatedQuery, limit: 24 }, true, controller.signal).then(r => setRelatedOptions(r.items)).catch(() => {}); }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [relatedQuery, editingId]);
  useEffect(() => {
    if (!dirty) return;
    const unload = e => { e.preventDefault(); e.returnValue = ''; };
    const leave = e => { const anchor = e.target.closest?.('a'); if (anchor && anchor.target !== '_blank' && !anchor.getAttribute('href')?.startsWith('#') && !window.confirm('Има незапазени промени. Да напусна ли редактора?')) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', leave, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', leave, true); };
  }, [dirty]);
  const change = (key, value) => { setNotice(''); setArticle(current => ({ ...current, [key]: value })); };
  function open(value) { const next = editable(value); setArticle(next); setBaseline(JSON.stringify(next)); setError(''); setNotice(''); setPreview(false); }
  function close() { if (busy || dirty && !window.confirm('Да затворя ли без записване?')) return; setArticle(null); setError(''); setNotice(''); setPreview(false); }
  async function edit(id) { setBusy(true); setError(''); try { open(await knowledgeApi.edit(id)); } catch (e) { setError(knowledgeError(e)); } finally { setBusy(false); } }
  async function save(status) {
    if (status === 'draft' && article.status === 'published' && !window.confirm('Да сваля ли статията от публичния сайт?')) return;
    const nextArticle = { ...payload(article), status };
    const validationError = validateKnowledgeArticle(nextArticle);
    if (validationError) { setError(validationError); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setBusy(true); setError(''); setNotice('');
    try { const saved = editable(await knowledgeApi.save(nextArticle)); setArticle(saved); setBaseline(JSON.stringify(saved)); setNotice(status === 'published' ? 'Статията е публикувана.' : 'Черновата е запазена.'); await load(); }
    catch (e) { setError(knowledgeError(e)); } finally { setBusy(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Да изтрия ли „${item.title}“ от сайта?`)) return;
    setBusy(true); setError('');
    try { await knowledgeApi.remove(item); await load(); setNotice('Статията е изтрита.'); } catch (e) { setError(knowledgeError(e)); } finally { setBusy(false); }
  }
  async function upload(files) {
    if (files.length > 20 || files.some(f => f.size > 12 * 1024 * 1024)) { setError('Качете до 20 снимки, всяка до 12 MB.'); return null; }
    setBusy(true); setError('');
    try { const images = []; for (const file of files) images.push(await knowledgeApi.upload(file)); return images; }
    catch (e) { setError(knowledgeError(e)); return null; } finally { setBusy(false); }
  }
  async function saveRubric(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await knowledgeApi.rubric(rubricEditor); setRubricEditor(null); setNotice('Рубриката е запазена.'); await load(); }
    catch (err) { setError(knowledgeError(err)); } finally { setBusy(false); }
  }

  return <div className="knowledge-root cms-root"><div className="cms-container">
    <header className="cms-header"><div><Link to="/admin"><ArrowLeft size={16} />Админ панел</Link><h1>Център за ремонти</h1></div><Link to="/knowledge" target="_blank" rel="noopener noreferrer"><Eye size={18} />Публичен изглед</Link></header>
    {error && <div role="alert" className="cms-message cms-error">{error}</div>}{notice && <div role="status" className="cms-message cms-success">{notice}</div>}
    {busy && <p role="status" className="cms-saving">Записване / качване...</p>}
    {!metadata ? <div className="knowledge-empty">{loading ? 'Зареждане...' : <button onClick={load}>Опитай отново</button>}</div> : article ? <>
      <div className="cms-editor-bar"><button disabled={busy} onClick={close}><ArrowLeft size={17} />Статии</button><span className={`cms-status ${article.status}`}>{article.status === 'published' ? 'Публикувана' : 'Чернова'}{dirty ? ' · Незапазени промени' : ''}</span><div className="cms-editor-actions"><button disabled={busy} onClick={() => setPreview(v => !v)}><Eye size={17} />{preview ? 'Редактирай' : 'Преглед'}</button><button disabled={busy} onClick={() => save(article.status)}><Save size={17} />Запази</button>{article.status === 'draft' ? <button className="cms-primary" disabled={busy} onClick={() => save('published')}><Check size={17} />Публикувай</button> : <button disabled={busy} onClick={() => save('draft')}>Свали от сайта</button>}</div></div>
      {preview ? <section className="cms-preview"><KnowledgeArticleView article={payload(article)} metadata={metadata} preview /></section> : <fieldset className="cms-editor-fieldset" disabled={busy}><div className="cms-editor-layout"><div className="cms-editor-content">
        <section className="cms-editor-section"><label className="cms-title-label">Заглавие<input value={article.title} maxLength={240} onChange={e => change('title', e.target.value)} /></label><label>Кратко описание<textarea rows={3} maxLength={1000} value={article.excerpt} onChange={e => change('excerpt', e.target.value)} /><span className="cms-muted">{article.excerpt.length} / 1000 знака</span></label></section>
        <section className="cms-editor-section"><div className="cms-section-heading"><h2>Основно изображение</h2>{article.heroImage && <ToolButton icon={Trash2} label="Премахни основното изображение" onClick={() => change('heroImage', null)} />}</div>{article.heroImage && <ImageFields image={article.heroImage} onChange={image => change('heroImage', image)} />}<UploadButton label={article.heroImage ? 'Замени изображението' : 'Качи основно изображение'} onUpload={async files => { const images = await upload(files.slice(0, 1)); if (images) change('heroImage', images[0]); }} /></section>
        <ContentEditor blocks={article.blocks} onChange={blocks => change('blocks', blocks)} upload={upload} busy={busy} />
      </div><aside className="cms-editor-sidebar">
        <section className="cms-editor-section"><h2>Публикация</h2><label>Рубрика<select value={article.rubricId} onChange={e => change('rubricId', Number(e.target.value))}>{metadata.rubrics.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label><label>Тип съдържание<select value={article.contentType} onChange={e => change('contentType', e.target.value)}>{metadata.contentTypes.map(type => <option key={type} value={type}>{contentTypeLabels[type]}</option>)}</select></label><label>Ремонтна категория<select value={article.repairCategoryId || ''} onChange={e => change('repairCategoryId', e.target.value ? Number(e.target.value) : null)}><option value="">Без категория</option>{metadata.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>Автор<input value={article.author} maxLength={140} onChange={e => change('author', e.target.value)} /></label><label>Постоянен адрес<input value={article.slug} disabled={Boolean(article.publishedAt)} maxLength={180} onChange={e => change('slug', e.target.value)} placeholder="remont-na-banya" /></label><label className="cms-checkbox"><input type="checkbox" checked={article.featured} onChange={e => change('featured', e.target.checked)} />Водеща статия</label></section>
        <section className="cms-editor-section"><h2>Теми и връзки</h2><label>Етикети (разделени със запетая)<input value={article.tagsInput} onChange={e => change('tagsInput', e.target.value)} /></label><label>Ключови думи (разделени със запетая)<input value={article.keywordsInput} onChange={e => change('keywordsInput', e.target.value)} /></label><label>Калкулатор<select value={article.calculatorCategory || ''} onChange={e => change('calculatorCategory', e.target.value || null)}><option value="">Без калкулатор</option>{metadata.categories.map(c => <option key={c.id} value={c.categoryKey}>{c.label}</option>)}</select></label><label>Свързани статии<input type="search" value={relatedQuery} onChange={e => setRelatedQuery(e.target.value)} placeholder="Търси статия" /></label>
          <div className="cms-related">{relatedOptions.filter(a => a.id !== article.id).map(a => <label className="cms-checkbox" key={a.id}><input type="checkbox" checked={article.relatedArticles.includes(a.id)} disabled={!article.relatedArticles.includes(a.id) && article.relatedArticles.length >= 12} onChange={e => change('relatedArticles', e.target.checked ? [...article.relatedArticles, a.id] : article.relatedArticles.filter(id => id !== a.id))} />{a.title}</label>)}</div><span className="cms-muted">{article.relatedArticles.length} избрани</span>{article.relatedArticles.length > 0 && <button type="button" onClick={() => change('relatedArticles', [])}>Изчисти избраните</button>}
        </section><section className="cms-editor-section"><h2>SEO</h2><label>SEO заглавие<input value={article.seoTitle} maxLength={240} onChange={e => change('seoTitle', e.target.value)} /></label><label>SEO описание<textarea rows={4} value={article.seoDescription} maxLength={400} onChange={e => change('seoDescription', e.target.value)} /></label></section>
      </aside></div></fieldset>}
    </> : <>
      <nav className="cms-tabs" aria-label="Управление на съдържание"><button aria-current={tab === 'articles' ? 'page' : undefined} onClick={() => setTab('articles')}>Статии</button><button aria-current={tab === 'rubrics' ? 'page' : undefined} onClick={() => setTab('rubrics')}>Рубрики</button></nav>
      {tab === 'articles' ? <><div className="cms-list-toolbar"><form onSubmit={e => { e.preventDefault(); setFilters({ ...filters, q: query, page: 1 }); }}><input aria-label="Търси в статиите" placeholder="Търси статия" value={query} onChange={e => setQuery(e.target.value)} /><ToolButton icon={Search} label="Търси" type="submit" /></form><select aria-label="Филтър по рубрика" value={filters.rubric} onChange={e => setFilters({ ...filters, rubric: e.target.value, page: 1 })}><option value="">Всички рубрики</option>{metadata.rubrics.map(r => <option key={r.id} value={r.slug}>{r.label}</option>)}</select><select aria-label="Филтър по статус" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}><option value="">Всички статуси</option><option value="draft">Чернови</option><option value="published">Публикувани</option></select><button className="cms-primary" disabled={busy || !metadata.rubrics.length} onClick={() => open(emptyArticle(metadata.rubrics[0].id))}><FilePlus2 size={18} />Нова статия</button></div>
        {loading ? <p role="status">Зареждане...</p> : <div className="cms-list">{list.items.length ? list.items.map(item => <article className="cms-list-item" key={item.id}><div><button className="cms-article-title" disabled={busy} onClick={() => edit(item.id)}>{item.title}</button><p>{metadata.rubrics.find(r => r.id === item.rubricId)?.label} · {new Date(item.updatedAt).toLocaleDateString('bg-BG')}</p></div><span className={`cms-status ${item.status}`}>{item.status === 'published' ? 'Публикувана' : 'Чернова'}</span><div className="cms-tools">{item.status === 'published' && <Link title="Отвори статията" aria-label="Отвори статията" to={articlePath(item)} target="_blank" rel="noopener noreferrer"><Eye size={17} /></Link>}<ToolButton icon={Pencil} label="Редактирай статията" disabled={busy} onClick={() => edit(item.id)} /><ToolButton icon={Trash2} label="Изтрий статията" disabled={busy} onClick={() => remove(item)} /></div></article>) : <p className="knowledge-empty">Няма статии по тези критерии.</p>}</div>}
        <nav className="knowledge-pagination" aria-label="Страници"><ToolButton icon={ChevronLeft} label="Предишна страница" disabled={filters.page === 1 || loading} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} /><span>{list.total} статии · Страница {filters.page}</span><ToolButton icon={ChevronRight} label="Следваща страница" disabled={filters.page * list.limit >= list.total || loading} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} /></nav>
      </> : <><div className="cms-list-toolbar"><h2>Рубрики</h2><button className="cms-primary" onClick={() => setRubricEditor({ slug: '', label: '', description: '', sortOrder: 80 })}><FilePlus2 size={17} />Нова рубрика</button></div>{rubricEditor && <form className="cms-rubric-form" onSubmit={saveRubric}><fieldset disabled={busy}><label>Име<input required value={rubricEditor.label} onChange={e => setRubricEditor({ ...rubricEditor, label: e.target.value })} /></label><label>Адрес<input required disabled={Boolean(rubricEditor.id)} value={rubricEditor.slug} onChange={e => setRubricEditor({ ...rubricEditor, slug: e.target.value })} /></label><label>Описание<textarea value={rubricEditor.description} onChange={e => setRubricEditor({ ...rubricEditor, description: e.target.value })} /></label><label>Ред<input type="number" value={rubricEditor.sortOrder} onChange={e => setRubricEditor({ ...rubricEditor, sortOrder: Number(e.target.value) })} /></label><div className="cms-row"><button type="submit" className="cms-primary"><Save size={17} />Запази</button><button type="button" onClick={() => setRubricEditor(null)}><X size={17} />Откажи</button></div></fieldset></form>}{metadata.rubrics.map(r => <div className="cms-list-item" key={r.id}><div><h3>{r.label}</h3><p>{r.description}</p></div><span>{r.count} статии</span><ToolButton icon={Pencil} label={`Редактирай ${r.label}`} onClick={() => setRubricEditor(r)} /></div>)}</>}
    </>}
  </div></div>;
}

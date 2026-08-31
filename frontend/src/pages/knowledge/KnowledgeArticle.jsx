import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { knowledgeApi, knowledgeError } from '../../services/knowledge';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import KnowledgeArticleView from '../../components/knowledge/KnowledgeArticleView';
import { KnowledgeCard } from './KnowledgeIndex';
import { mediaUrl } from '../../utils/mediaUrls';
import './Knowledge.css';

export default function KnowledgeArticle() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError('');
    Promise.all([knowledgeApi.article(slug, controller.signal), knowledgeApi.metadata(false, controller.signal)])
      .then(([article, metadata]) => setData({ article, metadata }))
      .catch(e => { if (!controller.signal.aborted) setError(e.response?.status === 404 ? 'Статията не е намерена.' : knowledgeError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    if (!window.location.hash) window.scrollTo(0, 0);
    return () => controller.abort();
  }, [slug, retry]);
  const article = data?.article;
  const rubric = data?.metadata.rubrics.find(r => r.id === article.rubricId);
  useDocumentMeta({ title: article ? article.seoTitle || `${article.title} | Bricky` : 'Център за ремонти | Bricky', description: article?.seoDescription || article?.excerpt || 'Ремонтни ръководства и цени.', canonicalPath: `/blog/${slug}`, robots: article ? 'index,follow' : 'noindex,follow', image: article?.heroImage ? mediaUrl(article.heroImage.url) : undefined,
    structuredData: article ? { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: article.title, description: article.excerpt, datePublished: article.publishedAt, dateModified: article.updatedAt, author: { '@type': 'Organization', name: article.author }, image: article.heroImage ? new URL(mediaUrl(article.heroImage.url), window.location.origin).href : undefined, mainEntityOfPage: `https://bricky.bg/blog/${article.slug}` },
      { '@type': 'BreadcrumbList', itemListElement: [{ name: 'Център за ремонти', item: 'https://bricky.bg/knowledge' }, ...(rubric ? [{ name: rubric.label, item: `https://bricky.bg/knowledge/${rubric.slug}` }] : []), { name: article.title, item: `https://bricky.bg/blog/${article.slug}` }].map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) },
    ] } : undefined,
  });
  return <div className="knowledge-root"><div className="knowledge-container">{loading ? <p role="status" className="knowledge-empty">Зареждане...</p> : error ? <div className="knowledge-empty" role="alert"><h1>{error}</h1><button onClick={() => setRetry(r => r + 1)}>Опитай отново</button><Link to="/knowledge">Към Центъра за ремонти</Link></div> : <><KnowledgeArticleView article={article} metadata={data.metadata} />{article.related?.length > 0 && <section className="knowledge-band"><h2>Свързани теми</h2><div className="knowledge-card-grid">{article.related.map(a => <KnowledgeCard key={a.id} article={a} />)}</div></section>}</>}</div></div>;
}

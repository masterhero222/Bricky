import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowRight, Calculator, Clock3 } from 'lucide-react';
import { mediaUrl } from '../../utils/mediaUrls';
import { articleOutline, calculatorPath, contentTypeLabels, readingMinutes, safeImage } from './content';

export function EditorialFigure({ image, eager = false }) {
  if (!image || !safeImage(image.url)) return null;
  return <figure className={`knowledge-figure knowledge-align-${image.align || 'wide'}`}>
    <a href={mediaUrl(image.url)} target="_blank" rel="noopener noreferrer" aria-label={image.alt || 'Отвори изображението'}>
      <img src={mediaUrl(image.url)} alt={image.alt || ''} loading={eager ? 'eager' : 'lazy'} />
    </a>
    {image.caption && <figcaption>{image.caption}</figcaption>}
  </figure>;
}

export function KnowledgeBody({ blocks = [] }) {
  return <div className="knowledge-prose">{blocks.map(block => {
    if (block.type === 'image') return <EditorialFigure key={block.id} image={block.image} />;
    if (block.type === 'gallery') return <div className="knowledge-gallery" key={block.id}>{block.images.map((image, i) => <EditorialFigure key={`${image.url}-${i}`} image={image} />)}</div>;
    const sectionClass = block.id === 'process-timeline' ? 'knowledge-process' : block.id === 'invisible-work' ? 'knowledge-labor' : block.id === 'related-topics' ? 'knowledge-topic-cluster' : 'knowledge-text-block';
    return <section key={block.id} className={sectionClass}><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
      h1: ({ node, children }) => <h2 id={`${block.id}-${node.position.start.line}`}>{children}</h2>,
      h2: ({ node, children }) => <h2 id={`${block.id}-${node.position.start.line}`}>{children}</h2>,
      img: ({ src, alt }) => safeImage(src) ? <img src={mediaUrl(src)} alt={alt || ''} loading="lazy" /> : null,
      table: ({ children }) => <div className="knowledge-table" role="region" aria-label="Таблица" tabIndex={0}><table>{children}</table></div>,
      a: ({ href, children }) => <a href={href} target={/^https?:/.test(href || '') ? '_blank' : undefined} rel="noopener noreferrer">{children}</a>,
    }}>{block.markdown || ''}</ReactMarkdown></section>;
  })}</div>;
}

export default function KnowledgeArticleView({ article, metadata, preview = false }) {
  const rubric = metadata?.rubrics.find(r => r.id === Number(article.rubricId));
  const repair = metadata?.categories.find(c => c.id === Number(article.repairCategoryId));
  const outline = useMemo(() => articleOutline(article.blocks), [article.blocks]);
  return <article className="knowledge-article">
    {!preview && <nav className="knowledge-breadcrumb" aria-label="Навигационна пътека"><Link to="/">Начало</Link><span>/</span><Link to="/knowledge">Център за ремонти</Link>{rubric && <><span>/</span><Link to={`/knowledge/${rubric.slug}`}>{rubric.label}</Link></>}{repair && <><span>/</span><Link to={`/knowledge/repairs/${repair.categoryKey}`}>{repair.label}</Link></>}</nav>}
    <header className="knowledge-article-heading">
      <div className="knowledge-article-labels"><span className="knowledge-eyebrow">{rubric?.label}{repair ? ` · ${repair.label}` : ''}</span><span className="knowledge-content-type">{contentTypeLabels[article.contentType] || 'Статия'}</span></div>
      <h1>{article.title || 'Нова статия'}</h1><p>{article.excerpt}</p>
      <div className="knowledge-byline"><span>{article.author}</span><span><Clock3 size={15} />{readingMinutes(article.blocks)} мин.</span>{article.publishedAt && <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('bg-BG')}</time>}</div>
    </header>
    <EditorialFigure image={article.heroImage} eager />
    <div className="knowledge-reading-layout">
      {outline.length > 0 && <aside className="knowledge-toc"><h2>В статията</h2><nav>{outline.map(item => <a key={item.id} href={`#${item.id}`}>{item.heading}</a>)}</nav></aside>}
      <KnowledgeBody blocks={article.blocks} />
    </div>
    {(article.tags || []).length > 0 && <div className="knowledge-tags">{article.tags.map(tag => <Link key={tag} to={`/knowledge?q=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>}
    {article.calculatorCategory && <section className="knowledge-cta"><div><Calculator size={24} /><h2>Изчисли твоя ремонт</h2></div><Link to={calculatorPath(article)}>Към калкулатора <ArrowRight size={18} /></Link></section>}
    {!preview && <div className="knowledge-next"><Link to="/workers">Разгледай майсторите <ArrowRight size={16} /></Link><Link to={calculatorPath(article)}>Опиши ремонта <ArrowRight size={16} /></Link></div>}
  </article>;
}

import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import BlogArticleHeader from '../../components/blog/BlogArticleHeader';
import BlogCalculatorCta from '../../components/blog/BlogCalculatorCta';
import BlogContentRenderer from '../../components/blog/BlogContentRenderer';
import BlogMarkdown from '../../components/blog/BlogMarkdown';
import BlogRelatedArticles from '../../components/blog/BlogRelatedArticles';
import BlogTableOfContents from '../../components/blog/BlogTableOfContents';
import { BLOG_FALLBACK_COVER } from '../../data/blogArticles';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import {
  getArticleCover,
  getBlogArticleBySlug,
  getRelatedBlogArticles,
} from '../../utils/blog';
import BlogNotFound from './BlogNotFound';
import './Blog.css';

export default function BlogArticle() {
  const { slug } = useParams();
  const article = getBlogArticleBySlug(slug);

  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [slug]);

  useDocumentMeta({
    title: article?.metaTitle || 'Статията не е намерена | Bricky',
    description:
      article?.metaDescription || 'Тази Bricky статия не беше намерена.',
    canonicalPath: article ? `/blog/${article.slug}` : '/blog',
    robots: article ? 'index,follow' : 'noindex,follow',
    image: article ? getArticleCover(article) : undefined,
    structuredData: article ? {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: article.title, description: article.metaDescription,
      datePublished: article.publishedAt, dateModified: article.updatedAt,
      articleSection: article.categoryLabel, inLanguage: 'bg',
      author: { '@type': 'Organization', name: article.authorName || 'Екипът на Bricky' },
      image: `https://bricky.bg${getArticleCover(article)}`,
      mainEntityOfPage: `https://bricky.bg/blog/${article.slug}`,
    } : undefined,
  });

  if (!article) return <BlogNotFound />;

  const relatedArticles = getRelatedBlogArticles(article);

  return (
    <div className="blog-root">
      <article className="blog-container">
        <BlogArticleHeader article={article} />

        <div className="blog-cover">
          <img
            src={getArticleCover(article)}
            alt={article.coverAlt}
            onError={(event) => {
              if (event.currentTarget.src.endsWith(BLOG_FALLBACK_COVER)) return;
              event.currentTarget.src = BLOG_FALLBACK_COVER;
            }}
          />
        </div>

        <div className="blog-article-layout">
          <BlogTableOfContents sections={article.sections} />
          <div className="blog-reading-column">
            {article.markdown ? <BlogMarkdown article={article} /> : <BlogContentRenderer sections={article.sections} />}

            {article.faq?.length > 0 && (
              <section className="blog-faq">
                <h2>Чести въпроси</h2>
                {article.faq.map((item) => (
                  <details key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </section>
            )}
          </div>
        </div>

        <BlogRelatedArticles articles={relatedArticles} />
        <BlogCalculatorCta
          categoryKey={article.calculatorCategoryKey}
          variant="wide"
        />

        <div className="blog-bottom-link">
          <Link to="/blog">Назад към всички Bricky съвети</Link>
        </div>
      </article>
    </div>
  );
}

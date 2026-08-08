import { Link, useParams } from 'react-router-dom';
import BlogArticleHeader from '../../components/blog/BlogArticleHeader';
import BlogCalculatorCta from '../../components/blog/BlogCalculatorCta';
import BlogContentRenderer from '../../components/blog/BlogContentRenderer';
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

  useDocumentMeta({
    title: article?.metaTitle || 'Статията не е намерена | Bricky',
    description:
      article?.metaDescription || 'Тази Bricky статия не беше намерена.',
    canonicalPath: article ? `/blog/${article.slug}` : '/blog',
    robots: 'noindex,follow',
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
          <main className="blog-reading-column">
            <BlogContentRenderer sections={article.sections} />
            <BlogCalculatorCta
              categoryKey={article.calculatorCategoryKey}
              variant="inline"
            />

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
          </main>
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

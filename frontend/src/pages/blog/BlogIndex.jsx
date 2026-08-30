import { Link, useSearchParams } from 'react-router-dom';
import BlogArticleCard from '../../components/blog/BlogArticleCard';
import BlogCalculatorCta from '../../components/blog/BlogCalculatorCta';
import BlogCategoryFilter from '../../components/blog/BlogCategoryFilter';
import BlogHero from '../../components/blog/BlogHero';
import { BLOG_RUBRICS, blogRubricPath } from '../../data/blogRubrics';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { getBlogArticlesByCategory, getPublishedBlogArticles } from '../../utils/blog';
import './Blog.css';

export default function BlogIndex() {
  const [searchParams] = useSearchParams();
  const selected = BLOG_RUBRICS.find(item => item.key === searchParams.get('rubrika'));
  const groups = (selected ? [selected] : BLOG_RUBRICS.filter(rubric => getBlogArticlesByCategory(rubric.key).length)).map(rubric => ({
    ...rubric, articles: getBlogArticlesByCategory(rubric.key),
  }));
  const counts = Object.fromEntries(BLOG_RUBRICS.map(rubric => [rubric.key, getBlogArticlesByCategory(rubric.key).length]));
  counts.all = getPublishedBlogArticles().length;

  useDocumentMeta({
    title: selected ? `${selected.label} | Bricky Съвети` : 'Bricky Съвети | Практични идеи за ремонт',
    description: selected?.description || 'Цени за ремонти, практични съвети, реални обекти и материали за професионалисти.',
    canonicalPath: blogRubricPath(selected?.key),
    robots: selected && !counts[selected.key] ? 'noindex,follow' : 'index,follow',
  });

  return (
    <div className="blog-root">
      <div className="blog-container">
        <nav className="blog-breadcrumb" aria-label="Път до блога"><Link to="/">Начало</Link> / Блог</nav>
        <BlogHero />
        <section id="blog-topics" className="blog-section">
          <div className="blog-section-heading"><h2>Рубрики</h2></div>
          <BlogCategoryFilter selectedCategory={selected?.key || 'all'} counts={counts} />
        </section>
        {!groups.length && <p className="blog-rubric-empty">Очаквайте първите статии.</p>}
        {groups.map(group => (
          <section key={group.key} className={`blog-section blog-rubric-section${group.articles.length ? '' : ' is-empty'}`} aria-labelledby={`rubric-${group.key}`}>
            <div className="blog-section-heading">
              <h2 id={`rubric-${group.key}`}><Link to={blogRubricPath(group.key)}>{group.label}</Link></h2>
              <div className="blog-rubric-description">{group.description}</div>
            </div>
            {group.articles.length ? (
              <div className="blog-card-grid">{group.articles.map(article => <BlogArticleCard key={article.id} article={article} />)}</div>
            ) : <p className="blog-rubric-empty">Очаквайте първите статии.</p>}
          </section>
        ))}
        {selected && <div className="blog-bottom-link"><Link to="/blog">Всички рубрики</Link></div>}
        <BlogCalculatorCta variant="wide" />
      </div>
    </div>
  );
}

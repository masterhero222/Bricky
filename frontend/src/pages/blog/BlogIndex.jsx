import { useMemo, useState } from 'react';
import BlogArticleCard from '../../components/blog/BlogArticleCard';
import BlogCalculatorCta from '../../components/blog/BlogCalculatorCta';
import BlogCategoryFilter from '../../components/blog/BlogCategoryFilter';
import BlogFeaturedCard from '../../components/blog/BlogFeaturedCard';
import BlogHero from '../../components/blog/BlogHero';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import {
  getBlogArticlesByCategory,
  getFeaturedBlogArticle,
  getPublishedBlogArticles,
} from '../../utils/blog';
import './Blog.css';

export default function BlogIndex() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const featured = getFeaturedBlogArticle();
  const publishedCount = getPublishedBlogArticles().length;
  const filteredArticles = useMemo(
    () => getBlogArticlesByCategory(selectedCategory),
    [selectedCategory],
  );
  const latestArticles = filteredArticles.filter(
    (article) => selectedCategory !== 'all' || article.slug !== featured?.slug,
  );

  useDocumentMeta({
    title: 'Bricky Съвети | Практични идеи за ремонт',
    description:
      'Практични Bricky съвети за планиране на ремонт, избор на майстор и подготовка на заявка.',
    canonicalPath: '/blog',
    robots: 'index,follow',
  });

  return (
    <div className="blog-root">
      <div className="blog-container">
        <p className="blog-breadcrumb">Начало / Блог</p>
        <BlogHero />

        {publishedCount > 0 && <section id="blog-topics" className="blog-section">
          <div className="blog-section-heading">
            <p>{publishedCount} {publishedCount === 1 ? 'статия' : 'статии'}</p>
            <h2>Избери категория</h2>
          </div>
          <BlogCategoryFilter
            selectedCategory={selectedCategory}
            onChange={setSelectedCategory}
          />
        </section>}

        {selectedCategory === 'all' && <BlogFeaturedCard article={featured} />}

        <section id={publishedCount === 0 ? 'blog-topics' : undefined} className="blog-section">
          <div className="blog-section-heading">
            <p>Последни материали</p>
            <h2>Ремонтни теми за по-ясна заявка</h2>
          </div>

          {latestArticles.length === 0 ? (
            <div className="blog-empty-state">
              <h3>{publishedCount === 0 ? 'Първите Bricky съвети идват скоро.' : 'Все още няма други статии в тази категория.'}</h3>
              {publishedCount === 0 && <p>Подготвяме практични материали за ремонтите и избора на майстор.</p>}
              {selectedCategory !== 'all' && <button type="button" onClick={() => setSelectedCategory('all')}>
                Разгледай всички теми
              </button>}
            </div>
          ) : (
            <div className="blog-card-grid">
              {latestArticles.map((article) => (
                <BlogArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>

        <BlogCalculatorCta variant="wide" />
      </div>
    </div>
  );
}

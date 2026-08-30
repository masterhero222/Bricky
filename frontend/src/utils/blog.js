import { BLOG_CATEGORIES, BLOG_FALLBACK_COVER, blogArticles } from "../data/blogArticles.js";

export function getPublishedBlogArticles(articles = blogArticles) {
  return articles.filter((article) => article.status === 'published');
}

export function getBlogArticleBySlug(slug) {
  return getPublishedBlogArticles().find((article) => article.slug === slug) || null;
}

export function getFeaturedBlogArticle() {
  const published = getPublishedBlogArticles();
  return published.find((article) => article.featured) || published[0] || null;
}

export function getBlogArticlesByCategory(categoryKey) {
  const published = getPublishedBlogArticles();
  if (!categoryKey || categoryKey === "all") return published;
  return published.filter((article) => article.categoryKey === categoryKey);
}

export function getRelatedBlogArticles(article, limit = 3) {
  const related = (article?.relatedSlugs || [])
    .map(getBlogArticleBySlug)
    .filter(Boolean)
    .slice(0, limit);

  if (related.length >= limit) return related;

  const fill = getPublishedBlogArticles()
    .filter((item) => item.slug !== article?.slug && !related.some((relatedItem) => relatedItem.slug === item.slug))
    .slice(0, limit - related.length);

  return [...related, ...fill];
}

export function getBlogCategoryLabel(categoryKey) {
  return BLOG_CATEGORIES.find((category) => category.key === categoryKey)?.label || "Съвети";
}

export function getArticleCover(article) {
  return article?.coverImage || BLOG_FALLBACK_COVER;
}

export function articlePath(article) {
  return `/blog/${article.slug}`;
}

export function requestCalculatorPath(categoryKey) {
  return categoryKey ? `/requests?category=${encodeURIComponent(categoryKey)}` : "/requests";
}

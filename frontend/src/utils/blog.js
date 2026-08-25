import { BLOG_CATEGORIES, BLOG_FALLBACK_COVER, blogArticles } from "../data/blogArticles";

export function getBlogArticleBySlug(slug) {
  return blogArticles.find((article) => article.slug === slug) || null;
}

export function getFeaturedBlogArticle() {
  return blogArticles.find((article) => article.featured) || blogArticles[0] || null;
}

export function getBlogArticlesByCategory(categoryKey) {
  if (!categoryKey || categoryKey === "all") return blogArticles;
  return blogArticles.filter((article) => article.categoryKey === categoryKey);
}

export function getRelatedBlogArticles(article, limit = 3) {
  const related = (article?.relatedSlugs || [])
    .map(getBlogArticleBySlug)
    .filter(Boolean)
    .slice(0, limit);

  if (related.length >= limit) return related;

  const fill = blogArticles
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

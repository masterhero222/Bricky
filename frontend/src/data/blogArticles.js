import { editorialBlogArticles } from './blogContent.js';
import { BLOG_RUBRICS } from './blogRubrics.js';

export const blogArticles = editorialBlogArticles;
export const BLOG_FALLBACK_COVER = '/assets/worker-banners/v1/blueprint-general.webp';

export const BLOG_CATEGORIES = [
  { key: 'all', label: 'Всички' },
  ...BLOG_RUBRICS,
];

import { editorialBlogArticles } from './blogContent.js';

export const blogArticles = editorialBlogArticles;
export const BLOG_FALLBACK_COVER = '/assets/worker-banners/v1/blueprint-general.webp';

export const BLOG_CATEGORIES = [
  { key: 'all', label: 'Всички' },
  { key: 'bathroom-plumbing', label: 'Баня и ВиК' },
  { key: 'walls-painting', label: 'Стени и боядисване' },
  { key: 'electrical', label: 'Електро' },
  { key: 'flooring', label: 'Подове' },
  { key: 'roofing', label: 'Покриви' },
  { key: 'full-renovation', label: 'Цялостен ремонт' },
  { key: 'choose-worker', label: 'Избор на майстор' },
];

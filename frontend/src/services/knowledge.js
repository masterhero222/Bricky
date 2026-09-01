import api from './api';
import { localizeKnowledgeMetadata } from '../components/knowledge/metadata';

// CMS always uses the authenticated backend, never the legacy localStorage mock.
export const knowledgeApi = {
  metadata: (admin = false, signal) => api.get(`${admin ? '/admin' : ''}/knowledge/metadata`, { signal }).then(r => localizeKnowledgeMetadata(r.data)),
  list: (params = {}, admin = false, signal) => api.get(`${admin ? '/admin' : ''}/knowledge/articles`, { params, signal }).then(r => r.data),
  article: (slug, signal) => api.get(`/knowledge/articles/${encodeURIComponent(slug)}`, { signal }).then(r => r.data),
  edit: id => api.get(`/admin/knowledge/articles/${id}`).then(r => r.data),
  save: article => (article.id ? api.put(`/admin/knowledge/articles/${article.id}`, article) : api.post('/admin/knowledge/articles', article)).then(r => r.data),
  remove: article => api.delete(`/admin/knowledge/articles/${article.id}`, { data: { version: article.version } }),
  rubric: rubric => (rubric.id ? api.put(`/admin/knowledge/rubrics/${rubric.id}`, rubric) : api.post('/admin/knowledge/rubrics', rubric)).then(r => r.data),
  upload: file => { const data = new FormData(); data.append('file', file); return api.post('/admin/knowledge/images', data).then(r => r.data); },
};

export function knowledgeError(error) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || 'Неуспешна връзка. Опитайте отново.';
}

function imageError(image, label, published) {
  if (!image || typeof image !== 'object') return `${label} е невалидно.`;
  if (published && !String(image.alt || '').trim()) return `${label}: добавете описание на изображението (alt).`;
  if (String(image.alt || '').length > 300) return `${label}: описанието (alt) е до 300 знака.`;
  if (String(image.caption || '').length > 600) return `${label}: надписът е до 600 знака.`;
  return '';
}

export function validateKnowledgeArticle(article) {
  const published = article.status === 'published';
  const bounded = [
    ['Заглавието', article.title, 240, true],
    ['Краткото описание', article.excerpt, 1000, published],
    ['Постоянният адрес', article.slug, 180, true],
    ['Авторът', article.author, 140, published],
    ['SEO заглавието', article.seoTitle, 240, false],
    ['SEO описанието', article.seoDescription, 400, false],
  ];
  for (const [label, value, max, required] of bounded) {
    const content = String(value || '');
    if (required && !content.trim()) return `${label} е задължително.`;
    if (content.length > max) return `${label} е до ${max} знака (в момента: ${content.length}).`;
  }
  for (const [label, values] of [['Етикетите', article.tags], ['Ключовите думи', article.keywords]]) {
    if (!Array.isArray(values) || values.length > 30) return `${label} могат да бъдат до 30.`;
    const invalid = values.findIndex(value => String(value).length > 100);
    if (invalid >= 0) return `${label}, запис ${invalid + 1}, е до 100 знака.`;
  }
  if (!Array.isArray(article.blocks) || article.blocks.length > 100) return 'Статията може да съдържа до 100 блока.';
  if (JSON.stringify(article.blocks).length > 200000) return 'Статията е прекалено голяма.';
  const heroError = article.heroImage && imageError(article.heroImage, 'Основното изображение', published);
  if (heroError) return heroError;
  for (let index = 0; index < article.blocks.length; index += 1) {
    const block = article.blocks[index];
    if (block.type === 'text' && String(block.markdown || '').length > 150000) return `Текстов блок ${index + 1} е прекалено дълъг.`;
    if (block.type === 'image') {
      const error = imageError(block.image, `Изображение в блок ${index + 1}`, published);
      if (error) return error;
    }
    if (block.type === 'gallery') {
      for (let imageIndex = 0; imageIndex < (block.images || []).length; imageIndex += 1) {
        const error = imageError(block.images[imageIndex], `Снимка ${imageIndex + 1} в галерия ${index + 1}`, published);
        if (error) return error;
      }
    }
  }
  if (published && !article.blocks.some(block => block.type === 'text' && String(block.markdown || '').trim())) return 'Добавете текст преди публикуване.';
  return '';
}

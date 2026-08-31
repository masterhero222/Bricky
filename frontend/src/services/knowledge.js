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

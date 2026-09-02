const PREFIX = 'bricky:knowledge-draft:';
const key = slug => `${PREFIX}${slug || 'new'}`;

export function writeKnowledgeDraft(storage, article) {
  try {
    storage.setItem(key(article.slug), JSON.stringify({ format: 'bricky-knowledge-draft-v1', article }));
    return true;
  } catch { return false; }
}

export function readKnowledgeDraft(storage, slug) {
  try {
    const value = JSON.parse(storage.getItem(key(slug)));
    const article = value?.article;
    if (value?.format !== 'bricky-knowledge-draft-v1' || article?.slug !== slug ||
        typeof article.title !== 'string' || !Array.isArray(article.blocks) ||
        !article.blocks.every(block => block && ['text', 'image', 'gallery'].includes(block.type))) return null;
    return article;
  } catch { return null; }
}

export function clearKnowledgeDraft(storage, slug) {
  try { storage.removeItem(key(slug)); } catch { /* Storage can be disabled. */ }
}

export const MAX_KNOWLEDGE_BLOCKS = 1000;
export const MAX_KNOWLEDGE_BLOCK_BYTES = 900000;
export const MAX_KNOWLEDGE_ARTICLE_BYTES = 950000;
const jsonBytes = value => new TextEncoder().encode(JSON.stringify(value)).length;

function imageError(image, label, published) {
  if (!image || typeof image !== 'object') return `${label} е невалидно.`;
  if (published && !String(image.alt || '').trim()) return `${label}: добавете описание на изображението (alt).`;
  if (String(image.alt || '').length > 300) return `${label}: описанието (alt) е до 300 знака.`;
  if (String(image.caption || '').length > 600) return `${label}: надписът е до 600 знака.`;
  return '';
}

export function validateKnowledgeArticle(article) {
  if (jsonBytes(article) > MAX_KNOWLEDGE_ARTICLE_BYTES) return 'Общият размер на статията надвишава 950 KB.';
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
  if (!Array.isArray(article.blocks)) return 'Невалидно съдържание на статията';
  if (article.blocks.length > MAX_KNOWLEDGE_BLOCKS) return `Статията може да съдържа до ${MAX_KNOWLEDGE_BLOCKS} блока (в момента: ${article.blocks.length}).`;
  if (jsonBytes(article.blocks) > MAX_KNOWLEDGE_BLOCK_BYTES) return 'Съдържанието надвишава 900 KB. Разделете материала на отделни статии.';
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

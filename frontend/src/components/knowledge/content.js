import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';

export const contentTypeLabels = { ARTICLE: 'Статия', REPAIR_GUIDE: 'Ремонтно ръководство', PRICE_GUIDE: 'Ценово ръководство', REAL_PROJECT: 'Реален обект', RED_FLAG: 'Червен флаг', HOW_TO: 'Как се прави', BRICKY_GUIDE: 'Как работи Bricky' };
export const articlePath = article => `/blog/${article.slug}`;
export const newTextBlock = (markdown = '') => ({ id: crypto.randomUUID(), type: 'text', markdown });
export function splitTextWithImage(block, image, cursor) {
  const position = Math.max(0, Math.min(block.markdown.length, Number.isFinite(cursor) ? cursor : block.markdown.length));
  return [newTextBlock(block.markdown.slice(0, position)), { id: crypto.randomUUID(), type: 'image', image }, newTextBlock(block.markdown.slice(position))];
}
export const calculatorPath = article => `/requests${article.calculatorCategory ? `?category=${encodeURIComponent(article.calculatorCategory)}` : ''}`;
export function articleOutline(blocks = []) {
  return blocks.flatMap(block => {
    if (block.type !== 'text') return [];
    const tree = unified().use(remarkParse).parse(block.markdown || '');
    return tree.children.filter(node => node.type === 'heading' && node.depth <= 2).map(node => ({ id: `${block.id}-${node.position.start.line}`, heading: toString(node) }));
  });
}
export function readingMinutes(blocks = []) {
  return Math.max(1, Math.ceil(blocks.filter(b => b.type === 'text').map(b => b.markdown).join(' ').split(/\s+/).length / 200));
}
export const safeImage = url => /^\/uploads\/knowledge\/[a-f0-9-]+\.webp$/.test(url || '') || /^\/assets\/worker-banners\/v1\/[a-z0-9-]+\.webp$/.test(url || '');

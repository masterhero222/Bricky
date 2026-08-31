import { BadRequestException } from '@nestjs/common';
import { ContentBlock, EditorialImage } from './knowledge.entity';

export const CONTENT_TYPES = ['ARTICLE', 'REPAIR_GUIDE', 'PRICE_GUIDE', 'REAL_PROJECT', 'RED_FLAG', 'HOW_TO', 'BRICKY_GUIDE'];
export function text(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new BadRequestException('Невалидно или прекалено дълго поле');
  return value.trim();
}
export function slug(value: unknown, max = 180) {
  const result = text(value, max, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new BadRequestException('Адресът трябва да съдържа малки латински букви, цифри и тирета');
  return result;
}
export function image(value: any, published = false): EditorialImage {
  if (!value || typeof value !== 'object') throw new BadRequestException('Невалидна снимка');
  const url = text(value.url, 300, true);
  // Only CMS uploads or existing first-party banner assets. No SVG, remote trackers or traversal.
  if (!/^\/uploads\/knowledge\/[a-f0-9-]+\.webp$/.test(url) && !/^\/assets\/worker-banners\/v1\/[a-z0-9-]+\.webp$/.test(url)) throw new BadRequestException('Използвайте снимка, качена през редактора');
  const align = value.align || 'wide';
  const kind = value.kind || 'photo';
  if (!['wide', 'left', 'right'].includes(align) || !['photo', 'infographic'].includes(kind)) throw new BadRequestException('Невалидна позиция на снимката');
  return { url, alt: text(value.alt ?? '', 300, published), caption: text(value.caption ?? '', 600), align, kind };
}
export function stringList(value: unknown, max = 30): string[] {
  if (!Array.isArray(value) || value.length > max) throw new BadRequestException('Невалиден списък');
  return [...new Set(value.map(item => text(item, 100, true)))];
}
export function blocks(value: unknown, published: boolean): ContentBlock[] {
  if (!Array.isArray(value) || value.length > 100 || JSON.stringify(value).length > 200000) throw new BadRequestException('Статията е прекалено голяма');
  const ids = new Set<string>();
  const result: ContentBlock[] = value.map((block: any) => {
    const id = text(block?.id, 80, true);
    if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) throw new BadRequestException('Невалиден идентификатор на блок');
    ids.add(id);
    if (block.type === 'text') return { id, type: 'text', markdown: text(block.markdown, 150000) };
    if (block.type === 'image') return { id, type: 'image', image: image(block.image, published) };
    if (block.type === 'gallery' && Array.isArray(block.images) && block.images.length > 0 && block.images.length <= 20) return { id, type: 'gallery', images: block.images.map(item => image(item, published)) };
    throw new BadRequestException('Невалиден блок');
  });
  if (published && !result.some(block => block.type === 'text' && block.markdown.trim())) throw new BadRequestException('Добавете текст преди публикуване');
  return result;
}
export function articleInput(body: any) {
  if (!body || typeof body !== 'object') throw new BadRequestException('Невалидна статия');
  if (!['draft', 'published'].includes(body.status) || !CONTENT_TYPES.includes(body.contentType)) throw new BadRequestException('Невалиден статус или тип');
  const published = body.status === 'published';
  const rubricId = Number(body.rubricId);
  const repairCategoryId = body.repairCategoryId == null || body.repairCategoryId === '' ? null : Number(body.repairCategoryId);
  if (!Number.isSafeInteger(rubricId) || rubricId < 1 || (repairCategoryId !== null && (!Number.isSafeInteger(repairCategoryId) || repairCategoryId < 1))) throw new BadRequestException('Изберете рубрика и валидна категория');
  if (!Array.isArray(body.relatedArticles) || body.relatedArticles.length > 12 || body.relatedArticles.some(id => !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException('Невалидни свързани статии');
  if (typeof body.featured !== 'boolean') throw new BadRequestException('Невалиден избор за водеща статия');
  return {
    slug: slug(body.slug), title: text(body.title, 240, true), excerpt: text(body.excerpt, 1000, published),
    status: body.status as 'draft' | 'published', contentType: body.contentType as string, rubricId, repairCategoryId,
    tags: stringList(body.tags), keywords: stringList(body.keywords), blocks: blocks(body.blocks, published),
    heroImage: body.heroImage ? image(body.heroImage, published) : null,
    seoTitle: text(body.seoTitle ?? '', 240), seoDescription: text(body.seoDescription ?? '', 400),
    author: text(body.author ?? '', 140, published),
    calculatorCategory: body.calculatorCategory ? text(body.calculatorCategory, 80, true) : null,
    relatedArticles: [...new Set<number>(body.relatedArticles)], featured: body.featured,
  };
}

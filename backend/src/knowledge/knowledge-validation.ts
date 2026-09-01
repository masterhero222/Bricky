import { BadRequestException } from '@nestjs/common';
import { ContentBlock, EditorialImage } from './knowledge.entity';

export const CONTENT_TYPES = ['ARTICLE', 'REPAIR_GUIDE', 'PRICE_GUIDE', 'REAL_PROJECT', 'RED_FLAG', 'HOW_TO', 'BRICKY_GUIDE'];
export function text(value: unknown, max: number, required = false, field = 'Полето'): string {
  if (typeof value !== 'string') throw new BadRequestException(`${field} е невалидно`);
  if (value.length > max) throw new BadRequestException(`${field} е до ${max} знака (в момента: ${value.length})`);
  if (required && !value.trim()) throw new BadRequestException(`${field} е задължително`);
  return value.trim();
}
export function slug(value: unknown, max = 180) {
  const result = text(value, max, true, 'Постоянният адрес');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new BadRequestException('Адресът трябва да съдържа малки латински букви, цифри и тирета');
  return result;
}
export function image(value: any, published = false, field = 'Изображението'): EditorialImage {
  if (!value || typeof value !== 'object') throw new BadRequestException('Невалидна снимка');
  const url = text(value.url, 300, true, `${field}: адресът`);
  // Only CMS uploads or existing first-party banner assets. No SVG, remote trackers or traversal.
  if (!/^\/uploads\/knowledge\/[a-f0-9-]+\.webp$/.test(url) && !/^\/assets\/worker-banners\/v1\/[a-z0-9-]+\.webp$/.test(url)) throw new BadRequestException('Използвайте снимка, качена през редактора');
  const align = value.align || 'wide';
  const kind = value.kind || 'photo';
  if (!['wide', 'left', 'right'].includes(align) || !['photo', 'infographic'].includes(kind)) throw new BadRequestException('Невалидна позиция на снимката');
  return {
    url,
    alt: text(value.alt ?? '', 300, published, `${field}: описанието (alt)`),
    caption: text(value.caption ?? '', 600, false, `${field}: надписът`),
    align,
    kind,
  };
}
export function stringList(value: unknown, max = 30, field = 'Списъкът'): string[] {
  if (!Array.isArray(value)) throw new BadRequestException(`${field} е невалиден`);
  if (value.length > max) throw new BadRequestException(`${field} може да съдържа до ${max} записа (в момента: ${value.length})`);
  return [...new Set(value.map((item, index) => text(item, 100, true, `${field}, запис ${index + 1}`)))];
}
export function blocks(value: unknown, published: boolean): ContentBlock[] {
  if (!Array.isArray(value) || value.length > 100 || JSON.stringify(value).length > 200000) throw new BadRequestException('Статията е прекалено голяма');
  const ids = new Set<string>();
  const result: ContentBlock[] = value.map((block: any, index) => {
    const id = text(block?.id, 80, true, `Блок ${index + 1}: идентификаторът`);
    if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) throw new BadRequestException('Невалиден идентификатор на блок');
    ids.add(id);
    if (block.type === 'text') return { id, type: 'text', markdown: text(block.markdown, 150000, false, `Текстов блок ${index + 1}`) };
    if (block.type === 'image') return { id, type: 'image', image: image(block.image, published, `Изображение в блок ${index + 1}`) };
    if (block.type === 'gallery' && Array.isArray(block.images) && block.images.length > 0 && block.images.length <= 20) return { id, type: 'gallery', images: block.images.map((item, imageIndex) => image(item, published, `Снимка ${imageIndex + 1} в галерия ${index + 1}`)) };
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
    slug: slug(body.slug),
    title: text(body.title, 240, true, 'Заглавието'),
    excerpt: text(body.excerpt, 1000, published, 'Краткото описание'),
    status: body.status as 'draft' | 'published', contentType: body.contentType as string, rubricId, repairCategoryId,
    tags: stringList(body.tags, 30, 'Етикетите'), keywords: stringList(body.keywords, 30, 'Ключовите думи'), blocks: blocks(body.blocks, published),
    heroImage: body.heroImage ? image(body.heroImage, published, 'Основното изображение') : null,
    seoTitle: text(body.seoTitle ?? '', 240, false, 'SEO заглавието'), seoDescription: text(body.seoDescription ?? '', 400, false, 'SEO описанието'),
    author: text(body.author ?? '', 140, published, 'Авторът'),
    calculatorCategory: body.calculatorCategory ? text(body.calculatorCategory, 80, true, 'Категорията за калкулатор') : null,
    relatedArticles: [...new Set<number>(body.relatedArticles)], featured: body.featured,
  };
}

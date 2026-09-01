import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { articleInput, blocks, image, slug } from './knowledge-validation';
import { KnowledgeAdminGuard } from './knowledge-admin.guard';
import { KnowledgeService } from './knowledge.service';

const draft = () => ({ slug: 'test-article', title: 'Заглавие', excerpt: '', status: 'draft', contentType: 'ARTICLE', rubricId: 1, repairCategoryId: null, tags: [], keywords: [], blocks: [{ id: 'a', type: 'text', markdown: '## Тема\n\nТекст' }], heroImage: null, author: 'Екипът на Bricky', relatedArticles: [], featured: false });
const photo = () => ({ url: '/uploads/knowledge/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp', alt: 'Баня', caption: '', align: 'wide', kind: 'photo' });

describe('Knowledge validation', () => {
  it('saves drafts, and requires an excerpt and text before publishing', () => {
    expect(articleInput(draft()).status).toBe('draft');
    expect(() => articleInput({ ...draft(), status: 'published' })).toThrow(BadRequestException);
    expect(() => articleInput({ ...draft(), status: 'published', excerpt: 'Описание', blocks: [] })).toThrow(BadRequestException);
    expect(articleInput({ ...draft(), status: 'published', excerpt: 'Описание' }).status).toBe('published');
  });
  it('rejects HTML paths, remote image URLs, SVG and traversal', () => {
    for (const url of ['javascript:alert(1)', 'https://evil.test/image.jpg', '/uploads/knowledge/../secret.webp', '/uploads/knowledge/a.svg', '//evil.test/a.webp']) expect(() => image({ ...photo(), url })).toThrow(BadRequestException);
    expect(image(photo()).url).toBe(photo().url);
    expect(() => slug('bad<script>')).toThrow(BadRequestException);
  });
  it('requires alt text for published images and rejects duplicate block IDs', () => {
    expect(() => image({ ...photo(), alt: '' }, true)).toThrow(BadRequestException);
    expect(() => blocks([{ id: 'a', type: 'text', markdown: 'a' }, { id: 'a', type: 'image', image: photo() }], false)).toThrow(BadRequestException);
  });
  it('rejects excessive blocks, galleries, tag lists and invalid foreign ids', () => {
    expect(() => blocks(Array(101).fill({ id: 'a', type: 'text', markdown: '' }), false)).toThrow();
    expect(() => blocks([{ id: 'a', type: 'gallery', images: [] }], false)).toThrow();
    expect(() => articleInput({ ...draft(), tags: 'string' })).toThrow();
    expect(() => articleInput({ ...draft(), rubricId: '1 OR 1=1' })).toThrow();
    expect(() => articleInput({ ...draft(), relatedArticles: [-1] })).toThrow();
  });
  it('keeps block order, image captions, alignment and infographic kind', () => {
    const result = blocks([{ id: 'a', type: 'image', image: { ...photo(), caption: 'Преди ремонта', align: 'right', kind: 'infographic' } }, ...draft().blocks.map(b => ({ ...b, id: 'b' }))], true);
    expect(result.map(b => b.id)).toEqual(['a', 'b']);
    expect((result[0] as any).image.caption).toBe('Преди ремонта');
  });
  it('identifies the exact field and limit in validation errors', () => {
    expect(() => articleInput({ ...draft(), excerpt: 'а'.repeat(1001) })).toThrow('Краткото описание е до 1000 знака (в момента: 1001)');
    expect(() => articleInput({ ...draft(), tags: ['а'.repeat(101)] })).toThrow('Етикетите, запис 1 е до 100 знака (в момента: 101)');
    expect(() => articleInput({ ...draft(), status: 'published', excerpt: 'Описание', heroImage: { ...photo(), alt: '' } })).toThrow('Основното изображение: описанието (alt) е задължително');
  });
});

describe('Knowledge admin guard', () => {
  const context = { switchToHttp: () => ({ getRequest: () => ({ user: { id: 1, role: 'admin' } }) }) };
  it.each([{ role: 'worker', status: 'active' }, { role: 'admin', status: 'suspended' }, null])('rejects a forged/stale admin role or disabled account: %j', async user => {
    const guard = new KnowledgeAdminGuard({ findOneBy: jest.fn().mockResolvedValue(user) } as any);
    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('accepts active admin from the database', async () => {
    const guard = new KnowledgeAdminGuard({ findOneBy: jest.fn().mockResolvedValue({ role: 'admin', status: 'active' }) } as any);
    await expect(guard.canActivate(context as any)).resolves.toBe(true);
  });
});

describe('Knowledge service', () => {
  function setup(previous: any = null) {
    const repo = { findOne: jest.fn().mockResolvedValue(previous), create: jest.fn(v => v), save: jest.fn(v => ({ id: 1, ...v })), update: jest.fn() };
    const db = { transaction: jest.fn(fn => fn({ getRepository: () => repo })) };
    const articles = { countBy: jest.fn().mockResolvedValue(0), findOneBy: jest.fn().mockResolvedValue(null) };
    const service = new KnowledgeService(articles as any, { existsBy: async () => true } as any, { existsBy: async () => true } as any, db as any);
    return { service, repo, db, articles };
  }
  it('hides unpublished/deleted details and includes status filters in the lookup', async () => {
    const { service, articles } = setup();
    await expect(service.publicArticle('draft')).rejects.toBeInstanceOf(NotFoundException);
    expect(articles.findOneBy).toHaveBeenCalledWith(expect.objectContaining({ status: 'published', slug: 'draft', deletedAt: expect.anything() }));
  });
  it('refuses stale updates before writing', async () => {
    const { service, repo } = setup({ id: 1, version: 3, slug: 'test-article' });
    await expect(service.save(1, { ...draft(), version: 2 }, 1)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('keeps published URLs immutable even after unpublishing', async () => {
    const { service } = setup({ id: 1, version: 3, slug: 'old-url', publishedAt: new Date(), status: 'draft' });
    await expect(service.save(1, { ...draft(), version: 3 }, 1)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects invalid images based on bytes, not the filename', async () => {
    const { service } = setup();
    await expect(service.upload({ buffer: Buffer.from('<svg/>'), size: 6, originalname: 'photo.jpg' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload(undefined)).rejects.toBeInstanceOf(BadRequestException);
    const gif = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#fff' } }).gif().toBuffer();
    await expect(service.upload({ buffer: gif, size: gif.length } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});

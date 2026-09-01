import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
import sharp from 'sharp';
import { getUploadsRoot } from '../common/storage-paths';
import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';
import { RepairCategoryEntity } from '../catalog/repair-category.entity';
import { KnowledgeArticle, KnowledgeRubric } from './knowledge.entity';
import { articleInput, CONTENT_TYPES, slug, text } from './knowledge-validation';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeArticle) private readonly articles: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeRubric) private readonly rubrics: Repository<KnowledgeRubric>,
    @InjectRepository(RepairCategoryEntity) private readonly repairs: Repository<RepairCategoryEntity>,
    private readonly db: DataSource,
  ) {}

  async metadata() {
    const [rubrics, categories, counts] = await Promise.all([
      this.rubrics.find({ order: { sortOrder: 'ASC', id: 'ASC' } }),
      this.repairs.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } }),
      this.articles.createQueryBuilder('a').select('a.rubricId', 'id').addSelect('COUNT(*)', 'count')
        .where('a.status = :status AND a.deletedAt IS NULL', { status: 'published' }).groupBy('a.rubricId').getRawMany(),
    ]);
    return { rubrics: rubrics.map(r => ({ ...r, count: Number(counts.find(c => Number(c.id) === r.id)?.count || 0) })), categories, contentTypes: CONTENT_TYPES };
  }

  async list(query: any = {}, admin = false) {
    const page = Math.max(1, Math.min(10000, Number.parseInt(query.page, 10) || 1));
    const limit = Math.max(1, Math.min(48, Number.parseInt(query.limit, 10) || 24));
    const qb = this.articles.createQueryBuilder('a').where('a.deletedAt IS NULL');
    if (!admin) qb.andWhere('a.status = :published', { published: 'published' });
    else if (['draft', 'published'].includes(query.status)) qb.andWhere('a.status = :status', { status: query.status });
    if (query.rubric) {
      const rubric = await this.rubrics.findOneBy({ slug: String(query.rubric) });
      qb.andWhere('a.rubricId = :rubric', { rubric: rubric?.id || -1 });
    }
    if (query.repair) {
      const repair = await this.repairs.findOneBy({ categoryKey: String(query.repair), isActive: true });
      qb.andWhere('a.repairCategoryId = :repair', { repair: repair?.id || -1 });
    }
    // Parameterized, bounded all-word search includes tags, category, captions and body.
    const terms = String(query.q || '').trim().slice(0, 160).split(/\s+/).filter(Boolean).slice(0, 8);
    if (terms.length) {
      qb.leftJoin(KnowledgeRubric, 'r', 'r.id = a.rubricId').leftJoin(RepairCategoryEntity, 'c', 'c.id = a.repairCategoryId');
      terms.forEach((term, i) => {
        const value = `%${term.replace(/[!%_]/g, '!$&')}%`;
        qb.andWhere(`LOWER(CONCAT_WS(' ', a.title, a.excerpt, CAST(a.tags AS CHAR), CAST(a.keywords AS CHAR), CAST(a.blocks AS CHAR), r.label, c.label)) LIKE LOWER(:term${i}) ESCAPE '!'`, { [`term${i}`]: value });
      });
    }
    qb.select(['a.id', 'a.slug', 'a.title', 'a.excerpt', 'a.status', 'a.contentType', 'a.rubricId', 'a.repairCategoryId', 'a.tags', 'a.heroImage', 'a.author', 'a.featured', 'a.publishedAt', 'a.updatedAt', 'a.version']);
    qb.orderBy('a.featured', 'DESC').addOrderBy(admin ? 'a.updatedAt' : 'a.title', admin ? 'DESC' : 'ASC').addOrderBy('a.id', 'ASC');
    const [items, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async publicArticle(value: string) {
    const article = await this.articles.findOneBy({ slug: value, status: 'published', deletedAt: IsNull() });
    if (!article) throw new NotFoundException('Статията не е намерена');
    const related = article.relatedArticles.length ? await this.articles.find({ where: { id: In(article.relatedArticles), status: 'published', deletedAt: IsNull() } }) : [];
    return { ...article, related: related.filter(a => a.id !== article.id).map(a => ({ id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt, heroImage: a.heroImage })) };
  }

  async adminArticle(id: number) {
    const article = await this.articles.findOneBy({ id, deletedAt: IsNull() });
    if (!article) throw new NotFoundException('Статията не е намерена');
    return article;
  }

  private audit(manager: EntityManager, adminUserId: number, action: string, id: number, metadata: Record<string, any>) {
    return manager.getRepository(AdminAuditLogEntity).save({ adminUserId, action, targetType: 'knowledge_article', targetId: String(id), metadataJson: metadata });
  }

  async save(adminUserId: number, body: any, id?: number) {
    const input = articleInput(body);
    if (!await this.rubrics.existsBy({ id: input.rubricId })) throw new BadRequestException('Невалидна рубрика');
    if (input.repairCategoryId && !await this.repairs.existsBy({ id: input.repairCategoryId, isActive: true })) throw new BadRequestException('Невалидна ремонтна категория');
    if (input.calculatorCategory && !await this.repairs.existsBy({ categoryKey: input.calculatorCategory, isActive: true })) throw new BadRequestException('Невалидна категория за калкулатор');
    if (input.relatedArticles.includes(id || -1)) throw new BadRequestException('Статията не може да свързва сама себе си');
    if (input.relatedArticles.length && await this.articles.countBy({ id: In(input.relatedArticles), deletedAt: IsNull() }) !== input.relatedArticles.length) throw new BadRequestException('Свързана статия вече не съществува');
    try {
      return await this.db.transaction(async manager => {
        const repo = manager.getRepository(KnowledgeArticle);
        const previous = id ? await repo.findOne({ where: { id, deletedAt: IsNull() }, lock: { mode: 'pessimistic_write' } }) : null;
        if (id && !previous) throw new NotFoundException('Статията не е намерена');
        if (previous && body.version !== previous.version) throw new ConflictException('Статията е променена в друг прозорец. Презаредете я преди запис.');
        if (previous?.publishedAt && previous.slug !== input.slug) throw new BadRequestException('Адресът на публикувана статия не може да се променя');
        const article = repo.create({ ...previous, ...input, version: (previous?.version || 0) + 1, publishedAt: previous?.publishedAt || (input.status === 'published' ? new Date() : null), deletedAt: null });
        const saved = await repo.save(article);
        await this.audit(manager, adminUserId, id ? 'knowledge.update' : 'knowledge.create', saved.id, { title: saved.title, status: saved.status, previousStatus: previous?.status, version: saved.version });
        return saved;
      });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') throw new ConflictException('Този адрес вече се използва');
      throw error;
    }
  }

  async remove(adminUserId: number, id: number, version: number) {
    return this.db.transaction(async manager => {
      const repo = manager.getRepository(KnowledgeArticle);
      const item = await repo.findOne({ where: { id, deletedAt: IsNull() }, lock: { mode: 'pessimistic_write' } });
      if (!item) throw new NotFoundException();
      if (item.version !== version) throw new ConflictException('Статията е променена. Презаредете списъка.');
      await repo.update(id, { deletedAt: new Date(), status: 'draft', version: item.version + 1 });
      await this.audit(manager, adminUserId, 'knowledge.delete', id, { title: item.title, version });
      return { ok: true };
    });
  }

  async saveRubric(adminUserId: number, body: any, id?: number) {
    const value = {
      slug: slug(body?.slug, 80),
      label: text(body?.label, 140, true, 'Името на рубриката'),
      description: text(body?.description ?? '', 1000, false, 'Описанието на рубриката'),
      sortOrder: Number(body?.sortOrder || 0),
    };
    if (!Number.isSafeInteger(value.sortOrder) || Math.abs(value.sortOrder) > 10000 || ['articles', 'metadata', 'sitemap'].includes(value.slug)) throw new BadRequestException('Невалидна рубрика');
    return this.db.transaction(async manager => {
      const repo = manager.getRepository(KnowledgeRubric);
      const previous = id ? await repo.findOneBy({ id }) : null;
      if (id && !previous) throw new NotFoundException();
      if (previous && previous.slug !== value.slug) throw new BadRequestException('Адресът на рубриката е постоянен');
      if (!id && await repo.existsBy({ slug: value.slug })) throw new ConflictException('Рубриката вече съществува');
      const saved = await repo.save(repo.create({ ...previous, ...value }));
      await manager.getRepository(AdminAuditLogEntity).save({ adminUserId, action: 'knowledge.rubric.save', targetType: 'knowledge_rubric', targetId: String(saved.id), metadataJson: { label: saved.label } });
      return saved;
    });
  }

  async upload(file: Express.Multer.File | undefined) {
    if (!file?.buffer || !file.size || file.size > 12 * 1024 * 1024) throw new BadRequestException('Изберете снимка до 12 MB');
    let buffer: Buffer;
    try {
      const source = sharp(file.buffer, { limitInputPixels: 40000000 });
      const meta = await source.metadata();
      if (!['jpeg', 'png', 'webp'].includes(meta.format || '') || (meta.pages || 1) > 1) throw new Error('format');
      buffer = await source.rotate().resize({ width: 2400, height: 6000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { throw new BadRequestException('Снимката трябва да е валиден JPG, PNG или WebP'); }
    const directory = join(getUploadsRoot(), 'knowledge');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    await writeFile(join(directory, filename), buffer, { flag: 'wx' });
    return { url: `/uploads/knowledge/${filename}`, alt: '', caption: '', align: 'wide', kind: 'photo' };
  }

  async sitemap() {
    const articles = await this.articles.find({ where: { status: 'published', deletedAt: IsNull() }, select: { slug: true, updatedAt: true, rubricId: true, repairCategoryId: true } });
    const rubrics = await this.rubrics.find();
    const repairs = await this.repairs.findBy({ isActive: true });
    const urls = ['/knowledge', ...rubrics.filter(r => articles.some(a => a.rubricId === r.id)).map(r => `/knowledge/${r.slug}`), ...repairs.filter(r => articles.some(a => a.repairCategoryId === r.id)).map(r => `/knowledge/repairs/${encodeURIComponent(r.categoryKey)}`)];
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>https://bricky.bg${path}</loc></url>`).join('')}${articles.map(a => `<url><loc>https://bricky.bg/blog/${a.slug}</loc><lastmod>${a.updatedAt.toISOString()}</lastmod></url>`).join('')}</urlset>`;
  }
}

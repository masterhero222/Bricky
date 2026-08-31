import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

const source = JSON.parse(await readFile(new URL('../../frontend/src/data/blogContent.generated.json', import.meta.url), 'utf8'));
const aliases = { 'kolko-struva': 'prices', 'cherven-flag': 'red-flags', 'briki-obyasnyava': 'guides', 'istinski-obekti': 'projects', 'remontni-dilemi': 'repairs', 'za-profesionalisti': 'workers', 'stroim-bricky': 'how-bricky-works' };
const types = { prices: 'PRICE_GUIDE', 'red-flags': 'RED_FLAG', projects: 'REAL_PROJECT', guides: 'REPAIR_GUIDE', 'how-bricky-works': 'BRICKY_GUIDE' };
const args = process.argv.slice(2);
const database = args[args.indexOf('--database') + 1];
if (!args.includes('--apply')) {
  console.log(`Dry run: ${source.length} source articles. Existing slugs (including deleted articles) will never be overwritten. Use --apply --database <DB_NAME> after applying 20260831_knowledge_cms.sql.`);
  process.exit(0);
}
if (!args.includes('--database') || !database || database !== process.env.DB_NAME) throw new Error('Explicit --database must match DB_NAME. No changes made.');
const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASS, database, charset: 'utf8mb4' });
try {
  await db.beginTransaction();
  let added = 0;
  for (const article of source) {
    if (article.status !== 'published') continue;
    const [existing] = await db.execute('SELECT id FROM knowledge_articles WHERE slug = ?', [article.slug]);
    if (existing.length) continue;
    const rubricSlug = aliases[article.categoryKey];
    if (!rubricSlug) throw new Error(`Unmapped rubric: ${article.categoryKey}`);
    const [rubrics] = await db.execute('SELECT id FROM knowledge_rubrics WHERE slug = ?', [rubricSlug]);
    if (!rubrics.length) throw new Error('Apply the CMS migration first.');
    const [repairs] = await db.execute('SELECT id, category_key FROM repair_categories WHERE category_key = ? AND is_active = 1', [article.calculatorCategoryKey || '']);
    const hero = article.coverImage ? { url: article.coverImage, alt: article.coverAlt || article.title, caption: '', align: 'wide', kind: 'infographic' } : null;
    const [result] = await db.execute(`INSERT INTO knowledge_articles
      (slug,title,excerpt,status,content_type,rubric_id,repair_category_id,tags,keywords,blocks,hero_image,seo_title,seo_description,author,calculator_category,related_articles,featured,published_at)
      VALUES (?,?,?,'published',?,?,?,'[]','[]',?,?,?,?,?,?,'[]',?,?)`,
      [article.slug, article.title, article.excerpt, types[rubricSlug] || 'ARTICLE', rubrics[0].id, repairs[0]?.id || null,
        JSON.stringify([{ id: 'imported-text', type: 'text', markdown: article.markdown }]), JSON.stringify(hero), article.metaTitle || '', article.metaDescription || '', article.authorName || 'Екипът на Bricky', repairs[0]?.category_key || null, Boolean(article.featured), new Date(article.publishedAt)]);
    await db.execute(`INSERT INTO admin_action_audit_logs (admin_user_id, action, target_type, target_id, metadata_json) VALUES (NULL, 'knowledge.import', 'knowledge_article', ?, ?)`, [String(result.insertId), JSON.stringify({ slug: article.slug, source: 'legacy-markdown' })]);
    added++;
  }
  await db.commit();
  console.log(`Knowledge import complete: ${added} inserted; existing articles untouched.`);
} catch (error) { await db.rollback(); throw error; } finally { await db.end(); }

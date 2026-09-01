import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const [articlePath, rawAdminUserId] = process.argv.slice(2);
const adminUserId = Number(rawAdminUserId);
if (!articlePath || !Number.isSafeInteger(adminUserId) || adminUserId < 1) {
  throw new Error('Usage: node scripts/import-knowledge-article.mjs <article.json> <admin-user-id>');
}

const article = JSON.parse(await readFile(articlePath, 'utf8'));
const required = ['slug', 'title', 'excerpt', 'status', 'contentType', 'rubricSlug', 'repairCategoryKey', 'blocks'];
if (required.some(field => article[field] == null) || !Array.isArray(article.blocks)) throw new Error('Invalid article payload');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
});

await connection.beginTransaction();
try {
  let [[rubric]] = await connection.execute('SELECT id FROM knowledge_rubrics WHERE slug = ? FOR UPDATE', [article.rubricSlug]);
  if (!rubric) {
    const [result] = await connection.execute(
      'INSERT INTO knowledge_rubrics (slug, label, description, sort_order) VALUES (?, ?, ?, ?)',
      [article.rubricSlug, article.rubricLabel, article.rubricDescription, article.rubricSortOrder || 0],
    );
    rubric = { id: result.insertId };
  }
  const [[category]] = await connection.execute('SELECT id FROM repair_categories WHERE category_key = ? AND is_active = 1', [article.repairCategoryKey]);
  if (!category) throw new Error(`Unknown repair category: ${article.repairCategoryKey}`);

  const [[previous]] = await connection.execute('SELECT id, status, version FROM knowledge_articles WHERE slug = ? FOR UPDATE', [article.slug]);
  const values = [
    article.title, article.excerpt, article.status, article.contentType, rubric.id, category.id,
    JSON.stringify(article.tags || []), JSON.stringify(article.keywords || []), JSON.stringify(article.blocks),
    JSON.stringify(article.heroImage), article.seoTitle || '', article.seoDescription || '', article.author || '',
    article.calculatorCategory || null, JSON.stringify(article.relatedArticles || []), Boolean(article.featured),
  ];
  let articleId;
  if (previous) {
    articleId = previous.id;
    await connection.execute(`UPDATE knowledge_articles SET
      title = ?, excerpt = ?, status = ?, content_type = ?, rubric_id = ?, repair_category_id = ?, tags = ?, keywords = ?,
      blocks = ?, hero_image = ?, seo_title = ?, seo_description = ?, author = ?, calculator_category = ?, related_articles = ?,
      featured = ?, version = version + 1, published_at = COALESCE(published_at, NOW()), deleted_at = NULL WHERE id = ?`, [...values, articleId]);
  } else {
    const [result] = await connection.execute(`INSERT INTO knowledge_articles
      (slug, title, excerpt, status, content_type, rubric_id, repair_category_id, tags, keywords, blocks, hero_image, seo_title,
       seo_description, author, calculator_category, related_articles, featured, version, published_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NULL)`, [article.slug, ...values]);
    articleId = result.insertId;
  }
  await connection.execute(
    'INSERT INTO admin_action_audit_logs (admin_user_id, action, target_type, target_id, reason, metadata_json) VALUES (?, ?, ?, ?, ?, ?)',
    [adminUserId, previous ? 'knowledge.update' : 'knowledge.create', 'knowledge_article', String(articleId), 'Публикуване на техническо ръководство', JSON.stringify({ title: article.title, status: article.status, previousStatus: previous?.status, source: 'versioned-content-import' })],
  );
  await connection.commit();
  console.log(JSON.stringify({ id: articleId, slug: article.slug, status: article.status, rubricId: rubric.id, version: (previous?.version || 0) + 1 }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const [backendDirectory, packageDirectory, rawExpectedVersion, rawAdminId, backupDirectory] = process.argv.slice(2);
const expectedVersion = Number(rawExpectedVersion);
const adminId = Number(rawAdminId);
if (!backendDirectory || !packageDirectory || !backupDirectory || !Number.isSafeInteger(expectedVersion) || !Number.isSafeInteger(adminId)) throw new Error('Invalid publication arguments');
const require = createRequire(join(resolve(backendDirectory), 'package.json'));
const mysql = require('mysql2/promise');
const { articleInput } = require(join(resolve(backendDirectory), 'dist/knowledge/knowledge-validation.js'));
const article = articleInput(JSON.parse(await readFile(join(packageDirectory, 'article.json'), 'utf8')));
const manifest = JSON.parse(await readFile(join(packageDirectory, 'manifest.json'), 'utf8'));
const pid = execFileSync('pm2', ['pid', 'bricky-backend'], { encoding: 'utf8' }).trim();
if (!/^\d+$/.test(pid)) throw new Error('Backend process unavailable');
const runtime = Object.fromEntries((await readFile(`/proc/${pid}/environ`, 'utf8')).split('\0').filter(Boolean).map(entry => { const at = entry.indexOf('='); return [entry.slice(0, at), entry.slice(at + 1)]; }));
if (!runtime.DB_NAME || !runtime.UPLOADS_DIR) throw new Error('Missing database or persistent storage configuration');
const connection = await mysql.createConnection({ host: runtime.DB_HOST, port: Number(runtime.DB_PORT || 3306), user: runtime.DB_USER, password: runtime.DB_PASS, database: runtime.DB_NAME, charset: 'utf8mb4' });
try {
  await connection.beginTransaction();
  const [[admin]] = await connection.execute('SELECT id, role, status FROM users WHERE id = ?', [adminId]);
  if (!admin || !['admin', 'super_admin'].includes(admin.role) || admin.status !== 'active') throw new Error('Active administrator required');
  const [[previous]] = await connection.execute('SELECT * FROM knowledge_articles WHERE slug = ? AND deleted_at IS NULL FOR UPDATE', [article.slug]);
  if (!previous || previous.version !== expectedVersion) throw new Error('Article changed since inspection; refusing overwrite');
  const [[rubric]] = await connection.execute('SELECT id FROM knowledge_rubrics WHERE id = ?', [article.rubricId]);
  const [[category]] = await connection.execute('SELECT id FROM repair_categories WHERE id = ? AND is_active = 1', [article.repairCategoryId]);
  if (!rubric || !category) throw new Error('Invalid classification');
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  await writeFile(join(backupDirectory, `article-${previous.id}-v${previous.version}.json`), JSON.stringify(previous, null, 2), { flag: 'wx', mode: 0o600 });
  const uploads = join(runtime.UPLOADS_DIR, 'knowledge');
  const filenames = new Set();
  for (const item of manifest) {
    if (!/^[a-f0-9-]+\.webp$/.test(item.output)) throw new Error('Invalid asset path');
    const from = join(packageDirectory, 'images', item.output);
    const bytes = await readFile(from);
    if (createHash('sha256').update(bytes).digest('hex') !== item.outputSha256) throw new Error('Asset checksum mismatch');
    const target = join(uploads, item.output);
    try { await copyFile(from, target, constants.COPYFILE_EXCL); }
    catch (error) {
      if (error.code !== 'EEXIST' || !(await readFile(target)).equals(bytes)) throw error;
    }
    filenames.add(`/uploads/knowledge/${item.output}`);
  }
  for (const image of [article.heroImage, ...article.blocks.flatMap(block => block.type === 'image' ? [block.image] : block.type === 'gallery' ? block.images : [])].filter(Boolean)) {
    if (!filenames.has(image.url)) throw new Error('Missing article asset');
  }
  const values = [article.title, article.excerpt, article.status, article.contentType, article.rubricId, article.repairCategoryId,
    JSON.stringify(article.tags), JSON.stringify(article.keywords), JSON.stringify(article.blocks), JSON.stringify(article.heroImage),
    article.seoTitle, article.seoDescription, article.author, article.calculatorCategory, JSON.stringify(article.relatedArticles), article.featured, previous.id, expectedVersion];
  const [result] = await connection.execute(`UPDATE knowledge_articles SET title=?, excerpt=?, status=?, content_type=?, rubric_id=?, repair_category_id=?, tags=?, keywords=?, blocks=?, hero_image=?, seo_title=?, seo_description=?, author=?, calculator_category=?, related_articles=?, featured=?, version=version+1, published_at=COALESCE(published_at,NOW()), updated_at=NOW() WHERE id=? AND version=?`, values);
  if (result.affectedRows !== 1) throw new Error('Article update failed');
  await connection.execute('INSERT INTO admin_action_audit_logs (admin_user_id, action, target_type, target_id, reason, metadata_json) VALUES (?, ?, ?, ?, ?, ?)',
    [adminId, 'knowledge.update', 'knowledge_article', String(previous.id), 'Публикуване на предоставения от собственика текст и илюстрации', JSON.stringify({ slug: article.slug, previousVersion: previous.version, blocks: article.blocks.length, images: filenames.size, source: 'owner-provided-source-folder' })]);
  await connection.commit();
  console.log(JSON.stringify({ id: previous.id, slug: article.slug, version: expectedVersion + 1, blocks: article.blocks.length, images: filenames.size, status: article.status }));
} catch (error) { await connection.rollback(); throw error; }
finally { await connection.end(); }

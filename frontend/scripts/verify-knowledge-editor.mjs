import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

// Isolated browser test against the production build; never calls the live API.
const dist = resolve('dist');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname.startsWith('/assets/') ? resolve(dist, `.${pathname}`) : resolve(dist, 'index.html');
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('dialog', dialog => dialog.accept());
  await page.addInitScript(() => { localStorage.setItem('role', 'admin'); localStorage.setItem('token', 'local-test-only'); });
  const image = { url: '/uploads/knowledge/abc.webp', alt: 'Покрив', caption: 'Проверка', align: 'right', kind: 'infographic' };
  let article = { id: 1, version: 1, slug: 'roof', title: 'Покрив', excerpt: 'Ръководство', status: 'published', contentType: 'TECHNICAL_GUIDE', rubricId: 1, repairCategoryId: 2, tags: ['покрив'], keywords: [], blocks: Array.from({ length: 151 }, (_, i) => i % 2 ? { id: `b-${i}`, type: 'image', image } : { id: `b-${i}`, type: 'text', markdown: `## Етап ${i}\n\nТекст` }), heroImage: image, author: 'Bricky', relatedArticles: [], featured: false, seoTitle: '', seoDescription: '', calculatorCategory: null, publishedAt: '2026-09-01', updatedAt: '2026-09-01' };
  let saves = 0;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data = {};
    if (path.endsWith('/knowledge/metadata')) data = { rubrics: [{ id: 1, slug: 'how-to', label: 'Как се прави' }], categories: [{ id: 2, categoryKey: 'roof', label: 'Покриви' }], contentTypes: ['TECHNICAL_GUIDE'] };
    else if (path.endsWith('/knowledge/articles/1')) {
      if (route.request().method() === 'PUT') { article = { ...route.request().postDataJSON(), version: article.version + 1 }; saves++; }
      data = article;
    } else if (path.endsWith('/knowledge/articles')) data = { items: [article], total: 1, limit: 24 };
    await route.fulfill({ json: data });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/admin/knowledge`);
  await page.getByRole('button', { name: 'Покрив', exact: true }).click();
  await page.getByLabel('Заглавие', { exact: true }).fill('Покрив - редакция');
  await page.getByLabel('Текст на блока').first().fill('## Нов текст\n\nЗапазена редакция.');
  await page.waitForFunction(() => sessionStorage.getItem('bricky:knowledge-draft:roof')?.includes('Запазена редакция'));
  const rescue = await readFile(new URL('./rescue-open-knowledge-editor.js', import.meta.url), 'utf8');
  await page.evaluate(rescue);
  const recovered = await page.evaluate(() => JSON.parse(sessionStorage.getItem('bricky:knowledge-draft:roof')).article);
  assert.equal(recovered.blocks.length, 151);
  assert.equal(recovered.blocks[0].markdown, '## Нов текст\n\nЗапазена редакция.');
  assert.deepEqual(recovered.blocks[1].image, image);
  assert.deepEqual(recovered.heroImage, image);
  assert.equal(recovered.title, 'Покрив - редакция');
  await page.reload();
  await page.getByRole('button', { name: 'Покрив', exact: true }).click();
  assert.equal(await page.getByLabel('Заглавие', { exact: true }).inputValue(), 'Покрив - редакция');
  assert.equal(await page.getByLabel('Текст на блока').first().inputValue(), '## Нов текст\n\nЗапазена редакция.');
  await page.getByRole('button', { name: 'Запази', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Статията е публикувана.' }).waitFor();
  assert.equal(saves, 1);
  assert.equal(article.blocks.length, 151);
  assert.equal(article.blocks[0].markdown, recovered.blocks[0].markdown);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('bricky:knowledge-draft:roof')), null);
  console.log('PASS: 151-block editor save, draft recovery and old-tab rescue preserve text, images and order.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

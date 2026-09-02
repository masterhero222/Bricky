import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const [packageDirectory] = process.argv.slice(2);
const expected = JSON.parse(await readFile(`${packageDirectory}/article.json`, 'utf8'));
const response = await fetch('https://bricky.bg/api/knowledge/articles/remont-na-pokrivi');
assert.equal(response.status, 200);
const actual = await response.json();
assert.equal(actual.status, 'published');
assert.deepEqual(actual.blocks, expected.blocks);
assert.deepEqual(actual.heroImage, expected.heroImage);
assert.equal(actual.rubricId, 1);
assert.equal(actual.repairCategoryId, 12);
const assets = [...new Set([actual.heroImage.url, ...actual.blocks.filter(b => b.type === 'image').map(b => b.image.url)])];
for (const asset of assets) {
  const result = await fetch(`https://bricky.bg/api${asset}`, { method: 'HEAD' });
  assert.equal(result.status, 200, asset);
  assert.match(result.headers.get('content-type'), /image\/webp/);
}
const sitemap = await (await fetch('https://bricky.bg/api/knowledge/sitemap.xml')).text();
assert.ok(sitemap.includes('/blog/remont-na-pokrivi'));
await mkdir(`${packageDirectory}/screenshots`, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto('https://bricky.bg/blog/remont-na-pokrivi', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: expected.title, exact: true }).waitFor();
    assert.equal(await page.locator('.knowledge-prose > figure').count(), 41);
    const hero = page.locator('.knowledge-article > figure img');
    await hero.evaluate(img => img.decode());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} overflow`);
    await page.screenshot({ path: `${packageDirectory}/screenshots/${name}-top.png` });
    const figure = page.locator('.knowledge-prose > figure').nth(13);
    await figure.scrollIntoViewIfNeeded();
    await figure.locator('img').evaluate(img => img.decode());
    await page.screenshot({ path: `${packageDirectory}/screenshots/${name}-body.png` });
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ status: 'verified', version: actual.version, blocks: actual.blocks.length, images: assets.length, sitemap: true, desktop: true, mobile: true }));

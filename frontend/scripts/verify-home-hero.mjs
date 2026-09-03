import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { preview } from 'vite';
import { chromium } from 'playwright';

const output = process.argv[2];
const liveUrl = process.argv[3];
if (!output) throw new Error('Provide screenshot directory');
await mkdir(output, { recursive: true });
const server = liveUrl ? null : await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
const url = liveUrl || server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[1854, 900], [1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 568], [2560, 1440]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('#home-title').waitFor();
    await page.locator('.home-hero-art img').evaluate(img => img.decode());
    assert.equal(await page.locator('.home-hero-actions a').first().getAttribute('href'), '/auth/register?role=client');
    assert.equal(await page.locator('.home-hero-actions a').last().getAttribute('href'), '/workers');
    const layout = await page.evaluate(() => {
      const hero = document.querySelector('.home-hero').getBoundingClientRect();
      const copy = document.querySelector('.home-hero-copy').getBoundingClientRect();
      const image = document.querySelector('.home-hero-art img');
      const rect = image.getBoundingClientRect();
      const drawnWidth = Math.min(rect.width, rect.height * image.naturalWidth / image.naturalHeight);
      const drawnHeight = drawnWidth * image.naturalHeight / image.naturalWidth;
      const subjectLeft = rect.right - drawnWidth * 0.97;
      const subjectTop = rect.bottom - drawnHeight * 0.99;
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, heroBottom: hero.bottom, nextSectionVisible: hero.bottom < innerHeight, artWidth: drawnWidth, imageLoaded: image.naturalWidth > 0, textOnSubject: copy.bottom > subjectTop && copy.right > subjectLeft && copy.top < rect.bottom, copyBottom: copy.bottom, subjectTop };
    });
    assert.equal(layout.overflow, false, `${width}: overflow`);
    assert.equal(layout.imageLoaded, true);
    assert.equal(layout.nextSectionVisible, true, `${width}x${height}: next section not visible (${JSON.stringify(layout)})`);
    assert.equal(layout.textOnSubject, false, `${width}x${height}: copy overlaps illustration (${JSON.stringify(layout)})`);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/home-${width}x${height}.png` });
    console.log(JSON.stringify({ width, height, ...layout }));
    await page.close();
  }
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
}

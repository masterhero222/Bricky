import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeKnowledgeMetadata } from '../src/components/knowledge/metadata.js';
import { articleOutline, articlePath, calculatorPath, newTextBlock, readingMinutes, safeImage, splitTextWithImage } from '../src/components/knowledge/content.js';

test('production catalog labels are localized without replacing IDs or unknown categories', () => {
  const category = { id: 42, categoryKey: 'bathroom_renovation', label: 'Bathroom renovation', description: '', isActive: true };
  const custom = { id: 73, categoryKey: 'custom', label: 'Custom' };
  const data = { rubrics: [], categories: [category, custom] };
  const result = localizeKnowledgeMetadata(data);
  assert.equal(result.categories[0].label, 'Ремонт на баня');
  assert.equal(result.categories[0].id, 42);
  assert.equal(result.categories[1], custom);
  assert.equal(data.categories[0].label, 'Bathroom renovation');
  assert.equal(localizeKnowledgeMetadata({categories:[{...category,label:'Баня по поръчка'}]}).categories[0].label, 'Баня по поръчка');
});

test('outline uses real Markdown headings, excluding fenced examples', () => {
  const blocks = [{ id: 'text-1', type: 'text', markdown: '# Start\n\n```md\n## Hidden\n```\n\n## Real **heading**\n\n### Detail' }, { id: 'image-1', type: 'image' }];
  assert.deepEqual(articleOutline(blocks), [{ id: 'text-1-1', heading: 'Start' }, { id: 'text-1-7', heading: 'Real heading' }]);
});

test('image insertion preserves text and order at the cursor', () => {
  const source = newTextBlock('First paragraph.\n\nSecond paragraph.');
  const image = { url: '/uploads/knowledge/abc.webp', alt: 'Example' };
  const blocks = splitTextWithImage(source, image, 18);
  assert.deepEqual(blocks.map(b => b.type), ['text', 'image', 'text']);
  assert.equal(blocks[0].markdown, 'First paragraph.\n\n');
  assert.equal(blocks[2].markdown, 'Second paragraph.');
  assert.equal(blocks[0].markdown + blocks[2].markdown, source.markdown);
  assert.deepEqual(blocks[1].image, image);
  assert.equal(new Set(blocks.map(b => b.id)).size, 3);
});

test('cursor bounds do not truncate content', () => {
  for (const cursor of [-10, 1000, undefined, NaN]) {
    const blocks = splitTextWithImage(newTextBlock('Text'), {}, cursor);
    assert.equal(blocks[0].markdown + blocks[2].markdown, 'Text');
  }
});

test('legacy article URLs and calculator category links are stable', () => {
  assert.equal(articlePath({ slug: 'existing-article' }), '/blog/existing-article');
  assert.equal(calculatorPath({ calculatorCategory: 'bathroom' }), '/requests?category=bathroom');
  assert.equal(calculatorPath({}), '/requests');
});

test('only controlled image assets can render', () => {
  assert.equal(safeImage('/uploads/knowledge/abc-123.webp'), true);
  assert.equal(safeImage('/assets/worker-banners/v1/blueprint-bathroom.webp'), true);
  for (const url of ['https://tracker.example/image.png', 'javascript:alert(1)', '/uploads/knowledge/../secret.webp', '/uploads/knowledge/file.svg', '//evil.example/a.webp']) assert.equal(safeImage(url), false);
});

test('reading time has a one-minute minimum and scales with text only', () => {
  assert.equal(readingMinutes([]), 1);
  assert.equal(readingMinutes([newTextBlock(Array(401).fill('word').join(' ')), { type: 'image' }]), 3);
});

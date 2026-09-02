import test from 'node:test';
import assert from 'node:assert/strict';
import { validateKnowledgeArticle } from '../src/services/knowledgeValidation.js';
import { clearKnowledgeDraft, readKnowledgeDraft, writeKnowledgeDraft } from '../src/services/knowledgeDraft.js';
import { localizeKnowledgeMetadata } from '../src/components/knowledge/metadata.js';
import { articleOutline, articlePath, calculatorPath, newTextBlock, readingMinutes, safeImage, splitTextWithImage } from '../src/components/knowledge/content.js';

const guide = count => ({ title: 'Покрив', slug: 'roof', excerpt: 'Ръководство', author: 'Bricky', status: 'published', tags: [], keywords: [], blocks: Array.from({ length: count }, (_, i) => i % 2 ? { id: `b-${i}`, type: 'image', image: { url: '/uploads/knowledge/abc.webp', alt: 'Покрив', caption: '', align: 'wide', kind: 'infographic' } } : { id: `b-${i}`, type: 'text', markdown: '## Проверка\n\nТекст' }) });

test('long illustrated articles pass client validation without dropping blocks', () => {
  for (const count of [101, 250, 1000]) {
    const article = guide(count);
    const before = JSON.stringify(article);
    assert.equal(validateKnowledgeArticle(article), '');
    assert.equal(JSON.stringify(article), before);
    assert.equal(validateKnowledgeArticle({ ...article, status: 'draft' }), '');
  }
  assert.match(validateKnowledgeArticle(guide(1001)), /1000 блока/);
});

test('size guards count UTF-8 bytes and still validate individual fields', () => {
  const article = guide(1);
  article.blocks = Array.from({ length: 4 }, (_, i) => ({ id: `b-${i}`, type: 'text', markdown: 'я'.repeat(100000) }));
  assert.equal(validateKnowledgeArticle(article), '');
  article.blocks.push({ id: 'extra', type: 'text', markdown: 'я'.repeat(60000) });
  assert.match(validateKnowledgeArticle(article), /900 KB/);
  assert.match(validateKnowledgeArticle({ ...guide(1), extra: 'я'.repeat(475000) }), /950 KB/);
  assert.match(validateKnowledgeArticle({ ...guide(1), excerpt: 'я'.repeat(1001) }), /1000 знака/);
  const missingAlt = guide(2); missingAlt.blocks[1].image.alt = '';
  assert.match(validateKnowledgeArticle(missingAlt), /alt/);
});

test('draft recovery preserves all blocks, images and optimistic concurrency version', () => {
  const values = new Map();
  const storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  const article = { ...guide(250), version: 3, tagsInput: 'покрив', keywordsInput: '' };
  assert.equal(writeKnowledgeDraft(storage, article), true);
  assert.deepEqual(readKnowledgeDraft(storage, 'roof'), article);
  assert.equal(readKnowledgeDraft(storage, 'other'), null);
  clearKnowledgeDraft(storage, 'roof');
  assert.equal(readKnowledgeDraft(storage, 'roof'), null);
  storage.setItem('bricky:knowledge-draft:roof', 'broken JSON');
  assert.equal(readKnowledgeDraft(storage, 'roof'), null);
  assert.equal(writeKnowledgeDraft({ setItem() { throw new Error('quota'); } }, article), false);
});

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

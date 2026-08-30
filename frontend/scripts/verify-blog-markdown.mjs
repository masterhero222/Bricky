import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseBlogMarkdown } from './lib/blog-markdown.mjs';
import { BLOG_RUBRICS, blogRubricPath } from '../src/data/blogRubrics.js';
import { blogArticles } from '../src/data/blogArticles.js';
import { getBlogArticlesByCategory } from '../src/utils/blog.js';

const source = await readFile(new URL('../content/blog/kolko-struva-remont-na-banya-2026.md', import.meta.url), 'utf8');

test('article preserves the full Markdown body, tables, links and date', () => {
  const article = parseBlogMarkdown(source);
  assert.equal(article.categoryKey, 'kolko-struva');
  assert.equal(article.status, 'published');
  assert.equal(article.updatedAt, '2026-08-30');
  assert.equal(article.sections.length, 7);
  assert.equal(article.calculatorCategoryKey, 'bathroom_renovation');
  assert.equal(article.markdown.startsWith('# '), false);
  const html = renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], skipHtml: true }, article.markdown));
  assert.equal((html.match(/<table>/g) || []).length, 3);
  assert.equal((html.match(/<h3>/g) || []).length, 7);
  assert.match(html, /<strong>19,10/);
  assert.match(html, /href="https:\/\/siko.bg\/blog\/kolko-struva-remont-na-banya-byudzhet"/);
  assert.match(html, /Методология и източници/);
  assert.equal(new Set(article.sections.map(item => item.id)).size, article.sections.length);
});

test('seven stable rubrics group published content and leave room for more articles', () => {
  assert.equal(BLOG_RUBRICS.length, 7);
  assert.equal(new Set(BLOG_RUBRICS.map(item => item.key)).size, 7);
  assert.equal(blogRubricPath('kolko-struva'), '/blog?rubrika=kolko-struva');
  assert.equal(blogRubricPath('all'), '/blog');
  assert.equal(getBlogArticlesByCategory('kolko-struva').length, 1);
  assert.equal(getBlogArticlesByCategory('istinski-obekti').length, 0);
  const extra = { ...blogArticles[0], id: 'second-test', slug: 'second-test' };
  blogArticles.push(extra);
  try { assert.equal(getBlogArticlesByCategory('kolko-struva').length, 2); }
  finally { blogArticles.pop(); }
});

test('front matter fails closed on unknown rubrics, status, slug and missing dates', () => {
  assert.throws(() => parseBlogMarkdown(source.replace('category: "Колко струва"', 'category: "unknown"')), /Unknown rubric/);
  assert.throws(() => parseBlogMarkdown(source.replace('status: "published"', 'status: "typo"')), /Invalid editorial status/);
  assert.throws(() => parseBlogMarkdown(source.replace('slug: "kolko-struva-remont-na-banya-2026"', 'slug: "../bad"')), /Invalid article slug/);
  assert.throws(() => parseBlogMarkdown(source.replace('updated_at: "2026-08-30"', 'updated_at: ""')), /updated_at/);
  assert.throws(() => parseBlogMarkdown(source.replace('updated_at: "2026-08-30"', 'updated_at: "2026-02-31"')), /updated_at/);
  assert.equal(parseBlogMarkdown(source.replace('status: "published"', '')).status, 'draft');
});

test('Markdown rendering does not execute raw HTML or unsafe link URLs', () => {
  const html = renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], skipHtml: true }, '<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)\n\n**safe**'));
  assert.doesNotMatch(html, /<script|javascript:/);
  assert.match(html, /<strong>safe<\/strong>/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blogArticles } from '../src/data/blogArticles.js';
import { demoBlogArticles } from './fixtures/demoBlogArticles.js';
import {
  getBlogArticleBySlug,
  getBlogArticlesByCategory,
  getFeaturedBlogArticle,
  getPublishedBlogArticles,
  getRelatedBlogArticles,
} from '../src/utils/blog.js';

test('the public catalog never includes demo fixtures', () => {
  assert.ok(demoBlogArticles.length > 0);
  assert.deepEqual(getPublishedBlogArticles(demoBlogArticles), []);
  for (const demo of demoBlogArticles) {
    assert.equal(getBlogArticleBySlug(demo.slug), null);
  }
});

test('all public selectors exclude draft and demo articles', () => {
  const original = [...blogArticles];
  const fixtures = [
    { id: 'draft', slug: 'draft', status: 'draft', featured: true, categoryKey: 'electrical' },
    { id: 'demo', slug: 'demo', status: 'demo', categoryKey: 'electrical' },
    { id: 'first', slug: 'first', status: 'published', categoryKey: 'electrical', relatedSlugs: ['draft', 'demo', 'second'] },
    { id: 'second', slug: 'second', status: 'published', categoryKey: 'flooring' },
  ];
  blogArticles.splice(0, blogArticles.length, ...fixtures);
  try {
    assert.deepEqual(getBlogArticlesByCategory('all').map(a => a.slug), ['first', 'second']);
    assert.deepEqual(getBlogArticlesByCategory('electrical').map(a => a.slug), ['first']);
    assert.equal(getFeaturedBlogArticle().slug, 'first');
    assert.equal(getBlogArticleBySlug('draft'), null);
    assert.equal(getBlogArticleBySlug('demo'), null);
    assert.equal(getBlogArticleBySlug('missing'), null);
    assert.deepEqual(getRelatedBlogArticles(fixtures[2]).map(a => a.slug), ['second']);
    blogArticles.splice(0);
    assert.equal(getFeaturedBlogArticle(), null);
    assert.deepEqual(getBlogArticlesByCategory('all'), []);
  } finally {
    blogArticles.splice(0, blogArticles.length, ...original);
  }
});

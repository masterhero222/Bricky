import { parse } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';
import { BLOG_RUBRICS } from '../../src/data/blogRubrics.js';

export function parseBlogMarkdown(source) {
  const normalized = source.replace(/\r\n/g, '\n');
  const header = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!header) throw new Error('Article must start with YAML front matter');
  const meta = parse(header[1]);
  if (!meta || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug || '')) throw new Error('Invalid article slug');
  if (typeof meta.title !== 'string' || typeof meta.description !== 'string') throw new Error('Title and description are required');
  const rubric = BLOG_RUBRICS.find(item => item.label === meta.category || item.key === meta.category);
  if (!rubric) throw new Error(`Unknown rubric: ${meta.category}`);
  const status = meta.status || 'draft';
  if (!['draft', 'published'].includes(status)) throw new Error('Invalid editorial status');
  for (const field of ['published_at', 'updated_at']) {
    if (status !== 'published') continue;
    const value = meta[field];
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Missing or invalid ${field}`);
  }
  if (meta.cover && (!meta.cover.startsWith('/assets/') || meta.cover.includes('..'))) throw new Error('Cover must be a local asset');
  let markdown = normalized.slice(header[0].length).trim();
  const parser = unified().use(remarkParse);
  const firstNode = parser.parse(markdown).children[0];
  if (firstNode?.type === 'heading' && firstNode.depth === 1) {
    if (toString(firstNode) !== meta.title) throw new Error('Markdown title differs from front matter');
    markdown = markdown.slice(firstNode.position.end.offset).trim();
  }
  const sections = parser.parse(markdown).children
    .filter(node => node.type === 'heading' && node.depth === 2)
    .map((node, index) => ({ id: `section-${index + 1}`, heading: toString(node), line: node.position.start.line }));
  if (!markdown || !sections.length) throw new Error('Article body and sections are required');
  return {
    id: meta.slug, slug: meta.slug, status,
    title: meta.title, excerpt: meta.description,
    metaTitle: `${meta.title} | Bricky`, metaDescription: meta.description,
    categoryKey: rubric.key, categoryLabel: rubric.label,
    authorName: meta.author || 'Екипът на Bricky',
    publishedAt: meta.published_at, updatedAt: meta.updated_at,
    readingTimeMinutes: Number.parseInt(meta.reading_time, 10) || Math.max(1, Math.ceil(markdown.split(/\s+/).length / 200)),
    coverImage: meta.cover, coverAlt: meta.cover_alt || '',
    calculatorCategoryKey: meta.calculator_category,
    markdown, sections, relatedSlugs: meta.related || [],
  };
}

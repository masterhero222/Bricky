import { readFile, readdir, writeFile, access } from 'node:fs/promises';
import { parseBlogMarkdown } from './lib/blog-markdown.mjs';

const sourceDir = new URL('../content/blog/', import.meta.url);
const files = (await readdir(sourceDir)).filter(name => name.endsWith('.md')).sort();
const articles = [];
const slugs = new Set();
for (const file of files) {
  const article = parseBlogMarkdown(await readFile(new URL(file, sourceDir), 'utf8'));
  if (slugs.has(article.slug)) throw new Error(`Duplicate article slug: ${article.slug}`);
  slugs.add(article.slug);
  if (article.coverImage) await access(new URL(`../public${article.coverImage}`, import.meta.url));
  // Never ship private drafts in the frontend bundle.
  if (article.status === 'published') articles.push(article);
}
articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
await writeFile(new URL('../src/data/blogContent.generated.json', import.meta.url), `${JSON.stringify(articles, null, 2)}\n`);
console.log(`Blog: ${articles.length} published article(s), ${files.length} source file(s).`);

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const sharp = require('sharp');
const { articleInput } = require('./dist/knowledge/knowledge-validation.js');
const [sourceDirectory, outputDirectory] = process.argv.slice(2);
if (!sourceDirectory || !outputDirectory) throw new Error('Usage: node scripts/prepare-roof-guide.mjs <source-images> <output>');
const source = (await readFile(new URL('../../backend/content/knowledge/remont-na-pokrivi.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const tree = unified().use(remarkParse).parse(source);
const sections = [];
for (const node of tree.children) {
  if (node.type === 'heading' && node.depth === 1) sections.push({ title: toString(node), nodes: [] });
  else if (sections.length && node.type !== 'thematicBreak') sections.at(-1).nodes.push(node);
}
const cleanTitle = title => title.replace(/^\d+\.\s*/, '').replace(/^[^\p{L}]+/u, '').trim();
const aliases = {
  'Въздушни течове': 'Въздушни течове от жилището',
  'Покривен прозорец': 'Покривен прозорец и преминавания',
};
const files = (await readdir(sourceDirectory)).filter(name => name.endsWith('.png')).sort((a, b) => a.localeCompare(b, 'bg'));
const images = new Map();
await mkdir(join(outputDirectory, 'images'), { recursive: true });
const manifest = [];
for (const name of files) {
  const input = await readFile(join(sourceDirectory, name));
  const hash = createHash('sha256').update(input).digest('hex');
  const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  const output = `${uuid}.webp`;
  const info = await sharp(input).rotate().resize({ width: 2400, height: 6000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(join(outputDirectory, 'images', output));
  const title = name.slice(0, -4);
  images.set(title, { url: `/uploads/knowledge/${output}`, alt: title.replace(' (2)', ': допълнителни проверки'), caption: '', align: 'wide', kind: 'infographic' });
  manifest.push({ source: name, output, sourceSha256: hash, outputSha256: createHash('sha256').update(await readFile(join(outputDirectory, 'images', output))).digest('hex'), bytes: info.size, width: info.width, height: info.height });
}
const used = new Set();
const blocks = [];
const markdown = nodes => nodes.map(node => {
  const raw = source.slice(node.position.start.offset, node.position.end.offset);
  return node.type === 'heading' ? raw.replace(/^#{1,6}/, '###') : raw;
}).join('\n\n');
for (let index = 0; index < sections.length; index++) {
  const section = sections[index];
  const title = cleanTitle(section.title);
  const asset = aliases[title] || title;
  const matches = [asset, `${asset} (2)`].filter(key => images.has(key));
  if (index === 0) { blocks.push({ id: 'roof-introduction', type: 'text', markdown: markdown(section.nodes) }); continue; }
  // Place each illustration after the opening paragraph, before the detailed explanation.
  const introEnd = section.nodes[0]?.type === 'paragraph' ? 1 : 0;
  blocks.push({ id: `roof-${index}-intro`, type: 'text', markdown: `## ${section.title}\n\n${markdown(section.nodes.slice(0, introEnd))}`.trim() });
  for (let imageIndex = 0; imageIndex < matches.length; imageIndex++) {
    const key = matches[imageIndex]; used.add(key);
    blocks.push({ id: `roof-${index}-image-${imageIndex + 1}`, type: 'image', image: images.get(key) });
  }
  const details = markdown(section.nodes.slice(introEnd));
  if (details) blocks.push({ id: `roof-${index}-details`, type: 'text', markdown: details });
}
const unused = [...images.keys()].filter(key => !used.has(key));
if (unused.length) throw new Error(`Unmatched illustrations: ${unused.join(', ')}`);
const article = {
  slug: 'remont-na-pokrivi', title: sections[0].title,
  excerpt: 'Ремонт на скатен и плосък покрив: диагностика на течове и конденз, конструкция, изолации, вентилация, обшивки и отводняване. Етапи и проверки с 41 илюстрации.',
  status: 'published', contentType: 'REPAIR_GUIDE', rubricId: 1, repairCategoryId: 12,
  tags: ['Покриви', 'Покривни изолации', 'Скатен покрив', 'Плосък покрив', 'Течове', 'Хидроизолация'],
  keywords: ['ремонт на покрив', 'ремонт на скатен покрив', 'хидроизолация на плосък покрив', 'теч от покрив', 'топлоизолация на покрив'],
  blocks, heroImage: images.get('Какъв проблем решава ремонтът на покрива'),
  seoTitle: 'Ремонт на покрив: етапи, изолации и проверки | Bricky',
  seoDescription: 'Пълно ръководство за ремонт на скатен и плосък покрив: течове, конструкция, топлоизолация, хидроизолация и отводняване. С 41 илюстрации.',
  author: 'Екипът на Bricky', calculatorCategory: 'roof_waterproofing', relatedArticles: [], featured: false,
};
articleInput(article);
const originalText = tree.children.slice(1).filter(node => node.type !== 'thematicBreak').map(node => toString(node)).join('');
const publishedText = blocks.filter(block => block.type === 'text').map(block => toString(unified().use(remarkParse).parse(block.markdown))).join('');
if (originalText !== publishedText) throw new Error('Article text changed during block assembly');
await writeFile(join(outputDirectory, 'article.json'), JSON.stringify(article, null, 2));
await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2));
// Review all supplied drawings without altering their source files.
for (let start = 0; start < files.length; start += 12) {
  const group = files.slice(start, start + 12);
  const thumbs = [];
  for (let i = 0; i < group.length; i++) thumbs.push({ input: await sharp(join(sourceDirectory, group[i])).resize(320, 320, { fit: 'contain', background: '#eeeeee' }).png().toBuffer(), left: i % 4 * 320, top: Math.floor(i / 4) * 320 });
  await sharp({ create: { width: 1280, height: Math.ceil(group.length / 4) * 320, channels: 3, background: '#eeeeee' } }).composite(thumbs).png().toFile(join(outputDirectory, `review-${start / 12 + 1}.png`));
}
console.log(JSON.stringify({ sections: sections.length - 1, images: images.size, blocks: blocks.length, payloadBytes: Buffer.byteLength(JSON.stringify(article)), imageBytes: manifest.reduce((sum, item) => sum + item.bytes, 0), order: files }));

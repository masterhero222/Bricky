import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const sharp = require('sharp');
const source = process.argv[2];
if (!source) throw new Error('Provide the owner-supplied homepage image');
const output = new URL('../public/assets/home/', import.meta.url);
await mkdir(output, { recursive: true });
for (const width of [960, 1536]) {
  const info = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 90 }).toFile(fileURLToPath(new URL(`bricky-home-v2-${width}.webp`, output)));
  console.log(JSON.stringify({ width: info.width, height: info.height, bytes: info.size }));
}

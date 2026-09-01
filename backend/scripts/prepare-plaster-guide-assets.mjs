import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import article, { uploads } from '../content/knowledge/shpaklovki-i-mazilki.mjs';

const [sourceDirectory, outputDirectory] = process.argv.slice(2);
if (!sourceDirectory || !outputDirectory) throw new Error('Usage: node scripts/prepare-plaster-guide-assets.mjs <source-directory> <output-directory>');

const sourceNames = {
  cover: 'Корица.png', goal: '1.png', weakPoints: 'Слаби места на стената.png',
  roomProtection: 'Защита на стаята 1.png', roomProtectionDetails: 'Защита на стаята 2.png',
  removal: 'Премахване на нестабилните слоеве.png', moisture: 'Влага, соли и проблемни основи.png',
  cracks: 'Пукнатини и армировка.png', primer: 'Грундиране.png', plane: 'Определяне на равнината.png',
  corners: 'Ъгли.png', plaster: 'мазилки.png', application: 'нанасяне.png', leveling: 'Изтегляне.png',
  timing: 'Правилен момент.png', drying: 'Съхнене.png', skimPreparation: 'подготовка за шпакловка.png',
  skimCoat: 'какво представлява шпакловката.png', sanding: 'шлайфане.png', inspection: 'проверка.png',
  dustRemoval: 'обезпрашаване.png', finalInspection: 'финална проверка.png',
  finalResult: 'Краен резултат.png', finalOptions: 'Креан резултат 2.png',
};

await mkdir(join(outputDirectory, 'images'), { recursive: true });
for (const [key, uuid] of Object.entries(uploads)) {
  const source = join(sourceDirectory, sourceNames[key]);
  await sharp(source, { limitInputPixels: 40000000 })
    .rotate()
    .resize({ width: 2400, height: 6000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(join(outputDirectory, 'images', `${uuid}.webp`));
}

await writeFile(join(outputDirectory, 'article.json'), `${JSON.stringify(article, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ images: Object.keys(uploads).length, blocks: article.blocks.length, bytes: JSON.stringify(article.blocks).length }));

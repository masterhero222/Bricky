import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

const MAX_OUTPUT_BYTES = 1024 * 1024;

export async function processUploadedImage(buffer: Buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new BadRequestException('Empty image');

  let photo: Buffer | null = null;
  for (const quality of [82, 78, 75]) {
    photo = await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (photo.length <= MAX_OUTPUT_BYTES) break;
  }
  if (!photo || photo.length > MAX_OUTPUT_BYTES) {
    throw new BadRequestException('Image remains larger than 1 MB after optimization');
  }

  const thumbnail = await sharp(photo)
    .resize({ width: 480, height: 360, fit: 'cover', position: 'attention', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  return { photo, thumbnail, mimeType: 'image/webp' };
}

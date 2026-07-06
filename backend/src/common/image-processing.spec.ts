import sharp from 'sharp';
import { processUploadedImage } from './image-processing';

describe('processUploadedImage', () => {
  it.each([10, 15, 20])('compresses a valid %i MB phone-sized upload below 1 MB', async (megabytes) => {
    const jpeg = await sharp({
      create: { width: 5000, height: 3500, channels: 3, background: { r: 88, g: 126, b: 164 } },
    }).jpeg({ quality: 98 }).toBuffer();
    const targetBytes = megabytes * 1024 * 1024;
    const source = Buffer.concat([jpeg, Buffer.alloc(Math.max(0, targetBytes - jpeg.length))]);

    const result = await processUploadedImage(source);
    const metadata = await sharp(result.photo).metadata();
    const thumbMetadata = await sharp(result.thumbnail).metadata();

    expect(source.length).toBe(targetBytes);
    expect(result.mimeType).toBe('image/webp');
    expect(result.photo.length).toBeLessThanOrEqual(1024 * 1024);
    expect(metadata.format).toBe('webp');
    expect(Math.max(metadata.width || 0, metadata.height || 0)).toBeLessThanOrEqual(1920);
    expect(thumbMetadata.format).toBe('webp');
    expect((thumbMetadata.width || 0)).toBeLessThanOrEqual(480);
  });

  it('applies EXIF orientation before resizing', async () => {
    const oriented = await sharp({
      create: { width: 120, height: 60, channels: 3, background: { r: 20, g: 180, b: 90 } },
    }).jpeg().withMetadata({ orientation: 6 }).toBuffer();

    const result = await processUploadedImage(oriented);
    const metadata = await sharp(result.photo).metadata();
    expect(metadata.width).toBe(60);
    expect(metadata.height).toBe(120);
  });
});

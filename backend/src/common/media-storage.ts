import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, normalize, sep } from 'path';
import { randomUUID } from 'crypto';
import { getUploadPath, getUploadsRoot } from './storage-paths';
import { processUploadedImage } from './image-processing';

export type StoredMedia = {
  url: string;
  thumbnailUrl: string | null;
  storageKey: string;
  thumbnailStorageKey: string | null;
  mimeType: 'image/webp';
  sizeBytes: number;
};

export async function storeUploadedImage(
  buffer: Buffer,
  directorySegments: string[],
  publicDirectory: string,
  filenamePrefix: string,
  options: { createThumbnail?: boolean } = {},
): Promise<StoredMedia> {
  const optimized = await processUploadedImage(buffer);
  const targetDir = getUploadPath(...directorySegments);
  await mkdir(targetDir, { recursive: true });
  const stem = `${filenamePrefix}_${randomUUID()}`;
  const filename = `${stem}.webp`;
  const createThumbnail = options.createThumbnail !== false;
  const thumbnailFilename = createThumbnail ? `${stem}_thumb.webp` : null;
  const absolutePath = join(targetDir, filename);
  const thumbnailPath = thumbnailFilename
    ? join(targetDir, thumbnailFilename)
    : null;

  try {
    await writeFile(absolutePath, optimized.photo);
    if (thumbnailPath) await writeFile(thumbnailPath, optimized.thumbnail);
  } catch (error) {
    await Promise.all([
      unlink(absolutePath).catch(() => undefined),
      thumbnailPath
        ? unlink(thumbnailPath).catch(() => undefined)
        : Promise.resolve(),
    ]);
    throw error;
  }

  const storageDirectory = directorySegments.join('/');
  return {
    url: `${publicDirectory}/${filename}`,
    thumbnailUrl: thumbnailFilename
      ? `${publicDirectory}/${thumbnailFilename}`
      : null,
    storageKey: `${storageDirectory}/${filename}`,
    thumbnailStorageKey: thumbnailFilename
      ? `${storageDirectory}/${thumbnailFilename}`
      : null,
    mimeType: optimized.mimeType,
    sizeBytes: optimized.photo.length,
  };
}

export async function deleteStoredMedia(...storageKeys: Array<string | null | undefined>) {
  const uploadsRoot = normalize(getUploadsRoot());
  await Promise.all(storageKeys.filter(Boolean).map(async (storageKey) => {
    const target = normalize(join(uploadsRoot, String(storageKey)));
    if (target === uploadsRoot || !target.startsWith(`${uploadsRoot}${sep}`)) return;
    await unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }));
}

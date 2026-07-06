import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, normalize, sep } from 'path';
import { randomUUID } from 'crypto';
import { getUploadPath, getUploadsRoot } from './storage-paths';
import { processUploadedImage } from './image-processing';

export type StoredMedia = {
  url: string;
  thumbnailUrl: string;
  storageKey: string;
  thumbnailStorageKey: string;
  mimeType: 'image/webp';
  sizeBytes: number;
};

export async function storeUploadedImage(
  buffer: Buffer,
  directorySegments: string[],
  publicDirectory: string,
  filenamePrefix: string,
): Promise<StoredMedia> {
  const optimized = await processUploadedImage(buffer);
  const targetDir = getUploadPath(...directorySegments);
  await mkdir(targetDir, { recursive: true });
  const stem = `${filenamePrefix}_${randomUUID()}`;
  const filename = `${stem}.webp`;
  const thumbnailFilename = `${stem}_thumb.webp`;
  const absolutePath = join(targetDir, filename);
  const thumbnailPath = join(targetDir, thumbnailFilename);

  try {
    await writeFile(absolutePath, optimized.photo);
    await writeFile(thumbnailPath, optimized.thumbnail);
  } catch (error) {
    await Promise.all([unlink(absolutePath).catch(() => undefined), unlink(thumbnailPath).catch(() => undefined)]);
    throw error;
  }

  const storageDirectory = directorySegments.join('/');
  return {
    url: `${publicDirectory}/${filename}`,
    thumbnailUrl: `${publicDirectory}/${thumbnailFilename}`,
    storageKey: `${storageDirectory}/${filename}`,
    thumbnailStorageKey: `${storageDirectory}/${thumbnailFilename}`,
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

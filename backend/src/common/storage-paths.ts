import { isAbsolute, resolve } from 'path';

export function getUploadsRoot(): string {
  const configured = String(process.env.UPLOADS_DIR || '').trim();
  if (configured) {
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }

  return resolve(__dirname, '..', '..', 'uploads');
}

export function getUploadPath(...segments: string[]): string {
  return resolve(getUploadsRoot(), ...segments);
}

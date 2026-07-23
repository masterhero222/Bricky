import { isAbsolute, join } from 'path';
import { getUploadPath, getUploadsRoot } from './storage-paths';

describe('storage paths', () => {
  const originalUploadsDir = process.env.UPLOADS_DIR;

  afterEach(() => {
    if (originalUploadsDir === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = originalUploadsDir;
  });

  it('uses a project-stable absolute uploads directory by default', () => {
    delete process.env.UPLOADS_DIR;

    const root = getUploadsRoot();

    expect(isAbsolute(root)).toBe(true);
    expect(root.replace(/\\/g, '/')).toMatch(/\/backend\/uploads$/);
    expect(getUploadPath('requests')).toBe(join(root, 'requests'));
  });

  it('honors an absolute deployment storage directory', () => {
    const configured = join(process.cwd(), 'persistent-media');
    process.env.UPLOADS_DIR = configured;

    expect(getUploadsRoot()).toBe(configured);
    expect(getUploadPath('workers', 'gallery')).toBe(join(configured, 'workers', 'gallery'));
  });
});

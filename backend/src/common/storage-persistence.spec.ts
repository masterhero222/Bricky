import { Module } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';

@Module({})
class StorageTestModule {}

describe('uploads persistence across application restart', () => {
  let uploadsRoot: string;
  let app: NestExpressApplication | undefined;

  async function startApp() {
    const moduleFixture = await Test.createTestingModule({ imports: [StorageTestModule] }).compile();
    const nextApp = moduleFixture.createNestApplication<NestExpressApplication>();
    nextApp.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });
    await nextApp.init();
    return nextApp;
  }

  beforeAll(async () => {
    uploadsRoot = await mkdtemp(join(tmpdir(), 'bricky-uploads-restart-'));
  });

  afterAll(async () => {
    await app?.close();
    await rm(uploadsRoot, { recursive: true, force: true });
  });

  it('serves the same stored file from a new application instance', async () => {
    const requestDir = join(uploadsRoot, 'requests');
    await mkdir(requestDir, { recursive: true });
    await writeFile(join(requestDir, 'restart-proof.txt'), 'bricky-persistent-media');

    app = await startApp();
    await request(app.getHttpServer()).get('/uploads/requests/restart-proof.txt').expect(200);

    await app.close();
    app = await startApp();

    const response = await request(app.getHttpServer())
      .get('/uploads/requests/restart-proof.txt')
      .expect(200);
    expect(response.text).toBe('bricky-persistent-media');
  });
});

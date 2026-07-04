import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { unlink } from 'fs/promises';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Request lifecycle (MySQL e2e)', () => {
  let app: NestExpressApplication;
  let clientToken: string;
  let workerToken: string;
  let otherWorkerToken: string;
  let workerUserId: number;
  let requestId: number;
  const storedKeys = new Set<string>();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = 'Sprint1-Test-Password';
  const clientEmail = `client-${suffix}@example.test`;
  const workerEmail = `worker-${suffix}@example.test`;
  const otherWorkerEmail = `worker-other-${suffix}@example.test`;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('E2E tests require NODE_ENV=test.');
    }
    if (!process.env.DB_NAME || !process.env.DB_NAME.includes('sprint1')) {
      throw new Error('E2E tests require an isolated Sprint 1 database.');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all(
      [...storedKeys].map((key) => unlink(join(process.cwd(), 'uploads', key)).catch(() => undefined)),
    );
  });

  it('registers and logs in a client and two workers', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ role: 'client', name: 'Sprint Client', email: clientEmail, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        role: 'worker',
        fullName: 'Sprint Worker',
        email: workerEmail,
        password,
        phone: '0888000201',
        city: 'Sofia',
        skills: ['vik'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        role: 'worker',
        fullName: 'Other Sprint Worker',
        email: otherWorkerEmail,
        password,
        phone: '0888000202',
        city: 'Sofia',
        skills: ['electro'],
      })
      .expect(201);

    const clientLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: clientEmail, password })
      .expect(201);
    clientToken = clientLogin.body.token;

    const workerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: workerEmail, password })
      .expect(201);
    workerToken = workerLogin.body.token;
    workerUserId = workerLogin.body.user.id;

    const otherWorkerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherWorkerEmail, password })
      .expect(201);
    otherWorkerToken = otherWorkerLogin.body.token;

    expect(clientToken).toBeTruthy();
    expect(workerToken).toBeTruthy();
    expect(otherWorkerToken).toBeTruthy();
    expect(workerUserId).toBeGreaterThan(0);
  });

  it('rejects request creation by a worker', async () => {
    await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        clientName: 'Not Client',
        email: workerEmail,
        phone: '0888000201',
        categoryKey: 'vik',
      })
      .expect(400);
  });

  it('creates a request with stable category, location, estimate, and before image', async () => {
    const response = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        clientName: 'Sprint Client',
        email: clientEmail,
        phone: '0888000101',
        address: 'Sofia, Sprint Test 11',
        categoryKey: 'vik',
        description: 'Integration test leak.',
        latitude: 42.6977,
        longitude: 23.3219,
        locationSource: 'manual',
        estimateMin: 60,
        estimateMax: 95,
        estimateCurrency: 'EUR',
      })
      .expect(201);

    requestId = response.body.id;
    expect(requestId).toBeGreaterThan(0);
    expect(response.body.categoryKey).toBe('vik');
    expect(response.body.estimateCurrency).toBe('EUR');
    expect(response.body.beforePhotos).toHaveLength(0);
  });

  it('uploads, serves, and deletes real before images for the owning client', async () => {
    const uploaded = await request(app.getHttpServer())
      .post(`/requests/${requestId}/images/before`)
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('images', png, { filename: 'before.png', contentType: 'image/png' })
      .attach('images', png, { filename: 'delete-me.png', contentType: 'image/png' })
      .expect(201);

    expect(uploaded.body.beforePhotos).toHaveLength(2);
    for (const photo of uploaded.body.beforePhotos) {
      expect(photo.storageKey).toMatch(/^requests\/request_/);
      expect(photo.mimeType).toBe('image/png');
      expect(photo.sizeBytes).toBe(png.length);
      storedKeys.add(photo.storageKey);
      await request(app.getHttpServer()).get(photo.url).expect(200).expect('Content-Type', /image\/png/);
    }

    const deletedPhoto = uploaded.body.beforePhotos.find((photo: any) => photo.name === 'delete-me.png');
    await request(app.getHttpServer())
      .post(`/requests/${requestId}/images/${deletedPhoto.id}/delete`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(201)
      .expect({ ok: true, imageId: deletedPhoto.id });
    storedKeys.delete(deletedPhoto.storageKey);
    await request(app.getHttpServer()).get(deletedPhoto.url).expect(404);
  });

  it('enforces client request ownership and role-specific feeds', async () => {
    const clientRequests = await request(app.getHttpServer())
      .get('/requests/client')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(clientRequests.body.map((item: any) => item.id)).toContain(requestId);

    await request(app.getHttpServer())
      .get('/requests/client')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(400);

    const workerFeed = await request(app.getHttpServer())
      .get('/requests/worker')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);
    expect(workerFeed.body.map((item: any) => item.id)).toContain(requestId);

    const workerMap = await request(app.getHttpServer())
      .get('/requests/map')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);
    expect(workerMap.body.map((item: any) => item.id)).toContain(requestId);
  });

  it('applies idempotently and allows the owning client to assign', async () => {
    const firstApply = await request(app.getHttpServer())
      .post(`/requests/${requestId}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({})
      .expect(201);
    expect(firstApply.body.appliedWorkers).toEqual([workerUserId]);
    expect(typeof firstApply.body.appliedWorkers[0]).toBe('number');

    const secondApply = await request(app.getHttpServer())
      .post(`/requests/${requestId}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({})
      .expect(201);
    expect(secondApply.body.appliedWorkers).toEqual([workerUserId]);
    expect(typeof secondApply.body.appliedWorkers[0]).toBe('number');

    const assigned = await request(app.getHttpServer())
      .post(`/requests/${requestId}/assign`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ workerUserId })
      .expect(201);
    expect(assigned.body.assignedWorkerId).toBe(workerUserId);
  });

  it('rejects completion by another worker and completes for the assigned worker', async () => {
    await request(app.getHttpServer())
      .post(`/requests/${requestId}/images/after`)
      .set('Authorization', `Bearer ${otherWorkerToken}`)
      .attach('images', png, { filename: 'forbidden.png', contentType: 'image/png' })
      .expect(403);

    const uploaded = await request(app.getHttpServer())
      .post(`/requests/${requestId}/images/after`)
      .set('Authorization', `Bearer ${workerToken}`)
      .attach('images', png, { filename: 'after.png', contentType: 'image/png' })
      .expect(201);
    expect(uploaded.body.afterPhotos).toHaveLength(1);
    expect(uploaded.body.afterPhotos[0].mimeType).toBe('image/png');
    storedKeys.add(uploaded.body.afterPhotos[0].storageKey);
    await request(app.getHttpServer()).get(uploaded.body.afterPhotos[0].url).expect(200);

    await request(app.getHttpServer())
      .post(`/requests/${requestId}/complete`)
      .set('Authorization', `Bearer ${otherWorkerToken}`)
      .send({ afterPhotos: [] })
      .expect(403);

    const completed = await request(app.getHttpServer())
      .post(`/requests/${requestId}/complete`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ afterPhotos: [] })
      .expect(201);

    expect(completed.body.completedByWorkerId).toBe(workerUserId);
    expect(completed.body.durationDays).toBeGreaterThanOrEqual(1);
    expect(completed.body.afterPhotos).toHaveLength(1);

    const history = await request(app.getHttpServer())
      .get('/requests/worker/completed')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);
    expect(history.body.map((item: any) => item.id)).toContain(requestId);
  });

  it('allows one review by the owning client after completion', async () => {
    const review = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ requestId, rating: 5, comment: 'Sprint 1 integration review' })
      .expect(201);
    expect(review.body.workerUserId).toBe(workerUserId);
    expect(review.body.rating).toBe(5);

    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ requestId, rating: 4 })
      .expect(400);

    const publicRating = await request(app.getHttpServer())
      .get(`/reviews/worker/${workerUserId}`)
      .expect(200);
    expect(publicRating.body.total).toBe(1);
    expect(publicRating.body.average).toBe(5);
  });
});

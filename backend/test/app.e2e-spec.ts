import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { unlink } from 'fs/promises';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getUploadPath, getUploadsRoot } from './../src/common/storage-paths';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

describe('Request lifecycle (MySQL e2e)', () => {
  let app: NestExpressApplication;
  let clientToken: string;
  let workerToken: string;
  let otherWorkerToken: string;
  let adminToken: string;
  let workerUserId: number;
  let otherWorkerUserId: number;
  let requestId: number;
  let persistentBeforePhotoUrl: string;
  let persistentAfterPhotoUrl: string;
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
  const adminEmail = `admin-${suffix}@example.test`;

  async function createApp() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const nextApp = moduleFixture.createNestApplication<NestExpressApplication>();
    nextApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    nextApp.useStaticAssets(getUploadsRoot(), { prefix: '/uploads/' });
    await nextApp.init();
    return nextApp;
  }

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('E2E tests require NODE_ENV=test.');
    }
    if (!process.env.DB_NAME || !process.env.DB_NAME.includes('sprint1')) {
      throw new Error('E2E tests require an isolated Sprint 1 database.');
    }

    app = await createApp();
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all(
      [...storedKeys].map((key) => unlink(getUploadPath(key)).catch(() => undefined)),
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

    const dataSource = app.get(DataSource);
    await dataSource.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Sprint Admin', adminEmail, await bcrypt.hash(password, 10), 'admin'],
    );
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(201);
    adminToken = adminLogin.body.token;

    const hiddenWorkers = await request(app.getHttpServer()).get('/workers').expect(200);
    expect(hiddenWorkers.body).toHaveLength(0);
    const pendingWorkers = await request(app.getHttpServer())
      .get('/admin/workers?status=pending_review')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(pendingWorkers.body).toHaveLength(2);
    await request(app.getHttpServer())
      .get(`/admin/workers/${pendingWorkers.body[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    for (const worker of pendingWorkers.body) {
      await request(app.getHttpServer())
        .post(`/admin/workers/${worker.id}/profile/approved`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);
    }
    const publicWorkers = await request(app.getHttpServer()).get('/workers').expect(200);
    expect(publicWorkers.body).toHaveLength(2);

    const users = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(users.body.every((user: any) => !Object.prototype.hasOwnProperty.call(user, 'password'))).toBe(true);
    const otherWorker = users.body.find((user: any) => user.email === otherWorkerEmail);
    otherWorkerUserId = otherWorker.id;
    await request(app.getHttpServer())
      .post(`/admin/users/${otherWorker.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'E2E moderation check' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherWorkerEmail, password })
      .expect(400);
    await request(app.getHttpServer())
      .get('/workers/me')
      .set('Authorization', `Bearer ${otherWorkerToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/admin/users/${otherWorker.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'E2E moderation check complete' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/workers/me')
      .set('Authorization', `Bearer ${otherWorkerToken}`)
      .expect(200);

    expect(clientToken).toBeTruthy();
    expect(workerToken).toBeTruthy();
    expect(otherWorkerToken).toBeTruthy();
    expect(adminToken).toBeTruthy();
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
    persistentBeforePhotoUrl = uploaded.body.beforePhotos.find((photo: any) => photo.name === 'before.png').url;

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

    const hiddenFeed = await request(app.getHttpServer())
      .get('/requests/worker')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);
    expect(hiddenFeed.body.map((item: any) => item.id)).not.toContain(requestId);

    await request(app.getHttpServer())
      .get('/admin/requests')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/admin/requests/${requestId}/rejected`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Please clarify the repair description' })
      .expect(201);
    const rejectedOwnerView = await request(app.getHttpServer())
      .get('/requests/client')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    const rejectedRequest = rejectedOwnerView.body.find((item: any) => item.id === requestId);
    expect(rejectedRequest.moderationStatus).toBe('rejected');
    expect(rejectedRequest.moderationReason).toContain('clarify');
    await request(app.getHttpServer())
      .put(`/requests/${requestId}/resubmit`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ description: 'Clarified integration test leak.' })
      .expect(200)
      .expect((response) => expect(response.body.moderationStatus).toBe('pending_review'));

    await request(app.getHttpServer())
      .post(`/admin/requests/${requestId}/approved`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .get(`/admin/requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const pendingMedia = await request(app.getHttpServer())
      .get('/admin/media?status=pending_review')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const beforeImage = pendingMedia.body.find((item: any) => item.requestId === requestId);
    expect(beforeImage).toBeTruthy();
    await request(app.getHttpServer())
      .get(`/admin/media/request/${beforeImage.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/admin/media/${beforeImage.id}/approved`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    const workerFeed = await request(app.getHttpServer())
      .get('/requests/worker')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);
    expect(workerFeed.body.map((item: any) => item.id)).toContain(requestId);
    expect(workerFeed.body.find((item: any) => item.id === requestId).beforePhotos).toHaveLength(1);

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
    persistentAfterPhotoUrl = uploaded.body.afterPhotos[0].url;
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

    const pendingMedia = await request(app.getHttpServer())
      .get('/admin/media?status=pending_review')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const afterImage = pendingMedia.body.find((item: any) => item.requestId === requestId && item.kind === 'after');
    expect(afterImage).toBeTruthy();
    await request(app.getHttpServer())
      .post(`/admin/media/${afterImage.id}/approved`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    const history = await request(app.getHttpServer())
      .get('/requests/worker/completed')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);
    expect(history.body.map((item: any) => item.id)).toContain(requestId);
  });

  it('serves uploaded media and hydrated worker history after an application restart', async () => {
    await app.close();
    app = await createApp();

    await request(app.getHttpServer()).get(persistentBeforePhotoUrl).expect(200).expect('Content-Type', /image\/png/);
    await request(app.getHttpServer()).get(persistentAfterPhotoUrl).expect(200).expect('Content-Type', /image\/png/);

    const history = await request(app.getHttpServer())
      .get('/workers/me/history')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);
    const completedRequest = history.body.find((item: any) => Number(item.id) === requestId);
    expect(completedRequest.beforePhotos).toHaveLength(1);
    expect(completedRequest.afterPhotos).toHaveLength(1);
    expect(completedRequest.beforePhotos[0].url).toBe(persistentBeforePhotoUrl);
    expect(completedRequest.afterPhotos[0].url).toBe(persistentAfterPhotoUrl);
  });

  it('allows an admin to correct and delete a spam request with an audit trail', async () => {
    const created = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        clientName: 'Spam Client',
        email: clientEmail,
        phone: '0888000101',
        address: 'Wrong address',
        categoryKey: 'vik',
        description: 'Spam request',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/admin/requests/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ address: 'Corrected address', reason: 'Minor correction requested by support' })
      .expect(200)
      .expect((response) => expect(response.body.address).toBe('Corrected address'));

    await request(app.getHttpServer())
      .delete(`/admin/requests/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Confirmed spam' })
      .expect(200)
      .expect({ ok: true, id: created.body.id });

    await request(app.getHttpServer())
      .get(`/admin/requests/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('allows one review by the owning client after completion', async () => {
    const review = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ requestId, rating: 5, comment: 'Sprint 1 integration review' })
      .expect(201);
    expect(review.body.workerUserId).toBe(workerUserId);
    expect(review.body.rating).toBe(5);

    const hiddenRating = await request(app.getHttpServer())
      .get(`/reviews/worker/${workerUserId}`)
      .expect(200);
    expect(hiddenRating.body.total).toBe(0);

    const pendingReviews = await request(app.getHttpServer())
      .get('/admin/reviews?status=pending_review')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const pendingReview = pendingReviews.body.find((item: any) => item.id === review.body.id);
    expect(pendingReview).toBeTruthy();
    await request(app.getHttpServer())
      .get(`/admin/reviews/${review.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/admin/reviews/${review.body.id}/approved`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

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

    const audit = await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(audit.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'request', entityId: requestId, action: 'approved' }),
      expect.objectContaining({ entityType: 'review', entityId: review.body.id, action: 'approved' }),
      expect.objectContaining({ entityType: 'user', entityId: otherWorkerUserId, action: 'suspend' }),
      expect.objectContaining({ entityType: 'request', action: 'edited' }),
      expect.objectContaining({ entityType: 'request', action: 'deleted' }),
    ]));
  });
});

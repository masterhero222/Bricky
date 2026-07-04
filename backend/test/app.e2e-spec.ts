import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Request lifecycle (MySQL e2e)', () => {
  let app: INestApplication<App>;
  let clientToken: string;
  let workerToken: string;
  let otherWorkerToken: string;
  let workerUserId: number;
  let requestId: number;

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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
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
        photos: [{ name: 'before.jpg', url: '/uploads/test/before.jpg' }],
      })
      .expect(201);

    requestId = response.body.id;
    expect(requestId).toBeGreaterThan(0);
    expect(response.body.categoryKey).toBe('vik');
    expect(response.body.estimateCurrency).toBe('EUR');
    expect(response.body.beforePhotos).toHaveLength(1);
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
      .post(`/requests/${requestId}/complete`)
      .set('Authorization', `Bearer ${otherWorkerToken}`)
      .send({ afterPhotos: [] })
      .expect(403);

    const completed = await request(app.getHttpServer())
      .post(`/requests/${requestId}/complete`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ afterPhotos: [{ name: 'after.jpg', url: '/uploads/test/after.jpg' }] })
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

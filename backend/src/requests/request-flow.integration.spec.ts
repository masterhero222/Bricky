import { RepairRequestEntity } from './entities/repair-request.entity';
import { RequestLifecycleService } from './request-lifecycle.service';
import { RequestsService } from './requests.service';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { ReviewsService } from '../reviews/reviews.service';

describe('Sprint 3 canonical request flow', () => {
  it('runs client, admin and worker through the complete request lifecycle', async () => {
    const requests: any[] = [];
    const applications: any[] = [];
    const events: any[] = [];
    const mediaRows: any[] = [];
    const reviews: any[] = [];
    let nextRequestId = 1;
    let nextApplicationId = 1;
    let nextMediaId = 1;
    let nextReviewId = 1;

    const persistRequest = (value: any) => {
      if (!value.id) {
        value.id = nextRequestId++;
        value.createdAt = new Date('2026-07-19T08:00:00.000Z');
        value.updatedAt = value.createdAt;
        value.client = { id: value.clientUserId, name: 'Client', email: 'client@example.com' };
        requests.push(value);
      }
      value.updatedAt = new Date();
      return value;
    };

    const persistApplication = (value: any) => {
      if (!value.id) {
        value.id = nextApplicationId++;
        value.created_at = new Date();
        value.updated_at = value.created_at;
        applications.push(value);
      }
      return value;
    };

    const persistEvent = (value: any) => {
      if (!events.includes(value)) events.push(value);
      return value;
    };

    const transactionManager = {
      save: jest.fn(async (value: any) => {
        if (Array.isArray(value)) {
          return Promise.all(value.map((item) => transactionManager.save(item)));
        }
        if (value?.eventType) return persistEvent(value);
        if (value?.workerUserId && value?.requestId && !value?.categoryKey) {
          return persistApplication(value);
        }
        return persistRequest(value);
      }),
    };

    const repairRequestsRepo = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => persistRequest(value)),
      findOne: jest.fn(async ({ where }: any) =>
        requests.find((request) => Number(request.id) === Number(where.id)) || null,
      ),
      find: jest.fn(async () => requests),
      manager: {
        transaction: jest.fn(async (work) => work(transactionManager)),
      },
    };
    const applicationsRepo = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => persistApplication(value)),
      findOne: jest.fn(async ({ where }: any) =>
        applications.find(
          (application) =>
            Number(application.requestId) === Number(where.requestId) &&
            (where.workerUserId == null ||
              Number(application.workerUserId) === Number(where.workerUserId)),
        ) || null,
      ),
      find: jest.fn(async ({ where }: any) =>
        applications.filter(
          (application) => Number(application.requestId) === Number(where.requestId),
        ),
      ),
    };
    const pricingSnapshotsRepo = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => ({ id: 500, ...value })),
    };
    const eventsRepo = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => persistEvent(value)),
    };
    const usersRepo = {
      findOne: jest.fn(async ({ where }: any) =>
        Number(where.id) === 201
          ? { id: 201, role: 'worker', status: 'active' }
          : { id: Number(where.id), role: 'client', status: 'active' },
      ),
    };
    const workerProfilesRepo = {
      findOne: jest.fn(async ({ where }: any) =>
        Number(where.userId) === 201
          ? {
              userId: 201,
              approvalStatus: 'approved',
              visibilityStatus: 'public',
            }
          : null,
      ),
    };
    const media = {
      createAsset: jest.fn(async (value) => {
        const row = {
          id: nextMediaId++,
          createdAt: new Date(),
          ...value,
        };
        mediaRows.push(row);
        return row;
      }),
      findByRequest: jest.fn(async (requestId) =>
        mediaRows.filter((row) => Number(row.requestId) === Number(requestId)),
      ),
      setRequestMediaModeration: jest.fn(async (requestId, kind, moderationStatus) => {
        mediaRows
          .filter(
            (row) =>
              Number(row.requestId) === Number(requestId) && row.kind === kind,
          )
          .forEach((row) => {
            row.moderationStatus = moderationStatus;
          });
        return mediaRows;
      }),
    };
    const lifecycle = new RequestLifecycleService();
    const requestService = new RequestsService(
      repairRequestsRepo as any,
      applicationsRepo as any,
      pricingSnapshotsRepo as any,
      eventsRepo as any,
      usersRepo as any,
      workerProfilesRepo as any,
      {} as any,
      {} as any,
      media as any,
      lifecycle,
      {
        processCompletedRequest: jest.fn().mockResolvedValue(null),
      } as any,
    );

    const reviewManager = {
      findOne: jest.fn(async (entity: any, options: any) => {
        if (entity === RepairRequestEntity) {
          return requests.find(
            (request) => Number(request.id) === Number(options.where.id),
          ) || null;
        }
        if (entity === ReviewEntity) {
          return reviews.find(
            (review) =>
              Number(review.requestId) === Number(options.where.requestId) &&
              Number(review.clientUserId) === Number(options.where.clientUserId),
          ) || null;
        }
        return null;
      }),
      create: jest.fn((_entity, value) => ({ ...value })),
      save: jest.fn(async (value) => {
        if (Object.prototype.hasOwnProperty.call(value, 'rating')) {
          value.id = nextReviewId++;
          reviews.push(value);
        } else if (value?.eventType) {
          persistEvent(value);
        } else {
          persistRequest(value);
        }
        return value;
      }),
    };
    const reviewsRepo = {
      manager: {
        transaction: jest.fn(async (work) => work(reviewManager)),
      },
      find: jest.fn(async () => reviews),
    };
    const reviewService = new ReviewsService(
      reviewsRepo as any,
      lifecycle,
    );

    const created = await requestService.create(
      {
        categoryKey: 'painting',
        description: 'Paint one room',
        address: 'Sofia, exact private address',
        photos: [{ url: '/uploads/requests/1/before/before.jpg' }],
      } as any,
      101,
    );
    expect(created.statusKey).toBe('pending_admin');
    expect(mediaRows[0].moderationStatus).toBe('pending');

    await requestService.adminSetStatus(created.id, 'published', 900, 'approved');
    expect(requests[0].status).toBe('published');
    expect(mediaRows[0].moderationStatus).toBe('approved');

    await requestService.applyToRequest(created.id, 201);
    expect(requests[0].status).toBe('applied');
    expect(applications).toEqual([
      expect.objectContaining({ workerUserId: 201, status: 'applied' }),
    ]);

    await requestService.assignWorker(created.id, 101, 201);
    expect(requests[0].status).toBe('worker_selected');
    expect(applications[0].status).toBe('assigned');

    await requestService.workerConfirm(created.id, 201);
    await requestService.markWorkerOnSite(created.id, 201);
    await requestService.markInspected(created.id, 201);
    await requestService.startWork(created.id, 201);
    await requestService.finishWork(created.id, 201, [
      { url: '/uploads/requests/1/after/after.jpg' },
    ]);
    expect(requests[0].status).toBe('work_finished');
    expect(
      mediaRows.find((row) => row.kind === 'request_after')?.moderationStatus,
    ).toBe('pending');

    await requestService.readyForClientConfirmation(created.id, 201);
    await requestService.clientConfirmWork(created.id, 101);
    expect(requests[0].status).toBe('client_confirmed');
    expect(requests[0].archivedAt).toBeInstanceOf(Date);

    await reviewService.createReview(
      { requestId: created.id, rating: 5, comment: 'Great work' },
      101,
    );
    expect(requests[0].status).toBe('reviewed');
    expect(reviews).toEqual([
      expect.objectContaining({
        requestId: created.id,
        workerUserId: 201,
        clientUserId: 101,
        rating: 5,
      }),
    ]);

    const closed = await requestService.completeRequest(created.id, 201);
    expect(closed.statusKey).toBe('completed');
    expect(requests[0]).toEqual(
      expect.objectContaining({
        status: 'completed',
        archiveReason: 'closed_by_worker',
        archiveSource: 'worker',
        archivedByUserId: 201,
      }),
    );
    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        'request.created',
        'admin.status_changed',
        'application.created',
        'request.assigned',
        'worker.confirmed',
        'worker.on_site',
        'worker.inspected',
        'worker.started_work',
        'worker.finished_work',
        'worker.ready_for_client_confirmation',
        'client.confirmed_work',
        'request.reviewed',
        'request.closed_by_worker',
      ]),
    );
  });
});

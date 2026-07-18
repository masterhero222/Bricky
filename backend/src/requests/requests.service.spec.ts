import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RequestsService } from './requests.service';

function repo(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    create: jest.fn((value) => value),
    update: jest.fn(),
    ...overrides,
  };
}

describe('RequestsService v2 data core', () => {
  function serviceWith(overrides: Record<string, any> = {}) {
    return new RequestsService(
      (overrides.legacyRepo || repo()) as any,
      (overrides.repairRequestsRepo || repo()) as any,
      (overrides.applicationsRepo || repo()) as any,
      (overrides.pricingSnapshotsRepo || repo()) as any,
      (overrides.eventsRepo || repo({ save: jest.fn().mockResolvedValue({}) })) as any,
      (overrides.usersRepo || repo()) as any,
      (overrides.workerProfilesRepo || repo()) as any,
      {} as any,
      {} as any,
      (overrides.media || {
        createAsset: jest.fn(),
        findByRequest: jest.fn().mockResolvedValue([]),
        setRequestMediaModeration: jest.fn().mockResolvedValue([]),
      }) as any,
    );
  }

  it('creates new requests as pending admin approval', async () => {
    const savedRequests: any[] = [];
    const repairRequestsRepo = repo({
      save: jest.fn(async (request) => {
        const saved = { id: request.id || 1, createdAt: new Date(), updatedAt: new Date(), ...request };
        savedRequests.push(saved);
        return saved;
      }),
    });
    const pricingSnapshotsRepo = repo({
      save: jest.fn(async (snapshot) => ({ id: 501, ...snapshot })),
    });
    const media = {
      createAsset: jest.fn().mockResolvedValue({}),
      findByRequest: jest.fn().mockResolvedValue([]),
      setRequestMediaModeration: jest.fn().mockResolvedValue([]),
    };

    const service = serviceWith({ repairRequestsRepo, pricingSnapshotsRepo, media });
    const created = await service.create(
      {
        category: 'ВиК',
        description: 'Теч под мивката',
        address: 'София',
        photos: [{ url: '/uploads/request-before.jpg' }],
      } as any,
      101,
    );

    expect(savedRequests[0].status).toBe('pending_admin');
    expect(created.statusKey).toBe('pending_admin');
    expect(media.createAsset).toHaveBeenCalledWith(expect.objectContaining({ kind: 'request_before', moderationStatus: 'pending' }));
  });

  it('rejects applications from suspended workers', async () => {
    const usersRepo = repo({
      findOne: jest.fn().mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'suspended',
        visibilityStatus: 'hidden',
      }),
    });

    const service = serviceWith({ usersRepo, workerProfilesRepo });

    await expect(service.applyToRequest(1, 201)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks worker applications before admin approval', async () => {
    const usersRepo = repo({
      findOne: jest.fn().mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'visible',
      }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        status: 'pending_admin',
        assignedWorkerUserId: null,
      }),
    });

    const service = serviceWith({ usersRepo, workerProfilesRepo, repairRequestsRepo });

    await expect(service.applyToRequest(1, 201)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves request photos when admin publishes a request', async () => {
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        status: 'pending_admin',
        completedAt: null,
      }),
      save: jest.fn(async (request) => request),
    });
    const media = {
      createAsset: jest.fn(),
      findByRequest: jest.fn().mockResolvedValue([]),
      setRequestMediaModeration: jest.fn().mockResolvedValue([]),
    };

    const service = serviceWith({ repairRequestsRepo, media });

    const updated = await service.adminSetStatus(1, 'published', 1, 'ok');

    expect(updated.statusKey).toBe('published');
    expect(media.setRequestMediaModeration).toHaveBeenCalledWith(1, 'request_before', 'approved');
  });

  it('archives a request when the client confirms completed work', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      assignedWorkerUserId: 201,
      status: 'ready_for_client_confirmation',
      createdAt: new Date('2026-07-18T08:00:00.000Z'),
      completedAt: null,
      clientConfirmedAt: null,
      archivedAt: null,
      archiveReason: null,
      archiveSource: null,
      archivedByUserId: null,
      client: { name: 'Client', email: 'client@bricky.dev' },
    };
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
      save: jest.fn(async (value) => value),
    });
    const service = serviceWith({ repairRequestsRepo });

    const updated = await service.clientConfirmWork(1, 101);

    expect(updated.statusKey).toBe('completed');
    expect(updated.isArchived).toBe(true);
    expect(request.clientConfirmedAt).toBeInstanceOf(Date);
    expect(request.completedAt).toBeInstanceOf(Date);
    expect(request.archivedAt).toBeInstanceOf(Date);
    expect(request.archiveReason).toBe('completed');
    expect(request.archiveSource).toBe('system');
    expect(request.archivedByUserId).toBe(101);
  });

  it('keeps archived completed requests out of the worker active feed', async () => {
    const usersRepo = repo({
      findOne: jest.fn().mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      }),
    });
    const repairRequestsRepo = repo({
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          status: 'published',
          assignedWorkerUserId: null,
          archivedAt: null,
          createdAt: new Date(),
          client: {},
        },
        {
          id: 2,
          status: 'completed',
          assignedWorkerUserId: 201,
          archivedAt: new Date(),
          createdAt: new Date(),
          client: {},
        },
      ]),
    });
    const service = serviceWith({ usersRepo, workerProfilesRepo, repairRequestsRepo });

    const feed = await service.getForWorkersFeed(201);

    expect(feed.map((request) => request.id)).toEqual([1]);
  });
});

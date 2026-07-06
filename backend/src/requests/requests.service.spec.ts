import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestLifecycleService } from './request-lifecycle.service';

describe('RequestsService', () => {
  let service: RequestsService;
  let requestsRepo: any;
  let applicationsRepo: any;
  let imagesRepo: any;
  let usersRepo: any;
  let workersRepo: any;
  let queryBuilder: any;

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    requestsRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: value.id ?? 7, ...value })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    applicationsRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: value.id ?? 1, ...value })),
      findOne: jest.fn().mockResolvedValue(null),
    };

    imagesRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn().mockResolvedValue(0),
    };

    usersRepo = {
      findOne: jest.fn().mockImplementation(({ where }: any) => Promise.resolve({
        id: where.id,
        role: where.id === 101 || where.id === 102 ? 'client' : 'worker',
        accountStatus: 'active',
      })),
    };
    workersRepo = {
      findOne: jest.fn().mockImplementation(({ where }: any) => Promise.resolve({
        id: 1, userId: where.userId, moderationStatus: 'approved',
      })),
    };

    service = new RequestsService(
      requestsRepo,
      applicationsRepo,
      imagesRepo,
      usersRepo,
      workersRepo,
      { sendRequestConfirmation: jest.fn() } as any,
      { create: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      new RequestLifecycleService(),
    );
  });

  it('rejects request creation without an authenticated client id', async () => {
    await expect(service.create({} as any, 0)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a normalized request and persists before photos', async () => {
    const dto = {
      clientName: 'Client One',
      email: 'client@example.com',
      phone: '0888000001',
      address: 'Sofia, Test 1',
      categoryKey: 'vik',
      description: 'Теч под мивката.',
      latitude: 42.69,
      longitude: 23.32,
      locationSource: 'gps',
      estimateMin: 100,
      estimateMax: 180,
      estimateCurrency: 'EUR',
      photos: [{ name: 'before.jpg', url: '/uploads/before.jpg' }],
    };

    const result = await service.create(dto as any, 101);

    expect(requestsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        client: { id: 101 },
        categoryKey: 'vik',
        locationSource: 'gps',
        estimateMin: '100',
        estimateMax: '180',
        estimateCurrency: 'EUR',
      }),
    );
    expect(imagesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 7, uploaderUserId: 101, kind: 'before' }),
    );
    expect(result.id).toBe(7);
  });

  it('loads only requests owned by the current client', async () => {
    requestsRepo.find.mockResolvedValue([{ id: 3 }]);

    const result = await service.getByClientUserId(101);

    expect(requestsRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { client: { id: 101 } } }),
    );
    expect(result).toEqual([{ id: 3, appliedWorkers: [] }]);
  });

  it('allows only workers to use the request map service', async () => {
    const feed = jest.spyOn(service, 'getForWorkersFeed').mockResolvedValue([{ id: 4 }] as any);

    await expect(service.getMapRequests({ id: 201, role: 'worker' })).resolves.toEqual([{ id: 4 }]);
    await expect(service.getMapRequests({ id: 101, role: 'client' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(feed).toHaveBeenCalledTimes(1);
  });

  it('stores uploaded before images only for the owning client', async () => {
    requestsRepo.findOne.mockResolvedValue({ id: 9, client: { id: 101 }, appliedWorkers: [] });
    const photos = [
      {
        name: 'before.png',
        url: '/uploads/requests/before.png',
        storageKey: 'requests/before.png',
        mimeType: 'image/png',
        sizeBytes: 68,
      },
    ];

    await service.addUploadedImages(9, 101, 'client', 'before', photos);

    expect(imagesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 9,
        uploaderUserId: 101,
        kind: 'before',
        storageKey: 'requests/before.png',
        mimeType: 'image/png',
        sizeBytes: 68,
      }),
    );
    await expect(service.addUploadedImages(9, 102, 'client', 'before', photos)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('builds the worker feed query and hydrates its results', async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: 4 }]);

    const result = await service.getForWorkersFeed(201);

    expect(requestsRepo.createQueryBuilder).toHaveBeenCalledWith('r');
    expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 4, appliedWorkers: [] }]);
  });

  it('loads only approved completed requests for worker history', async () => {
    requestsRepo.find.mockResolvedValue([]);

    await service.getCompletedForWorker(201);

    expect(requestsRepo.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { assignedWorkerId: 201, statusKey: 'completed', moderationStatus: 'approved' },
    }));
  });

  it('keeps duplicate applications idempotent in legacy and normalized storage', async () => {
    const request = {
      id: 9,
      status: 'кандидатствана',
      assignedWorkerId: null,
      moderationStatus: 'approved',
      appliedWorkers: ['201'],
      client: { id: 101 },
    };
    const application = { id: 5, requestId: 9, workerUserId: 201, status: 'applied' };
    requestsRepo.findOne.mockResolvedValue(request);
    applicationsRepo.findOne.mockResolvedValue(application);

    const result = await service.applyToRequest(9, 201);

    expect(request.appliedWorkers).toEqual([201]);
    expect(result.appliedWorkers).toEqual([201]);
    expect(applicationsRepo.create).not.toHaveBeenCalled();
    expect(applicationsRepo.save).toHaveBeenCalledWith(application);
  });

  it('blocks a suspended worker before applying', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 201, role: 'worker', accountStatus: 'suspended' });

    await expect(service.applyToRequest(9, 201)).rejects.toBeInstanceOf(ForbiddenException);
    expect(requestsRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects assignment by a client who does not own the request', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9,
      client: { id: 101 },
      status: 'кандидатствана',
      moderationStatus: 'approved',
      appliedWorkers: [201],
    });

    await expect(service.assignWorker(9, 102, 201)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects assignment when the worker has not applied', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9,
      client: { id: 101 },
      status: 'нова',
      moderationStatus: 'approved',
      appliedWorkers: [],
    });

    await expect(service.assignWorker(9, 101, 201)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['pending_review', 'rejected', 'hidden'])('rejects assignment while moderation is %s', async (moderationStatus) => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9,
      client: { id: 101 },
      status: 'кандидатствана',
      moderationStatus,
      appliedWorkers: [201],
      assignedWorkerId: null,
    });

    await expect(service.assignWorker(9, 101, 201)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assigns an applicant selected by the owning client', async () => {
    const request = {
      id: 9,
      client: { id: 101 },
      status: 'кандидатствана',
      moderationStatus: 'approved',
      appliedWorkers: [201],
      assignedWorkerId: null,
    };
    requestsRepo.findOne.mockResolvedValue(request);

    const result = await service.assignWorker(9, 101, 201);

    expect(result.assignedWorkerId).toBe(201);
    expect(applicationsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 9, workerUserId: 201, status: 'assigned' }),
    );
  });

  it('rejects completion by a worker who is not assigned', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9,
      assignedWorkerId: 201,
      status: 'в процес',
      moderationStatus: 'approved',
      client: { id: 101 },
    });

    await expect(service.completeRequest(9, 202)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('completes only after the client has confirmed the work', async () => {
    const request = {
      id: 9,
      assignedWorkerId: 201,
      status: 'client_confirmed',
      moderationStatus: 'approved',
      client: { id: 101 },
      workStartedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };
    requestsRepo.findOne.mockResolvedValue(request);

    const result = await service.completeRequest(9, 201);

    expect(result.completedByWorkerId).toBe(201);
    expect(result.statusKey).toBe('completed');
    expect(result.durationDays).toBeGreaterThanOrEqual(1);
  });

  it('requires a persisted completion photo before marking work ready', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9, assignedWorkerId: 201, status: 'in_progress', moderationStatus: 'approved', client: { id: 101 },
    });
    await expect(service.markWorkReady(9, 201)).rejects.toBeInstanceOf(BadRequestException);
    imagesRepo.count.mockResolvedValue(1);
    await expect(service.markWorkReady(9, 201)).resolves.toEqual(expect.objectContaining({ statusKey: 'waiting_client_confirmation' }));
  });

  it('enforces the complete worker and client lifecycle in order', async () => {
    const request: any = {
      id: 9, assignedWorkerId: 201, status: 'assigned', moderationStatus: 'approved',
      client: { id: 101 }, created_at: new Date(),
    };
    requestsRepo.findOne.mockImplementation(async () => request);
    imagesRepo.count.mockResolvedValue(1);

    await service.markWorkerArrived(9, 201);
    expect(request.statusKey).toBe('worker_arrived');
    await service.startWork(9, 201);
    expect(request.statusKey).toBe('in_progress');
    await service.markWorkReady(9, 201);
    expect(request.statusKey).toBe('waiting_client_confirmation');
    await service.confirmWork(9, 101);
    expect(request.statusKey).toBe('client_confirmed');
    await service.completeRequest(9, 201);
    expect(request.statusKey).toBe('completed');
  });

  it('moves a client problem report to disputed and blocks completion', async () => {
    const request: any = {
      id: 9, assignedWorkerId: 201, status: 'waiting_client_confirmation',
      moderationStatus: 'approved', client: { id: 101 }, created_at: new Date(),
    };
    requestsRepo.findOne.mockImplementation(async () => request);
    await service.disputeWork(9, 101, 'Работата не е довършена');
    expect(request.statusKey).toBe('disputed');
    await expect(service.completeRequest(9, 201)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks completion when an assigned request is hidden', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9,
      assignedWorkerId: 201,
      status: 'в процес',
      moderationStatus: 'hidden',
      client: { id: 101 },
    });

    await expect(service.completeRequest(9, 201)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

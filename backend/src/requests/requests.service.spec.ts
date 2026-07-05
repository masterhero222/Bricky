import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  let service: RequestsService;
  let requestsRepo: any;
  let applicationsRepo: any;
  let imagesRepo: any;
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
    };

    service = new RequestsService(
      requestsRepo,
      applicationsRepo,
      imagesRepo,
      { sendRequestConfirmation: jest.fn() } as any,
      { notifyWorkerAssigned: jest.fn() } as any,
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

  it('rejects assignment by a client who does not own the request', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9,
      client: { id: 101 },
      status: 'кандидатствана',
      appliedWorkers: [201],
    });

    await expect(service.assignWorker(9, 102, 201)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects assignment when the worker has not applied', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 9,
      client: { id: 101 },
      status: 'нова',
      appliedWorkers: [],
    });

    await expect(service.assignWorker(9, 101, 201)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns an applicant selected by the owning client', async () => {
    const request = {
      id: 9,
      client: { id: 101 },
      status: 'кандидатствана',
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
      client: { id: 101 },
    });

    await expect(service.completeRequest(9, 202)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('completes an assigned request and stores after photos', async () => {
    const request = {
      id: 9,
      assignedWorkerId: 201,
      status: 'в процес',
      client: { id: 101 },
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };
    requestsRepo.findOne.mockResolvedValue(request);

    const result = await service.completeRequest(9, 201, [
      { name: 'after.jpg', url: '/uploads/after.jpg' },
    ]);

    expect(result.completedByWorkerId).toBe(201);
    expect(result.durationDays).toBeGreaterThanOrEqual(1);
    expect(imagesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 9, uploaderUserId: 201, kind: 'after' }),
    );
  });
});

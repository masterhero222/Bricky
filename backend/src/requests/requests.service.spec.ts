import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RequestLifecycleService } from './request-lifecycle.service';
import { RequestsService } from './requests.service';

function repo(overrides: Record<string, any> = {}) {
  const transactionManager = {
    save: jest.fn(async (value) => value),
  };
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    create: jest.fn((value) => value),
    update: jest.fn(),
    manager: {
      transaction: jest.fn(async (work) => work(transactionManager)),
    },
    ...overrides,
  };
}

describe('RequestsService v2 data core', () => {
  function serviceWith(overrides: Record<string, any> = {}) {
    return new RequestsService(
      (overrides.repairRequestsRepo || repo()) as any,
      (overrides.applicationsRepo || repo()) as any,
      (overrides.pricingSnapshotsRepo || repo()) as any,
      (overrides.eventsRepo ||
        repo({ save: jest.fn().mockResolvedValue({}) })) as any,
      (overrides.usersRepo || repo()) as any,
      (overrides.workerProfilesRepo || repo()) as any,
      (overrides.clientProfilesRepo || repo()) as any,
      (overrides.mail || {
        sendNewRequestNotification: jest.fn().mockResolvedValue(true),
      }) as any,
      (overrides.notifications || {
        create: jest.fn().mockResolvedValue({}),
      }) as any,
      (overrides.media || {
        createAsset: jest.fn(),
        findByRequest: jest.fn().mockResolvedValue([]),
        setRequestMediaModeration: jest.fn().mockResolvedValue([]),
      }) as any,
      new RequestLifecycleService(),
      (overrides.referrals || {
        processCompletedRequest: jest.fn().mockResolvedValue(null),
      }) as any,
      (overrides.geocoding || {
        geocode: jest
          .fn()
          .mockResolvedValue({ latitude: 42.6977, longitude: 23.3219 }),
      }) as any,
    );
  }

  it('creates new requests as pending admin approval', async () => {
    const savedRequests: any[] = [];
    const repairRequestsRepo = repo({
      save: jest.fn(async (request) => {
        const saved = {
          id: request.id || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...request,
        };
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

    const mail = {
      sendNewRequestNotification: jest.fn().mockResolvedValue(true),
    };
    const service = serviceWith({
      repairRequestsRepo,
      pricingSnapshotsRepo,
      media,
      mail,
    });
    const created = await service.create(
      {
        category: 'ВиК',
        categoryKey: 'vik',
        description: 'Теч под мивката',
        address: 'София',
        photos: [{ url: '/uploads/request-before.jpg' }],
      } as any,
      101,
    );

    expect(savedRequests[0].status).toBe('pending_admin');
    expect(created.statusKey).toBe('pending_admin');
    expect(created.lifecycleStatusKey).toBe('pending_review');
    expect(created.statusLabel).toBe('Чака одобрение');
    expect(created).not.toHaveProperty('status');
    expect(created.nextActor).toBe('admin');
    expect(created.allowedActions).toEqual([]);
    expect(created).not.toHaveProperty('assignedWorkerId');
    expect(created).not.toHaveProperty('completedByWorkerId');
    expect(media.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'request_before',
        moderationStatus: 'pending',
      }),
    );
    expect(mail.sendNewRequestNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 1,
        category: 'ВиК ремонти',
        address: 'София',
      }),
    );
  });

  it('hides pending and rejected media from the public worker request feed', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      categoryKey: 'vik',
      title: 'ВиК',
      status: 'published',
      assignedWorkerUserId: null,
      archivedAt: null,
      createdAt: new Date('2026-07-19T08:00:00.000Z'),
      updatedAt: new Date('2026-07-19T08:00:00.000Z'),
      client: {},
    };
    const repairRequestsRepo = repo({
      find: jest.fn().mockResolvedValue([request]),
    });
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      }),
    });
    const media = {
      createAsset: jest.fn(),
      findByRequest: jest.fn().mockResolvedValue([
        {
          id: 1,
          kind: 'request_before',
          publicUrl: '/uploads/approved.jpg',
          moderationStatus: 'approved',
        },
        {
          id: 2,
          kind: 'request_before',
          publicUrl: '/uploads/pending.jpg',
          moderationStatus: 'pending',
        },
        {
          id: 3,
          kind: 'request_before',
          publicUrl: '/uploads/rejected.jpg',
          moderationStatus: 'rejected',
        },
      ]),
      setRequestMediaModeration: jest.fn(),
    };
    const service = serviceWith({
      repairRequestsRepo,
      usersRepo,
      workerProfilesRepo,
      media,
    });

    const [result] = await service.getForWorkersFeed(201);

    expect(result.beforePhotos.map((photo) => photo.url)).toEqual([
      '/uploads/approved.jpg',
    ]);
  });

  it('hides unapproved client photos from the assigned worker but keeps their own pending after photos', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      categoryKey: 'vik',
      title: 'VIK',
      status: 'worker_selected',
      assignedWorkerUserId: 201,
      archivedAt: null,
      createdAt: new Date('2026-07-19T08:00:00.000Z'),
      updatedAt: new Date('2026-07-19T08:00:00.000Z'),
      client: {},
    };
    const repairRequestsRepo = repo({
      find: jest.fn().mockResolvedValue([request]),
    });
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'private',
      }),
    });
    const media = {
      createAsset: jest.fn(),
      findByRequest: jest.fn().mockResolvedValue([
        {
          id: 1,
          ownerUserId: 101,
          kind: 'request_before',
          publicUrl: '/uploads/approved-before.jpg',
          moderationStatus: 'approved',
        },
        {
          id: 2,
          ownerUserId: 101,
          kind: 'request_before',
          publicUrl: '/uploads/rejected-before.jpg',
          moderationStatus: 'rejected',
        },
        {
          id: 3,
          ownerUserId: 101,
          kind: 'request_before',
          publicUrl: '/uploads/pending-before.jpg',
          moderationStatus: 'pending',
        },
        {
          id: 4,
          ownerUserId: 201,
          kind: 'request_after',
          publicUrl: '/uploads/pending-after.jpg',
          moderationStatus: 'pending',
        },
      ]),
      setRequestMediaModeration: jest.fn(),
    };
    const service = serviceWith({
      repairRequestsRepo,
      usersRepo,
      workerProfilesRepo,
      media,
    });

    const [result] = await service.getForWorkersFeed(201);

    expect(result.beforePhotos.map((photo) => photo.url)).toEqual([
      '/uploads/approved-before.jpg',
    ]);
    expect(result.afterPhotos.map((photo) => photo.url)).toEqual([
      '/uploads/pending-after.jpg',
    ]);
  });

  it('hides client contact details and exact location until the selected worker confirms', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      categoryKey: 'painting',
      title: 'Painting',
      description: 'Paint one room',
      addressText: 'Sofia, 100 Bulgaria Boulevard, entrance A',
      addressVisibility: 'exact_after_assignment',
      latitude: '42.6977000',
      longitude: '23.3219000',
      status: 'published',
      assignedWorkerUserId: null,
      archivedAt: null,
      createdAt: new Date('2026-07-19T08:00:00.000Z'),
      updatedAt: new Date('2026-07-19T08:00:00.000Z'),
      client: {
        name: 'Private Client',
        email: 'private-client@example.com',
      },
    };
    const repairRequestsRepo = repo({
      find: jest.fn().mockResolvedValue([request]),
    });
    const usersRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 201,
        role: 'worker',
        status: 'active',
      }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      }),
    });
    const service = serviceWith({
      repairRequestsRepo,
      usersRepo,
      workerProfilesRepo,
      clientProfilesRepo: repo({
        findOne: jest
          .fn()
          .mockResolvedValue({ userId: 101, phonePrivate: '0888000000' }),
      }),
    });

    const [beforeAssignment] = await service.getForWorkersFeed(201);

    expect(beforeAssignment).toEqual(
      expect.objectContaining({
        clientName: 'Клиент',
        email: null,
        phone: null,
        address: 'Sofia',
        addressText: 'Sofia',
        addressPrecision: 'rough',
        latitude: '42.6977000',
        longitude: '23.3219000',
      }),
    );

    request.assignedWorkerUserId = 201;
    request.status = 'worker_selected';
    const [afterAssignment] = await service.getForWorkersFeed(201);

    expect(afterAssignment).toEqual(
      expect.objectContaining({
        clientName: 'Private Client',
        email: null,
        phone: null,
        address: 'Sofia',
        addressText: 'Sofia',
        addressPrecision: 'rough',
        latitude: '42.6977000',
        longitude: '23.3219000',
      }),
    );

    request.status = 'worker_confirmed';
    const [afterConfirmation] = await service.getForWorkersFeed(201);
    expect(afterConfirmation).toEqual(
      expect.objectContaining({
        clientName: 'Private Client',
        email: null,
        phone: '0888000000',
        address: 'Sofia, 100 Bulgaria Boulevard, entrance A',
        addressPrecision: 'exact',
      }),
    );
  });

  it('stores client request uploads as pending before-media', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      categoryKey: 'painting',
      title: 'Painting',
      status: 'pending_admin',
      assignedWorkerUserId: null,
      archivedAt: null,
      client: {},
    };
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
    });
    const media = {
      createAsset: jest.fn().mockResolvedValue({}),
      findByRequest: jest.fn().mockResolvedValue([]),
      setRequestMediaModeration: jest.fn().mockResolvedValue([]),
    };
    const service = serviceWith({ repairRequestsRepo, media });

    await service.addBeforeMedia(1, 101, [
      {
        url: '/uploads/requests/1/before/photo.jpg',
        storageKey: 'requests/1/before/photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 123,
      },
    ]);

    expect(media.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 101,
        requestId: 1,
        kind: 'request_before',
        moderationStatus: 'pending',
      }),
    );
  });

  it('stores assigned worker uploads as pending after-media', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      categoryKey: 'painting',
      title: 'Painting',
      status: 'in_progress',
      assignedWorkerUserId: 201,
      archivedAt: null,
      client: {},
    };
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
    });
    const media = {
      createAsset: jest.fn().mockResolvedValue({}),
      findByRequest: jest.fn().mockResolvedValue([]),
      setRequestMediaModeration: jest.fn().mockResolvedValue([]),
    };
    const service = serviceWith({ repairRequestsRepo, media });

    await service.addAfterMedia(1, 201, [
      {
        url: '/uploads/requests/1/after/photo.jpg',
        storageKey: 'requests/1/after/photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 456,
      },
    ]);

    expect(media.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 201,
        requestId: 1,
        kind: 'request_after',
        moderationStatus: 'pending',
      }),
    );
  });

  it('rejects applications from suspended workers', async () => {
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'suspended',
        visibilityStatus: 'hidden',
      }),
    });

    const service = serviceWith({ usersRepo, workerProfilesRepo });

    await expect(service.applyToRequest(1, 201)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does not expose completed request contact details to suspended workers', async () => {
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'suspended',
        visibilityStatus: 'hidden',
      }),
    });
    const repairRequestsRepo = repo({
      find: jest.fn(),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
    });

    await expect(service.getCompletedForWorker(201)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repairRequestsRepo.find).not.toHaveBeenCalled();
  });

  it('blocks worker applications before admin approval', async () => {
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
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

    const media = {
      createAsset: jest.fn().mockResolvedValue({}),
      findByRequest: jest.fn().mockResolvedValue([]),
      setRequestMediaModeration: jest.fn(),
    };
    const referrals = {
      processCompletedRequest: jest.fn().mockResolvedValue(null),
    };
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
      media,
      referrals,
    });

    await expect(service.applyToRequest(1, 201)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('keeps repeated worker applications idempotent', async () => {
    const request: any = {
      id: 1,
      status: 'applied',
      assignedWorkerUserId: null,
      client: {},
    };
    const existingApplication: any = {
      id: 11,
      requestId: 1,
      workerUserId: 201,
      status: 'applied',
    };
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'private',
      }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
    });
    const applicationsRepo = repo({
      findOne: jest.fn().mockResolvedValue(existingApplication),
      find: jest.fn().mockResolvedValue([existingApplication]),
    });
    const eventsRepo = repo({
      save: jest.fn().mockResolvedValue({}),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
      applicationsRepo,
      eventsRepo,
    });

    const updated = await service.applyToRequest(1, 201);

    expect(updated.applications).toEqual([
      expect.objectContaining({ workerUserId: 201, status: 'applied' }),
    ]);
    expect(repairRequestsRepo.manager.transaction).not.toHaveBeenCalled();
    expect(eventsRepo.save).not.toHaveBeenCalled();
  });

  it('blocks assignment before admin approval even when an application row exists', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      assignedWorkerUserId: null,
      status: 'pending_admin',
      client: {},
    };
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
    });
    const applicationsRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        requestId: 1,
        workerUserId: 201,
        status: 'applied',
      }),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
      applicationsRepo,
    });

    await expect(service.assignWorker(1, 101, 201)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(request.assignedWorkerUserId).toBeNull();
  });

  it('selects one applicant without rejecting the remaining applications before confirmation', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      assignedWorkerUserId: null,
      status: 'applied',
      completedAt: null,
      client: {},
    };
    const selected: any = {
      id: 11,
      requestId: 1,
      workerUserId: 201,
      status: 'applied',
    };
    const other: any = {
      id: 12,
      requestId: 1,
      workerUserId: 202,
      status: 'shortlisted',
    };
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
      save: jest.fn().mockImplementation(async (value) => value),
    });
    const applicationsRepo = repo({
      findOne: jest.fn().mockResolvedValue(selected),
      find: jest.fn().mockResolvedValue([selected, other]),
      save: jest.fn().mockImplementation(async (value) => value),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
      applicationsRepo,
    });

    const updated = await service.assignWorker(1, 101, 201);

    expect(request.assignedWorkerUserId).toBe(201);
    expect(request.status).toBe('worker_selected');
    expect(selected.status).toBe('assigned');
    expect(other.status).toBe('shortlisted');
    expect(repairRequestsRepo.manager.transaction).toHaveBeenCalledTimes(1);
    expect(updated.applications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workerUserId: 201, status: 'assigned' }),
        expect.objectContaining({ workerUserId: 202, status: 'shortlisted' }),
      ]),
    );
  });

  it('keeps individual photo moderation decisions when admin publishes a request', async () => {
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
      findByRequest: jest.fn().mockResolvedValue([
        { id: 1, kind: 'request_before', moderationStatus: 'approved' },
        { id: 2, kind: 'request_before', moderationStatus: 'rejected' },
      ]),
      setRequestMediaModeration: jest.fn().mockResolvedValue([]),
    };

    const service = serviceWith({ repairRequestsRepo, media });

    const updated = await service.adminSetStatus(1, 'published', 1, 'ok');

    expect(updated.statusKey).toBe('published');
    expect(media.setRequestMediaModeration).not.toHaveBeenCalled();
  });

  it('blocks request publishing until every request photo is moderated', async () => {
    const request = { id: 1, status: 'pending_admin', completedAt: null };
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
      save: jest.fn(async (value) => value),
    });
    const media = {
      createAsset: jest.fn(),
      findByRequest: jest
        .fn()
        .mockResolvedValue([
          { id: 1, kind: 'request_before', moderationStatus: 'pending' },
        ]),
      setRequestMediaModeration: jest.fn(),
    };
    const service = serviceWith({ repairRequestsRepo, media });

    await expect(
      service.adminSetStatus(1, 'published', 1, 'ok'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repairRequestsRepo.save).not.toHaveBeenCalled();
    expect(request.status).toBe('pending_admin');
  });

  it('returns an immutable admin timeline in chronological order', async () => {
    const request = {
      id: 1,
      status: 'published',
      client: { name: 'Client', email: 'client@bricky.dev' },
      createdAt: new Date('2026-07-19T09:00:00.000Z'),
    };
    const events = [
      {
        id: 1,
        requestId: 1,
        eventType: 'request.created',
        createdAt: new Date('2026-07-19T09:00:00.000Z'),
      },
      {
        id: 2,
        requestId: 1,
        eventType: 'admin.status_changed',
        createdAt: new Date('2026-07-19T09:05:00.000Z'),
      },
    ];
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
    });
    const eventsRepo = repo({ find: jest.fn().mockResolvedValue(events) });
    const service = serviceWith({ repairRequestsRepo, eventsRepo });

    const timeline = await service.adminGetTimeline(1);

    expect(eventsRepo.find).toHaveBeenCalledWith({
      where: { requestId: 1 },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    expect(timeline.request.id).toBe(1);
    expect(timeline.events).toEqual(events);
  });

  it('archives active work and waits for a review after client confirmation', async () => {
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

    expect(updated.statusKey).toBe('client_confirmed');
    expect(updated.lifecycleStatusKey).toBe('client_confirmed');
    expect(updated.nextActor).toBe('client');
    expect(updated.allowedActions).toContain('leave_review');
    expect(updated.isArchived).toBe(true);
    expect(request.clientConfirmedAt).toBeInstanceOf(Date);
    expect(request.completedAt).toBeInstanceOf(Date);
    expect(request.archivedAt).toBeInstanceOf(Date);
    expect(request.archiveReason).toBe('completed');
    expect(request.archiveSource).toBe('system');
    expect(request.archivedByUserId).toBe(101);
    expect(repairRequestsRepo.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('keeps final jobs out of the active feed but returns reviewed jobs for worker close', async () => {
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
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
        {
          id: 3,
          status: 'reviewed',
          assignedWorkerUserId: 201,
          archivedAt: new Date(),
          createdAt: new Date(),
          client: {},
        },
      ]),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
    });

    const feed = await service.getForWorkersFeed(201);

    expect(feed.map((request) => request.id)).toEqual([1, 3]);
    expect(feed[1].allowedActions).toContain('close');
  });

  it('lets a worker withdraw an application before being selected', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      assignedWorkerUserId: null,
      status: 'applied',
      archivedAt: null,
      createdAt: new Date(),
      client: {},
    };
    const application: any = {
      requestId: 1,
      workerUserId: 201,
      status: 'applied',
    };
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({
          userId: 201,
          approvalStatus: 'approved',
          visibilityStatus: 'public',
        }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
      save: jest.fn(async (value) => value),
    });
    const applicationsRepo = repo({
      findOne: jest.fn().mockResolvedValue(application),
      find: jest.fn().mockResolvedValue([application]),
      save: jest.fn(async (value) => value),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
      applicationsRepo,
    });

    await service.withdrawApplication(1, 201);

    expect(application.status).toBe('withdrawn');
    expect(request.status).toBe('published');
    expect(repairRequestsRepo.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('lets the selected worker decline before confirmation', async () => {
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({
          userId: 201,
          approvalStatus: 'approved',
          visibilityStatus: 'public',
        }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        clientUserId: 101,
        assignedWorkerUserId: 201,
        status: 'worker_selected',
        archivedAt: null,
        client: {},
      }),
    });
    const application: any = {
      id: 5,
      requestId: 1,
      workerUserId: 201,
      status: 'assigned',
    };
    const applicationsRepo = repo({
      findOne: jest.fn().mockResolvedValue(application),
      find: jest.fn().mockResolvedValue([application]),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
      applicationsRepo,
    });

    const result = await service.withdrawApplication(1, 201);
    expect(application.status).toBe('withdrawn');
    expect(result.assignedWorkerUserId).toBeNull();
    expect(result.statusKey).toBe('published');
  });

  it('blocks worker withdrawal after confirmation', async () => {
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({
          userId: 201,
          approvalStatus: 'approved',
          visibilityStatus: 'public',
        }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        clientUserId: 101,
        assignedWorkerUserId: 201,
        status: 'worker_confirmed',
        archivedAt: null,
        client: {},
      }),
    });
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
    });
    await expect(service.withdrawApplication(1, 201)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks client unassign after the worker started work', async () => {
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        clientUserId: 101,
        assignedWorkerUserId: 201,
        status: 'in_progress',
        client: {},
      }),
    });
    const service = serviceWith({ repairRequestsRepo });

    await expect(service.unassignWorker(1, 101)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lets the client remove a selected worker before confirmation', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      assignedWorkerUserId: 201,
      status: 'worker_selected',
      archivedAt: null,
      client: {},
    };
    const application: any = {
      id: 7,
      requestId: 1,
      workerUserId: 201,
      status: 'assigned',
    };
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
    });
    const applicationsRepo = repo({
      find: jest.fn().mockResolvedValue([application]),
    });
    const service = serviceWith({ repairRequestsRepo, applicationsRepo });

    const result = await service.unassignWorker(1, 101);

    expect(result.statusKey).toBe('applied');
    expect(result.assignedWorkerUserId).toBeNull();
    expect(application.status).toBe('applied');
  });

  it('requires admin intervention to reopen a confirmed request', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      assignedWorkerUserId: 201,
      status: 'worker_confirmed',
      completedAt: null,
      clientConfirmedAt: null,
      archivedAt: null,
      archiveReason: null,
      archiveSource: null,
      archivedByUserId: null,
      client: {},
    };
    const selected: any = {
      id: 7,
      requestId: 1,
      workerUserId: 201,
      status: 'assigned',
    };
    const other: any = {
      id: 8,
      requestId: 1,
      workerUserId: 202,
      status: 'rejected',
    };
    const withdrawn: any = {
      id: 9,
      requestId: 1,
      workerUserId: 203,
      status: 'withdrawn',
    };
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue(request),
    });
    const applicationsRepo = repo({
      find: jest.fn().mockResolvedValue([selected, other, withdrawn]),
    });
    const service = serviceWith({ repairRequestsRepo, applicationsRepo });

    await expect(
      service.adminIntervene(1, 900, 'reopen', ''),
    ).rejects.toBeInstanceOf(BadRequestException);
    const result = await service.adminIntervene(
      1,
      900,
      'reopen',
      'Worker unavailable',
    );

    expect(result.statusKey).toBe('applied');
    expect(result.assignedWorkerUserId).toBeNull();
    expect(selected.status).toBe('withdrawn');
    expect(other.status).toBe('applied');
    expect(withdrawn.status).toBe('withdrawn');
    expect(repairRequestsRepo.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('runs the compatibility worker steps through the canonical lifecycle', async () => {
    const request: any = {
      id: 1,
      clientUserId: 101,
      assignedWorkerUserId: 201,
      status: 'worker_selected',
      completedAt: null,
      clientConfirmedAt: null,
      archivedAt: null,
      archiveReason: null,
      archiveSource: null,
      archivedByUserId: null,
      createdAt: new Date('2026-07-19T08:00:00.000Z'),
      updatedAt: new Date('2026-07-19T08:00:00.000Z'),
      client: {},
    };
    const usersRepo = repo({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockImplementation(async () => request),
      save: jest.fn().mockImplementation(async (value) => value),
    });
    const media = {
      createAsset: jest.fn().mockResolvedValue({}),
      findByRequest: jest.fn().mockResolvedValue([]),
      setRequestMediaModeration: jest.fn(),
    };
    const referrals = {
      processCompletedRequest: jest.fn().mockResolvedValue(null),
    };
    const service = serviceWith({
      usersRepo,
      workerProfilesRepo,
      repairRequestsRepo,
      media,
      referrals,
    });

    await service.workerConfirm(1, 201);
    expect(request.status).toBe('worker_confirmed');

    await service.markWorkerOnSite(1, 201);
    expect(request.status).toBe('worker_on_site');

    await service.markInspected(1, 201);
    expect(request.status).toBe('inspected');

    await service.startWork(1, 201);
    expect(request.status).toBe('in_progress');

    await service.finishWork(1, 201, [{ url: '/uploads/after.jpg' }]);
    expect(request.status).toBe('work_finished');
    expect(media.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'request_after',
        moderationStatus: 'pending',
      }),
    );

    await service.readyForClientConfirmation(1, 201);
    expect(request.status).toBe('ready_for_client_confirmation');

    const completed = await service.clientConfirmWork(1, 101);
    expect(request.status).toBe('client_confirmed');
    expect(completed.lifecycleStatusKey).toBe('client_confirmed');
    expect(completed.allowedActions).toContain('leave_review');
    expect(request.completedAt).toBeInstanceOf(Date);
    expect(request.archivedAt).toBeInstanceOf(Date);

    request.status = 'reviewed';
    const closed = await service.completeRequest(1, 201);
    expect(request.status).toBe('completed');
    expect(request.archiveReason).toBe('closed_by_worker');
    expect(request.archiveSource).toBe('worker');
    expect(request.archivedByUserId).toBe(201);
    expect(closed.lifecycleStatusKey).toBe('completed');
    expect(referrals.processCompletedRequest).toHaveBeenCalledTimes(1);
    expect(referrals.processCompletedRequest).toHaveBeenCalledWith(1);
  });
});

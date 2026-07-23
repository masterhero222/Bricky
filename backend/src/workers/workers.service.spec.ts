import { WorkersService } from './workers.service';

function repo(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function serviceWith(overrides: Record<string, any> = {}) {
  return new WorkersService(
    (overrides.workerRepository || repo()) as any,
    (overrides.galleryRepo || repo()) as any,
    (overrides.workerProfilesRepo || repo()) as any,
    (overrides.workerSkillsRepo || repo()) as any,
    (overrides.repairRequestsRepo || repo()) as any,
    (overrides.referralRewardsRepo || repo()) as any,
    (overrides.media || {
      findByWorker: jest.fn().mockResolvedValue([]),
      findByRequest: jest.fn().mockResolvedValue([]),
      createAsset: jest.fn(),
      deleteAsset: jest.fn(),
    }) as any,
    (overrides.users || {
      findOne: jest.fn().mockResolvedValue({ id: 201, status: 'active' }),
      findByIds: jest.fn(async (ids: number[]) =>
        ids.map((id) => ({ id, status: 'active' })),
      ),
    }) as any,
  );
}

describe('WorkersService media moderation', () => {
  it('stores newly uploaded worker gallery images as pending moderation', async () => {
    const media = {
      createAsset: jest.fn().mockResolvedValue({}),
      findByWorker: jest.fn().mockResolvedValue([
        {
          id: 10,
          workerUserId: 201,
          ownerUserId: 201,
          kind: 'worker_gallery',
          publicUrl: '/uploads/workers/201/gallery/new.jpg',
          storageKey: '/uploads/workers/201/gallery/new.jpg',
          moderationStatus: 'pending',
          createdAt: new Date('2026-07-18T10:00:00Z'),
        },
      ]),
      deleteAsset: jest.fn(),
    };
    const service = serviceWith({ media, galleryRepo: repo({ find: jest.fn().mockResolvedValue([]) }) });

    const result = await service.addGalleryImages(201, ['/uploads/workers/201/gallery/new.jpg']);

    expect(media.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 201,
        workerUserId: 201,
        kind: 'worker_gallery',
        moderationStatus: 'pending',
      }),
    );
    expect(result).toEqual([expect.objectContaining({ moderationStatus: 'pending' })]);
  });

  it('hides pending and rejected worker gallery media from public gallery responses', async () => {
    const media = {
      createAsset: jest.fn(),
      findByWorker: jest.fn().mockResolvedValue([
        {
          id: 1,
          kind: 'worker_gallery',
          publicUrl: '/uploads/workers/201/gallery/approved.jpg',
          storageKey: '/uploads/workers/201/gallery/approved.jpg',
          moderationStatus: 'approved',
          createdAt: new Date('2026-07-18T10:00:00Z'),
        },
        {
          id: 2,
          kind: 'worker_gallery',
          publicUrl: '/uploads/workers/201/gallery/pending.jpg',
          storageKey: '/uploads/workers/201/gallery/pending.jpg',
          moderationStatus: 'pending',
          createdAt: new Date('2026-07-18T10:01:00Z'),
        },
        {
          id: 3,
          kind: 'worker_gallery',
          publicUrl: '/uploads/workers/201/gallery/rejected.jpg',
          storageKey: '/uploads/workers/201/gallery/rejected.jpg',
          moderationStatus: 'rejected',
          createdAt: new Date('2026-07-18T10:02:00Z'),
        },
      ]),
      deleteAsset: jest.fn(),
    };
    const service = serviceWith({ media, galleryRepo: repo({ find: jest.fn().mockResolvedValue([]) }) });

    const publicGallery = await service.getGalleryByUserId(201);
    const ownGallery = await service.getGalleryByUserId(201, { includeUnapprovedMedia: true });

    expect(publicGallery.map((photo) => photo.id)).toEqual([1]);
    expect(ownGallery.map((photo) => photo.id)).toEqual([1, 2, 3]);
  });

  it('uses only approved avatar media for worker profile summaries', async () => {
    const media = {
      createAsset: jest.fn(),
      findByWorker: jest.fn().mockResolvedValue([
        {
          id: 11,
          kind: 'worker_avatar',
          publicUrl: '/uploads/users/201/avatar/pending.jpg',
          storageKey: '/uploads/users/201/avatar/pending.jpg',
          moderationStatus: 'pending',
          createdAt: new Date('2026-07-18T10:02:00Z'),
        },
        {
          id: 10,
          kind: 'worker_avatar',
          publicUrl: '/uploads/users/201/avatar/approved.jpg',
          storageKey: '/uploads/users/201/avatar/approved.jpg',
          moderationStatus: 'approved',
          createdAt: new Date('2026-07-18T10:00:00Z'),
        },
      ]),
      deleteAsset: jest.fn(),
    };
    const service = serviceWith({
      media,
      galleryRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      workerProfilesRepo: repo({
        findOne: jest.fn().mockResolvedValue({
          userId: 201,
          publicName: 'Елена Георгиева',
          approvalStatus: 'approved',
          visibilityStatus: 'public',
          createdAt: new Date('2026-07-18T09:00:00Z'),
        }),
      }),
      workerSkillsRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      requestRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      referralRewardsRepo: repo({ findOne: jest.fn().mockResolvedValue(null) }),
    });

    const worker = await service.findByUserId(201);

    expect(worker.avatarUrl).toBe('/uploads/users/201/avatar/approved.jpg');
  });

  it('keeps the previous approved avatar on legacy worker summaries while a new avatar is pending', async () => {
    const media = {
      createAsset: jest.fn(),
      findByWorker: jest.fn().mockResolvedValue([
        {
          id: 11,
          kind: 'worker_avatar',
          publicUrl: '/uploads/users/201/avatar/new-pending.jpg',
          storageKey: '/uploads/users/201/avatar/new-pending.jpg',
          moderationStatus: 'pending',
          createdAt: new Date('2026-07-18T10:02:00Z'),
        },
        {
          id: 10,
          kind: 'worker_avatar',
          publicUrl: '/uploads/users/201/avatar/old-approved.jpg',
          storageKey: '/uploads/users/201/avatar/old-approved.jpg',
          moderationStatus: 'approved',
          createdAt: new Date('2026-07-18T10:00:00Z'),
        },
      ]),
      deleteAsset: jest.fn(),
    };
    const service = serviceWith({
      media,
      galleryRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      workerProfilesRepo: repo({ findOne: jest.fn().mockResolvedValue(null) }),
      workerRepository: repo({
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          userId: 201,
          fullName: 'Legacy Worker',
          email: 'private@example.test',
          phone: '0888000000',
          password: 'private-password-hash',
          avatarUrl: '/uploads/users/201/avatar/very-old.jpg',
        }),
      }),
      requestRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
    });

    const worker = await service.findByUserId(201);

    expect(worker.avatarUrl).toBe('/uploads/users/201/avatar/old-approved.jpg');
    expect(worker).not.toHaveProperty('email');
    expect(worker).not.toHaveProperty('phone');
    expect(worker).not.toHaveProperty('password');
  });

  it('saves an allowed worker banner immediately', async () => {
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 202,
        publicName: 'Electrical Worker',
        profileBannerKey: 'blueprint_general_v1',
      }),
      update: jest.fn(),
    });
    const workerSkillsRepo = repo({
      find: jest.fn().mockResolvedValue([{ workerUserId: 202, categoryKey: 'electro', activityKey: null }]),
    });
    const service = serviceWith({ workerProfilesRepo, workerSkillsRepo });

    const result = await service.updateAppearanceByUserId(202, {
      profileBannerKey: 'blueprint_electrical_v1',
    });

    expect(result).toEqual({ profileBannerKey: 'blueprint_electrical_v1' });
    expect(workerProfilesRepo.update).toHaveBeenCalledWith(
      { userId: 202 },
      { profileBannerKey: 'blueprint_electrical_v1' },
    );
  });

  it('allows any trusted Bricky banner regardless of worker categories', async () => {
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 202,
        publicName: 'Electrical Worker',
        profileBannerKey: 'blueprint_general_v1',
      }),
      update: jest.fn(),
    });
    const service = serviceWith({
      workerProfilesRepo,
      workerSkillsRepo: repo({
        find: jest.fn().mockResolvedValue([{ workerUserId: 202, categoryKey: 'electro', activityKey: null }]),
      }),
    });

    const result = await service.updateAppearanceByUserId(202, {
      profileBannerKey: 'blueprint_plumbing_v1',
    });

    expect(result).toEqual({ profileBannerKey: 'blueprint_plumbing_v1' });
    expect(workerProfilesRepo.update).toHaveBeenCalledWith(
      { userId: 202 },
      { profileBannerKey: 'blueprint_plumbing_v1' },
    );
  });

  it('falls back to the universal banner for unknown stored values', async () => {
    const service = serviceWith({
      media: { createAsset: jest.fn(), findByWorker: jest.fn().mockResolvedValue([]), deleteAsset: jest.fn() },
      galleryRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      workerProfilesRepo: repo({
        findOne: jest.fn().mockResolvedValue({
          userId: 203,
          publicName: 'Worker',
          profileBannerKey: 'https://bad.example/banner.jpg',
          approvalStatus: 'approved',
          visibilityStatus: 'public',
          createdAt: new Date('2026-07-18T09:00:00Z'),
        }),
      }),
      workerSkillsRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      requestRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      referralRewardsRepo: repo({ findOne: jest.fn().mockResolvedValue(null) }),
    });

    const worker = await service.findByUserId(203);

    expect(worker.profileBannerKey).toBe('blueprint_general_v1');
  });

  it('builds public completed-project history from v2 requests and approved media only', async () => {
    const repairRequestsRepo = repo({
      find: jest.fn().mockResolvedValue([
        {
          id: 91,
          assignedWorkerUserId: 201,
          categoryKey: 'painting',
          addressText: 'Sofia, private address',
          addressVisibility: 'exact_after_assignment',
          description: 'Painting',
          status: 'completed',
          completedAt: new Date('2026-07-19T12:00:00Z'),
          archivedAt: new Date('2026-07-19T12:05:00Z'),
          createdAt: new Date('2026-07-17T12:00:00Z'),
        },
      ]),
    });
    const media = {
      findByWorker: jest.fn().mockResolvedValue([]),
      findByRequest: jest.fn().mockResolvedValue([
        {
          id: 1,
          kind: 'request_before',
          publicUrl: '/uploads/requests/91/before/approved.jpg',
          storageKey: 'requests/91/before/approved.jpg',
          moderationStatus: 'approved',
          createdAt: new Date('2026-07-17T12:00:00Z'),
        },
        {
          id: 2,
          kind: 'request_after',
          publicUrl: '/uploads/requests/91/after/pending.jpg',
          storageKey: 'requests/91/after/pending.jpg',
          moderationStatus: 'pending',
          createdAt: new Date('2026-07-19T11:00:00Z'),
        },
        {
          id: 3,
          kind: 'request_after',
          publicUrl: '/uploads/requests/91/after/approved.jpg',
          storageKey: 'requests/91/after/approved.jpg',
          moderationStatus: 'approved',
          createdAt: new Date('2026-07-19T11:05:00Z'),
        },
      ]),
      createAsset: jest.fn(),
      deleteAsset: jest.fn(),
    };
    const service = serviceWith({ repairRequestsRepo, media });

    const result = await service.getHistoryByUserId(201);

    expect(repairRequestsRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedWorkerUserId: 201,
          status: 'completed',
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        requestId: 91,
        categoryKey: 'painting',
        address: null,
        beforePhotos: [expect.objectContaining({ id: 1 })],
        afterPhotos: [expect.objectContaining({ id: 3 })],
      }),
    ]);
  });
});

describe('WorkersService v2 independence from legacy tables', () => {
  const missingTableError = Object.assign(new Error("Table 'worker' doesn't exist"), {
    code: 'ER_NO_SUCH_TABLE',
    errno: 1146,
  });

  it('returns v2 workers when the legacy worker table is absent', async () => {
    const workerRepository = repo({
      find: jest.fn().mockRejectedValue(missingTableError),
    });
    const workerProfilesRepo = repo({
      find: jest.fn().mockResolvedValue([
        {
          userId: 301,
          publicName: 'V2 Worker',
          city: 'Sofia',
          bio: 'Professional worker',
          experience: '8 years',
          equipment: 'Own equipment',
          approvalStatus: 'approved',
          visibilityStatus: 'public',
          profileBannerKey: 'blueprint_general_v1',
          createdAt: new Date('2026-07-20T08:00:00Z'),
        },
      ]),
    });
    const service = serviceWith({
      workerRepository,
      workerProfilesRepo,
      galleryRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      workerSkillsRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      repairRequestsRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
      referralRewardsRepo: repo({ findOne: jest.fn().mockResolvedValue(null) }),
    });

    const workers = await service.getAll();

    expect(workers).toEqual([
      expect.objectContaining({
        userId: 301,
        workerUserId: 301,
        fullName: 'V2 Worker',
      }),
    ]);
    expect(workers[0]).not.toHaveProperty('email');
    expect(workers[0]).not.toHaveProperty('phone');
    expect(workers[0]).not.toHaveProperty('password');
    expect(workerRepository.find).toHaveBeenCalledTimes(1);
  });

  it('returns v2 gallery media when the legacy gallery table is absent', async () => {
    const galleryRepo = repo({
      find: jest.fn().mockRejectedValue({
        driverError: { code: 'ER_NO_SUCH_TABLE', errno: 1146 },
      }),
    });
    const media = {
      createAsset: jest.fn(),
      findByWorker: jest.fn().mockResolvedValue([
        {
          id: 41,
          kind: 'worker_gallery',
          publicUrl: '/uploads/workers/301/gallery/approved.jpg',
          storageKey: 'workers/301/gallery/approved.jpg',
          moderationStatus: 'approved',
          createdAt: new Date('2026-07-20T08:00:00Z'),
        },
      ]),
      findByRequest: jest.fn().mockResolvedValue([]),
      deleteAsset: jest.fn(),
    };
    const service = serviceWith({ galleryRepo, media });

    const gallery = await service.getGalleryByUserId(301);

    expect(gallery).toEqual([
      expect.objectContaining({
        id: 41,
        moderationStatus: 'approved',
      }),
    ]);
  });

  it('does not hide non-legacy database failures', async () => {
    const connectionError = Object.assign(new Error('Database connection lost'), {
      code: 'PROTOCOL_CONNECTION_LOST',
    });
    const service = serviceWith({
      workerRepository: repo({
        find: jest.fn().mockRejectedValue(connectionError),
      }),
      workerProfilesRepo: repo({ find: jest.fn().mockResolvedValue([]) }),
    });

    await expect(service.getAll()).rejects.toBe(connectionError);
  });
});

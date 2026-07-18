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
    (overrides.requestRepo || repo()) as any,
    (overrides.referralRewardsRepo || repo()) as any,
    (overrides.media || { findByWorker: jest.fn().mockResolvedValue([]), createAsset: jest.fn(), deleteAsset: jest.fn() }) as any,
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
});

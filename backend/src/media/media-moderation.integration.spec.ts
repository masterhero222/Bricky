import { Not } from 'typeorm';
import { AdminService } from '../admin/admin.service';
import { WorkersService } from '../workers/workers.service';
import { WorkerProfileCompletionService } from '../workers/worker-profile-completion.service';
import { MediaService } from './media.service';

function matchesValue(actual: any, expected: any): boolean {
  if (expected?._type === 'not') {
    return !matchesValue(actual, expected._value);
  }
  return actual === expected;
}

function matches(row: any, criteria: Record<string, any>) {
  return Object.entries(criteria).every(([key, value]) =>
    matchesValue(row[key], value),
  );
}

function emptyRepo(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((value) => ({ ...value })),
    save: jest.fn(async (value) => value),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('Worker media moderation integration', () => {
  it('keeps approved public media until admin approves its replacement', async () => {
    const rows: any[] = [
      {
        id: 1,
        ownerUserId: 201,
        workerUserId: 201,
        requestId: null,
        kind: 'worker_avatar',
        publicUrl: '/uploads/users/201/avatar/old.jpg',
        storageKey: '/uploads/users/201/avatar/old.jpg',
        moderationStatus: 'approved',
        createdAt: new Date('2026-07-19T08:00:00.000Z'),
      },
    ];
    const mediaRepo = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => {
        value.id = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
        value.createdAt = new Date(
          `2026-07-19T08:0${value.id}:00.000Z`,
        );
        rows.push(value);
        return value;
      }),
      find: jest.fn(async ({ where, order }: any) => {
        const result = rows.filter((row) => matches(row, where));
        if (order?.createdAt === 'DESC') {
          result.sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          );
        }
        return result;
      }),
      findOne: jest.fn(async ({ where }: any) =>
        rows.find((row) => matches(row, where)) || null,
      ),
      update: jest.fn(async (criteria, patch) => {
        const selected = rows.filter((row) => matches(row, criteria));
        selected.forEach((row) => Object.assign(row, patch));
        return { affected: selected.length };
      }),
      delete: jest.fn(),
    };
    const media = new MediaService(mediaRepo as any);
    const profile = {
      userId: 201,
      publicName: 'Test Worker',
      city: 'Sofia',
      bio: 'Professional repairs',
      experience: '5 years',
      equipment: 'Own tools',
      approvalStatus: 'approved',
      visibilityStatus: 'public',
      profileBannerKey: 'blueprint_general_v1',
      createdAt: new Date('2026-07-19T07:00:00.000Z'),
    };
    const workers = new WorkersService(
      emptyRepo() as any,
      emptyRepo() as any,
      emptyRepo({ findOne: jest.fn().mockResolvedValue(profile) }) as any,
      emptyRepo() as any,
      emptyRepo() as any,
      emptyRepo() as any,
      media,
      {
        findOne: jest.fn().mockResolvedValue({ id: 201, status: 'active' }),
        findByIds: jest.fn().mockResolvedValue([{ id: 201, status: 'active' }]),
      } as any,
      new WorkerProfileCompletionService(),
    );
    const auditRepo = emptyRepo();
    const referrals = {
      processCompletedRequest: jest.fn().mockResolvedValue(null),
    };
    const admin = new AdminService(
      auditRepo as any,
      {} as any,
      workers,
      {} as any,
      media,
      {} as any,
      referrals as any,
      {} as any,
    );

    await workers.setAvatar(201, '/uploads/users/201/avatar/rejected.jpg');
    const rejectedCandidate = rows.find(
      (row) => row.publicUrl.endsWith('/rejected.jpg'),
    );
    expect((await workers.findByUserId(201)).avatarUrl).toBe(
      '/uploads/users/201/avatar/old.jpg',
    );

    await admin.setMediaModeration(
      900,
      rejectedCandidate.id,
      'rejected',
      'not suitable',
    );
    expect((await workers.findByUserId(201)).avatarUrl).toBe(
      '/uploads/users/201/avatar/old.jpg',
    );

    await workers.setAvatar(201, '/uploads/users/201/avatar/new.jpg');
    const approvedCandidate = rows.find(
      (row) => row.publicUrl.endsWith('/new.jpg'),
    );
    expect((await workers.findByUserId(201)).avatarUrl).toBe(
      '/uploads/users/201/avatar/old.jpg',
    );

    await admin.setMediaModeration(
      900,
      approvedCandidate.id,
      'approved',
      'verified',
    );
    expect((await workers.findByUserId(201)).avatarUrl).toBe(
      '/uploads/users/201/avatar/new.jpg',
    );
    expect(rows.find((row) => row.id === 1).moderationStatus).toBe('rejected');

    await workers.addGalleryImages(201, [
      '/uploads/workers/201/gallery/work.jpg',
    ]);
    const galleryCandidate = rows.find(
      (row) => row.kind === 'worker_gallery',
    );
    expect(await workers.getGalleryByUserId(201)).toEqual([]);
    expect(
      await workers.getGalleryByUserId(201, {
        includeUnapprovedMedia: true,
      }),
    ).toEqual([
      expect.objectContaining({
        id: galleryCandidate.id,
        moderationStatus: 'pending',
      }),
    ]);

    await admin.setMediaModeration(
      900,
      galleryCandidate.id,
      'approved',
      'real work',
    );
    expect(await workers.getGalleryByUserId(201)).toEqual([
      expect.objectContaining({
        id: galleryCandidate.id,
        moderationStatus: 'approved',
      }),
    ]);

    expect(mediaRepo.update).toHaveBeenCalledWith(
      {
        id: Not(approvedCandidate.id),
        workerUserId: 201,
        kind: 'worker_avatar',
        moderationStatus: 'approved',
      },
      { moderationStatus: 'rejected' },
    );
  });
});
